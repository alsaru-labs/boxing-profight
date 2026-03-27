const sdk = require('node-appwrite');
const webpush = require('web-push');

module.exports = async function (context) {
    const { req, res, log, error } = context;

    // 1. Configurar Web Push con tus llaves VAPID
    webpush.setVapidDetails(
        'mailto:admin@profight.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    // 2. Extraer los datos del nuevo anuncio (vienen en el evento de creación)
    // El payload del evento contiene el documento creado en notifications
    const announcement = req.body;

    if (!announcement || !announcement.title) {
        log("No hay contenido en el anuncio o el cuerpo está vacío.");
        return res.json({ success: false, message: "Empty body" });
    }

    log(`Procesando anuncio: ${announcement.title}`);

    // 3. Inicializar Appwrite SDK para buscar suscripciones en la tabla de alumnos
    const client = new sdk.Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new sdk.Databases(client);

    try {
        // 4. Buscar todos los perfiles que tengan el campo 'push_subscription' relleno
        const profiles = await databases.listDocuments(
            process.env.DATABASE_ID,
            process.env.COLLECTION_PROFILES_ID,
            [
                sdk.Query.isNotNull('push_subscription'),
                sdk.Query.limit(5000)
            ]
        );

        log(`Enviando a ${profiles.documents.length} dispositivos suscritos...`);

        // 5. Enviar notificaciones en paralelo
        const notifications = profiles.documents.map(profile => {
            const subscription = JSON.parse(profile.push_subscription);

            const payload = JSON.stringify({
                title: announcement.title,
                content: announcement.content || "Tienes un nuevo aviso de la escuela.",
                url: '/perfil'
            });

            return webpush.sendNotification(subscription, payload)
                .catch(err => {
                    error(`Error enviando a usuario ${profile.$id}: ${err.message}`);
                    return null;
                });
        });

        await Promise.all(notifications);

        return res.json({ success: true, count: profiles.documents.length });

    } catch (err) {
        error(`Error general en el motor de envío: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};
