const sdk = require('node-appwrite');
const crypto = require('crypto');
const { Resend } = require('resend');

module.exports = async function (context) {
    const { req, res, log, error } = context;

    // Ensure profile is an object (Appwrite events can send strings or objects depending on the runtime/header)
    let profile;
    try {
        profile = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        error("Failed to parse request body: " + e.message);
        return res.json({ success: false, message: 'Invalid JSON payload' }, 400);
    }

    // 1. Initial Checks
    if (req.method !== 'POST') {
        return res.json({ success: false, message: 'Only POST allowed' });
    }

    if (!profile || !profile.email || profile.role !== 'alumno') {
        log("Not a student profile or missing email. Skipping.");
        return res.json({ success: true, message: 'Skipped: Not a student' });
    }

    // Load Environment Variables
    const projectID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const apiKey = process.env.APPWRITE_API_KEY;

    if (!projectID || !apiKey) {
        error("Missing required Appwrite configuration (Project ID or API Key)");
        return res.json({ success: false, message: 'Server configuration error' }, 500);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const client = new sdk.Client()
        .setEndpoint(endpoint)
        .setProject(projectID)
        .setKey(apiKey);

    const users = new sdk.Users(client);
    const databases = new sdk.Databases(client);

    try {
        log(`Processing invitation for: ${profile.name} <${profile.email}>`);

        // 2. Resolve Auth User (Check by ID first, then by Email as fallback)
        let authUser;
        try {
            authUser = await users.get(profile.user_id);
            log(`Found existing user by ID: ${authUser.$id}`);
        } catch (idError) {
            log(`User ID not found, checking by email: ${profile.email}`);
            try {
                const usersList = await users.list([sdk.Query.equal("email", profile.email)]);
                if (usersList.total > 0) {
                    authUser = usersList.users[0];
                    log(`Found existing user by Email: ${authUser.$id}`);
                } else {
                    log("Creating new Auth user...");
                    const tempPassword = crypto.randomBytes(20).toString('hex');
                    authUser = await users.create(
                        profile.user_id,
                        profile.email,
                        null,
                        tempPassword,
                        profile.name
                    );
                }
            } catch (emailError) {
                error("Critical error resolving user: " + emailError.message);
                throw emailError;
            }
        }

        // 3. Generate Secure Token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48h validity

        // 4. Save Token to Database
        await databases.createDocument(
            process.env.DATABASE_ID,
            process.env.COLLECTION_TOKENS_ID,
            sdk.ID.unique(),
            {
                token: token,
                user_id: authUser.$id,
                expires_at: expiresAt.toISOString()
            }
        );

        // 5. Send Email via Resend
        const setPasswordUrl = `${process.env.PUBLIC_DOMAIN}/set-password?token=${token}`;

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Bienvenido a Boxing Profight</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0c0c0c; border: 1px solid #1a1a1a; border-radius: 32px; overflow: hidden; border-collapse: separate;">
                            <!-- Header / Logo -->
                            <tr>
                                <td align="center" style="padding: 48px 40px 20px 40px;">
                                    <img src="https://boxingprofight.com/logo_boxing_profight.webp" alt="Boxing Profight" width="100" style="display: block; border-radius: 16px;">
                                </td>
                            </tr>
                            
                            <!-- Main Content -->
                            <tr>
                                <td align="center" style="padding: 0 48px 48px 48px;">
                                    <h1 style="color: #ffffff; font-size: 32px; font-weight: 800; margin: 0 0 20px 0; letter-spacing: -1px; text-transform: uppercase;">
                                        ¡Bienvenido, ${profile.name}!
                                    </h1>
                                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                                        Tu plaza en el ring está lista. Solo falta que configures tu acceso personal a la plataforma para empezar a reservar tus sesiones y llevar tu entrenamiento al máximo nivel.
                                    </p>
                                    
                                    <!-- Action Button -->
                                    <table border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="center" bgcolor="#ffffff" style="border-radius: 16px;">
                                                <a href="${setPasswordUrl}" target="_blank" style="display: inline-block; padding: 20px 40px; color: #000000; font-size: 14px; font-weight: 900; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                                                    ESTABLECER CONTRASEÑA
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <p style="color: #3f3f46; font-size: 12px; margin: 32px 0 0 0; font-weight: 500;">
                                        Este enlace caduca automáticamente en 48 horas.
                                    </p>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td align="center" style="background-color: #080808; padding: 24px 48px; border-top: 1px solid #1a1a1a;">
                                    <p style="color: #52525b; font-size: 11px; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        &copy; ${new Date().getFullYear()} Boxing Profight Management
                                    </p>
                                    <p style="color: #27272a; font-size: 10px; margin: 4px 0 0 0;">
                                        Acceso exclusivo para miembros registrados.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        const data = await resend.emails.send({
            //  from: 'Boxing Profight <onboarding@profight.com>',
            from: 'onboarding@resend.dev', // Cambia esto para el test inicial
            to: [profile.email],
            subject: '🧤 ¡Bienvenido a Boxing Profight! Configura tu cuenta',
            html: html,
        });

        log(`Email sent successfully: ${data.id}`);
        return res.json({ success: true, message: 'Invitation sent' });

    } catch (err) {
        error(`Error processing invitation: ${err.message}`);
        return res.json({ success: false, error: err.message }, 500);
    }
};
