import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';

export interface SelectedContact {
    name: string;
    phone: string;
    picture?: string; // Base64 data url
}

// Convert Blob to Base64/DataURL for Web Contact Picker
const blobToDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const pickContact = async (): Promise<SelectedContact | null> => {
    if (Capacitor.isNativePlatform()) {
        try {
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
                    image: true, // Fetch native contact image
                }
            });

            if (result && result.contact) {
                const name = result.contact.name?.display || result.contact.name?.given || 'Unknown';
                const phone = result.contact.phones?.[0]?.number || '';
                const cleanPhone = phone.replace(/[^0-9+]/g, '');

                // Native image source is returned inside result.contact.image (base64 string or URI)
                let picture: string | undefined = undefined;
                if (result.contact.image && result.contact.image.base64String) {
                    picture = `data:image/jpeg;base64,${result.contact.image.base64String}`;
                } else if (result.contact.image && typeof result.contact.image === 'string') {
                    picture = result.contact.image;
                }

                return { name, phone: cleanPhone, picture };
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
                const props = ['name', 'tel', 'icon'];
                const contacts = await (navigator as any).contacts.select(props, { multiple: false });
                if (contacts && contacts.length > 0) {
                    const contact = contacts[0];
                    const name = contact.name?.[0] || 'Unknown';
                    const phone = contact.tel?.[0] || '';
                    const cleanPhone = phone.replace(/[^0-9+]/g, '');

                    let picture: string | undefined = undefined;
                    // Check if icon / web photo is returned (it returns list of blobs)
                    if (contact.icon && contact.icon.length > 0) {
                        try {
                            picture = await blobToDataURL(contact.icon[0]);
                        } catch (e) {
                            console.error("Failed to parse web contact icon", e);
                        }
                    }

                    return { name, phone: cleanPhone, picture };
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
