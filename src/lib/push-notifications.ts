// src/lib/push-notifications.ts
import { savePushSubscriptionAction, clearPushSubscriptionAction } from "@/app/perfil/push-actions";

// VAPID public key — must match the key used by the Appwrite function to sign pushes
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export async function registerPushNotifications(userId: string) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return null;
    }

    if (!userId) return null;

    try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const registration = await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return null;

        // Siempre forzar suscripción nueva para evitar claves VAPID desincronizadas
        const existing = await registration.pushManager.getSubscription();
        if (existing) await existing.unsubscribe();

        if (!VAPID_PUBLIC_KEY) {
            console.error('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY no está configurada.');
            return null;
        }

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        const result = await savePushSubscriptionAction(userId, JSON.stringify(subscription));
        if (!result.success) {
            console.error('[Push] Error guardando suscripción:', result.error);
            return null;
        }

        return subscription;
    } catch (error) {
        console.error('[Push] Error en registerPushNotifications:', error);
        return null;
    }
}

export async function unregisterPushNotifications(userId: string) {
    try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        let endpoint: string | undefined;

        if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                endpoint = subscription.endpoint;
                await subscription.unsubscribe();
            }
        }

        if (userId && endpoint) {
            await clearPushSubscriptionAction(userId, endpoint);
        }
    } catch (error) {
        console.error('[Push] Error en unregisterPushNotifications:', error);
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
