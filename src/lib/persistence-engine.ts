import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'shopbook_offline_db';

class PersistenceEngine {
    private sqlite: SQLiteConnection | null = null;
    private db: SQLiteDBConnection | null = null;
    private isInitialized = false;
    private isInitializing = false;

    async init() {
        if (this.isInitialized) return;

        if (this.isInitializing) {
            console.log('PersistenceEngine: Waiting for initialization to complete...');
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        if (!Capacitor.isNativePlatform()) {
            this.isInitialized = true;
            return;
        }

        this.isInitializing = true;
        console.log('PersistenceEngine: GLOBAL SQLite INIT START');

        try {
            this.sqlite = new SQLiteConnection(CapacitorSQLite);

            await this.sqlite.checkConnectionsConsistency();
            const hasConnection = (await this.sqlite.isConnection(DB_NAME, false)).result;

            if (hasConnection) {
                this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
            } else {
                this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
            }

            if (this.db) {
                await this.db.open();
                console.log('PersistenceEngine: SQLite Connection opened successfully.');

                await this.db.execute(`
                    CREATE TABLE IF NOT EXISTS local_store (
                       key TEXT PRIMARY KEY,
                       value TEXT,
                       synced INTEGER DEFAULT 1,
                       updated_at INTEGER
                    );
                `);
            }

            this.isInitialized = true;
            this.isInitializing = false;
            console.log('PersistenceEngine: SQLite Database and Tables ready.');
        } catch (err) {
            this.isInitializing = false;
            console.error('PersistenceEngine: SQLite Initialization FAILED:', err);
        }
    }

    async save(key: string, data: any, markUnsynced = true) {
        const value = JSON.stringify(data);
        const timestamp = Date.now();
        const synced = markUnsynced ? 0 : 1;

        if (Capacitor.isNativePlatform() && this.db) {
            await this.db.run(
                `INSERT OR REPLACE INTO local_store (key, value, synced, updated_at) VALUES (?, ?, ?, ?)`,
                [key, value, synced, timestamp]
            );
        } else {
            // Fallback for Web/Dev
            localStorage.setItem(`offline_${key}`, value);
            localStorage.setItem(`offline_${key}_synced`, synced.toString());
        }
    }

    async load(key: string): Promise<any | null> {
        if (Capacitor.isNativePlatform() && this.db) {
            const res = await this.db.query(`SELECT value FROM local_store WHERE key = ?`, [key]);
            if (res.values && res.values.length > 0) {
                return JSON.parse(res.values[0].value);
            }
        } else {
            const local = localStorage.getItem(`offline_${key}`);
            return local ? JSON.parse(local) : null;
        }
        return null;
    }

    async getUnsyncedKeys(): Promise<string[]> {
        if (Capacitor.isNativePlatform() && this.db) {
            const res = await this.db.query(`SELECT key FROM local_store WHERE synced = 0`);
            return res.values?.map(v => v.key) || [];
        } else {
            // Basic fallback for web sync tracking
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k?.startsWith('offline_') && !k.endsWith('_synced')) {
                    const synced = localStorage.getItem(`${k}_synced`);
                    if (synced === '0') keys.push(k.replace('offline_', ''));
                }
            }
            return keys;
        }
    }

    async setSynced(key: string) {
        if (Capacitor.isNativePlatform() && this.db) {
            await this.db.run(`UPDATE local_store SET synced = 1 WHERE key = ?`, [key]);
        } else {
            localStorage.setItem(`offline_${key}_synced`, '1');
        }
    }

    async purgeUnsyncedKeys() {
        try {
            if (Capacitor.isNativePlatform() && this.db) {
                await this.db.run(`DELETE FROM local_store WHERE synced = 0`);
            } else if (typeof window !== 'undefined') {
                const keysToPurge: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k?.startsWith('offline_') && !k.endsWith('_synced')) {
                        const synced = localStorage.getItem(`${k}_synced`);
                        if (synced === '0') keysToPurge.push(k);
                    }
                }
                keysToPurge.forEach(k => {
                    localStorage.removeItem(k);
                    localStorage.removeItem(`${k}_synced`);
                });
            }
        } catch (e) {
            console.error('Failed to purge unsynced keys:', e);
        }
    }
}

export const persistence = new PersistenceEngine();
