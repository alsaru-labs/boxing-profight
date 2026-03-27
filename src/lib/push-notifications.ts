// f:\Proyectos\boxing_profight\src\lib\push-notifications.ts
import { databases, DATABASE_ID, COLLECTION_PROFILES } from "./appwrite";

// Replace with your real VAPID public key from your push service or Firebase
const VAPID_PUBLIC_KEY = "BDhiTpGxkbPcWwD0tSkbJ5y_AUcE8lVWv9p1Jr1-m0TtAWBVQn4StkrJneU3xlDEjCucV1gT5Fj2ypqShlvN_Y4";

export async function registerPushNotifications(userId: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
        });

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;

        let subscription = await registration.pushManager.getSubscription();

        // If no subscription, create one
        if (!subscription) {
            if (VAPID_PUBLIC_KEY.includes("PLACEHOLDER")) {
                console.error("VAPID KEY is placeholder, skipping subscription");
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
