// f:\Proyectos\boxing_profight\src\lib\push-notifications.ts
import { databases, DATABASE_ID, COLLECTION_PROFILES } from "./appwrite";

// VAPID public key — must match the key used by the Appwrite function to sign pushes
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export async function registerPushNotifications(userId: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push not supported');
        return null;
    }

    try {
        // Ensure the SW is registered and ready
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        // Wait for the SW to be active before trying to subscribe
        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;

        // Get existing subscription or create a new one
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            if (!VAPID_PUBLIC_KEY) {
                console.error("NEXT_PUBLIC_VAPID_PUBLIC_KEY no está configurada. No se puede suscribir a push.");
                return null;
            }
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        // Save to user profile in Appwrite
        if (subscription && userId) {
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_PROFILES,
                userId,
                {
                    push_subscription: JSON.stringify(subscription)
                }
            );
        }

        return subscription;
    } catch (error) {
        console.error('Error registering push:', error);
        return null;
    }
}

export async function unregisterPushNotifications(userId: string) {
    try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
        }

        // Clear the subscription from the user's profile
        if (userId) {
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_PROFILES,
                userId,
                { push_subscription: null }
            );
        }
    } catch (error) {
        console.error('Error unregistering push:', error);
    }
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
