import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

export interface SelectedContact {
    name: string;
    phone: string;
}

export const pickContact = async (): Promise<SelectedContact | null> => {
    if (Capacitor.isNativePlatform()) {
        try {
            // @capacitor-community/contacts v7 uses checkPermissions / requestPermissions
            const permissions = await Contacts.checkPermissions();
            if (permissions.contacts !== 'granted') {
                const request = await Contacts.requestPermissions();
                if (request.contacts !== 'granted') {
                    return null;
                }
            }

            const result = await Contacts.pickContact({
                projection: {
                    name: true,
                    phones: true,
                }
            });

            if (result && result.contact) {
                const name = result.contact.name?.display || result.contact.name?.given || 'Unknown';
                const phone = result.contact.phones?.[0]?.number || '';
                // Clean phone number (remove spaces, dashes etc)
                const cleanPhone = phone.replace(/[^0-9+]/g, '');
                return { name, phone: cleanPhone };
            }
            return null;
        } catch (error) {
            console.error('Error picking contact on native:', error);
            return null;
        }
    } else {
        // Web Contact Picker API
        if ('contacts' in navigator && 'ContactsManager' in window) {
            try {
                const props = ['name', 'tel'];
                const contacts = await (navigator as any).contacts.select(props, { multiple: false });
                if (contacts && contacts.length > 0) {
                    const contact = contacts[0];
                    const name = contact.name?.[0] || 'Unknown';
                    const phone = contact.tel?.[0] || '';
                    const cleanPhone = phone.replace(/[^0-9+]/g, '');
                    return { name, phone: cleanPhone };
                }
            } catch (error) {
                console.error('Error picking contact on web:', error);
            }
        } else {
            console.warn('Contact Picker API not supported on this browser');
        }
        return null;
    }
};
