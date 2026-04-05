'use server';

import { createAdminClient } from "@/lib/server/appwrite";
import { DATABASE_ID, COLLECTION_PROFILES } from "@/lib/appwrite";

/**
 * Guarda la push subscription del usuario en su perfil de Appwrite.
 * Usa el Admin client para evitar dependencias de sesión en Server Actions.
 */
export async function savePushSubscriptionAction(userId: string, subscriptionJson: string) {
    if (!userId || !subscriptionJson) {
        return { success: false, error: "Faltan datos: userId o subscription" };
    }

    try {
        const { databases } = await createAdminClient();

        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_PROFILES,
            userId,
            { push_subscription: subscriptionJson }
        );

        return { success: true };
    } catch (error: any) {
        console.error("[savePushSubscriptionAction] Error guardando push_subscription:", error?.message);
        return { success: false, error: error?.message };
    }
}

/**
 * Elimina la push subscription del perfil del usuario.
 */
export async function clearPushSubscriptionAction(userId: string) {
    if (!userId) {
        return { success: false, error: "Falta userId" };
    }

    try {
        const { databases } = await createAdminClient();

        await databases.updateDocument(
            DATABASE_ID,
            COLLECTION_PROFILES,
            userId,
            { push_subscription: null }
        );

        return { success: true };
    } catch (error: any) {
        console.error("[clearPushSubscriptionAction] Error eliminando push_subscription:", error?.message);
        return { success: false, error: error?.message };
    }
}
