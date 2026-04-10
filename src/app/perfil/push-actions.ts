'use server';

import { createAdminClient } from "@/lib/server/appwrite";
import { DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";

/**
 * Guarda la push subscription del usuario en su perfil de Appwrite.
 * Soporta múltiples dispositivos gestionando un array de suscripciones.
 */
export async function savePushSubscriptionAction(userId: string, subscriptionJson: string) {
    if (!userId || !subscriptionJson) {
        return { success: false, error: "Faltan datos: userId o subscription" };
    }

    try {
        const { databases } = await createAdminClient();
        const newSub = JSON.parse(subscriptionJson);

        // 1. Obtener el perfil actual para ver las suscripciones existentes
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, userId);
        let subscriptions: any[] = [];

        if (profile.push_subscription) {
            try {
                const parsed = JSON.parse(profile.push_subscription);
                subscriptions = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                // Si falla el parseo, asumimos que no hay nada válido o era basura
                subscriptions = [];
            }
        }

        // 2. Añadir la nueva si el endpoint no existe ya
        const exists = subscriptions.some(s => s.endpoint === newSub.endpoint);
        if (!exists) {
            subscriptions.push(newSub);
        } else {
            // Si ya existe, actualizamos la entrada (por si han cambiado las keys)
            subscriptions = subscriptions.map(s => s.endpoint === newSub.endpoint ? newSub : s);
        }

        // 3. Limitar a los 5 dispositivos más recientes (Zero-Waste)
        if (subscriptions.length > 5) {
            subscriptions = subscriptions.slice(-5);
        }

        // 4. Guardar de nuevo en el perfil
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_PROFILES,
            userId,
            { push_subscription: JSON.stringify(subscriptions) }
        );

        return { success: true };
    } catch (error: any) {
        console.error("[savePushSubscriptionAction] Error guardando push_subscription:", error?.message);
        return { success: false, error: error?.message };
    }
}

/**
 * Elimina una push subscription específica del perfil (por endpoint) 
 * o todas si no se especifica endpoint.
 */
export async function clearPushSubscriptionAction(userId: string, endpoint?: string) {
    if (!userId) {
        return { success: false, error: "Falta userId" };
    }

    try {
        const { databases } = await createAdminClient();

        if (!endpoint) {
            // Comportamiento antiguo: Limpiar todo
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_PROFILES,
                userId,
                { push_subscription: null }
            );
        } else {
            // Comportamiento nuevo: Limpiar solo este endpoint
            const profile = await databases.getDocument(DATABASE_ID, COLLECTION_PROFILES, userId);
            if (profile.push_subscription) {
                const parsed = JSON.parse(profile.push_subscription);
                let subscriptions = Array.isArray(parsed) ? parsed : [parsed];
                
                subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
                
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_PROFILES,
                    userId,
                    { push_subscription: subscriptions.length > 0 ? JSON.stringify(subscriptions) : null }
                );
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("[clearPushSubscriptionAction] Error eliminando push_subscription:", error?.message);
        return { success: false, error: error?.message };
    }
}
