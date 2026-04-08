const sdk = require('node-appwrite');
const crypto = require('crypto');
const { Resend } = require('resend');

module.exports = async function (context) {
    const { req, res, log, error } = context;

    // ============================================================
    // 📬 SERVICIO DE CORREO CENTRALIZADO — Boxing Profight
    // Tipos soportados: "welcome" | "password_reset"
    // ============================================================

    // 1. Parse body
    let payload;
    try {
        payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
        error("Failed to parse request body: " + e.message);
        return res.json({ success: false, message: 'Invalid JSON payload' }, 400);
    }

    // 1. Logging de Diagnóstico (Alpha-Debug)
    log(`--- Appwrite Execution Start ---`);
    log(`Headers: ${JSON.stringify(req.headers)}`);
    log(`Payload: ${JSON.stringify(payload)}`);

    // 1.5. Inferencia Ultra-Resiliente (Soporte para Eventos de Appwrite Cloud)
    const appwriteEvent = req.headers['x-appwrite-event'] || '';
    let emailType = payload.type;

    if (!emailType) {
        if (appwriteEvent) {
            log(`Inference triggered by Appwrite Event: ${appwriteEvent}`);
            // Si el evento es sobre colecciones y tiene email
            if (appwriteEvent.includes('.collections.') && payload.email) {
                emailType = 'welcome';
                log("Inferred type: 'welcome' (via Appwrite Event Header)");
            }
        }
        // 🛡️ DESCUBRIMIENTO POR ESTRUCTURA (Resilient Fallback)
        else if (payload.email && (payload.user_id || payload.student_id)) {
            emailType = 'welcome';
            log("Inferred type: 'welcome' (via Payload Discovery)");
        }
    }

    if (!emailType) {
        log("CRITICAL: No emailType provided and couldn't infer from headers or payload.");
        return res.json({ success: false, message: 'Missing type information' }, 400);
    }

    log(`Procesando email de tipo: ${emailType}`);

    // 2. Load Config

    // 2. Load Config
    const projectID = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const endpoint = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
    const apiKey = process.env.APPWRITE_API_KEY;
    const publicDomain = (process.env.PUBLIC_DOMAIN || '').replace(/\/$/, '');

    if (!projectID || !apiKey) {
        error("Missing required Appwrite configuration");
        return res.json({ success: false, message: 'Server configuration error' }, 500);
    }

    if (!process.env.RESEND_API_KEY) {
        error("Missing RESEND_API_KEY");
        return res.json({ success: false, message: 'Email service not configured' }, 500);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const client = new sdk.Client()
        .setEndpoint(endpoint)
        .setProject(projectID)
        .setKey(apiKey);

    const users = new sdk.Users(client);
    const databases = new sdk.Databases(client);

    // ============================================================
    // 📨 TIPO 1: BIENVENIDA / INVITACIÓN (Triggered by DB event)
    // Payload: { type: "welcome", email, name, user_id, role }
    // ============================================================
    if (emailType === 'welcome') {
        const profile = payload;

        if (!profile.email || profile.role !== 'alumno') {
            log("Not a student profile or missing email. Skipping.");
            return res.json({ success: true, message: 'Skipped: Not a student' });
        }

        try {
            log(`Processing welcome invitation for: ${profile.name} <${profile.email}>`);

            // Resolve or create Auth User (Resilient Flow)
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
                        log(`User not found by ID or Email. Creating new with ID [${profile.user_id}]...`);
                        const tempPassword = crypto.randomBytes(20).toString('hex');
                        try {
                            authUser = await users.create(
                                profile.user_id,
                                profile.email,
                                null,
                                tempPassword,
                                profile.name
                            );
                            log("New Auth user created successfully.");
                        } catch (createErr) {
                            // 🛡️ REGLA DE ROBUSTEZ: Si el usuario ya existe (409), simplemente lo recuperamos por ID
                            if (createErr.code === 409) {
                                log("Auth user already exists (409 Conflict). Getting user data...");
                                authUser = await users.get(profile.user_id);
                            } else {
                                error(`Error creating user: ${createErr.message}`);
                                throw createErr;
                            }
                        }
                    }
                } catch (emailError) {
                    error("Critical error resolving user: " + emailError.message);
                    throw emailError;
                }
            }

            // Generate & Store Token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 48); // 48h

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

            const actionUrl = `${publicDomain}/set-password?token=${token}`;
            const html = buildWelcomeEmail(profile.name, actionUrl, publicDomain);

            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'no-reply@boxingprofight.com',
                to: [profile.email],
                subject: '🧤 ¡Bienvenido a Boxing Profight! Configura tu cuenta',
                html,
            });

            log(`Welcome email sent to: ${profile.email}`);
            return res.json({ success: true, message: 'Welcome email sent' });

        } catch (err) {
            error(`Error processing welcome email: ${err.message}`);
            return res.json({ success: false, error: err.message }, 500);
        }
    }

    // ============================================================
    // 🔑 TIPO 2: RECUPERACIÓN DE CONTRASEÑA (HTTP Execution)
    // Payload: { type: "password_reset", email, name, tokenUrl }
    // ============================================================
    if (emailType === 'password_reset') {
        const { email, name, tokenUrl } = payload;

        if (!email || !tokenUrl) {
            error("Missing required fields for password_reset: email, tokenUrl");
            return res.json({ success: false, message: 'Missing email or tokenUrl' }, 400);
        }

        try {
            log(`Processing password reset email for: ${email}`);

            const html = buildPasswordResetEmail(name || 'Alumno', tokenUrl, publicDomain);

            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'no-reply@boxingprofight.com',
                to: [email],
                subject: '🔑 Restablece tu contraseña - Boxing Profight',
                html,
            });

            log(`Password reset email sent to: ${email}`);
            return res.json({ success: true, message: 'Password reset email sent' });

        } catch (err) {
            error(`Error processing password reset email: ${err.message}`);
            return res.json({ success: false, error: err.message }, 500);
        }
    }

    // Unknown type
    log(`Unknown email type: ${emailType}`);
    return res.json({ success: false, message: `Unknown type: ${emailType}` }, 400);
};


// ============================================================
// 🎨 TEMPLATES HTML
// ============================================================

function buildWelcomeEmail(name, actionUrl, publicDomain) {
    return `
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
                    <tr>
                        <td align="center" style="padding: 48px 40px 20px 40px;">
                            <img src="${publicDomain}/logo_boxing_profight.webp" alt="Boxing Profight" width="100" style="display: block; border-radius: 16px;">
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 0 48px 48px 48px;">
                            <h1 style="color: #ffffff; font-size: 32px; font-weight: 800; margin: 0 0 20px 0; letter-spacing: -1px; text-transform: uppercase;">
                                ¡Bienvenido, ${name}!
                            </h1>
                            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                                Tu plaza en el ring está lista. Solo falta que configures tu acceso personal a la plataforma para empezar a reservar tus sesiones.
                            </p>
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" bgcolor="#ffffff" style="border-radius: 16px;">
                                        <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 20px 40px; color: #000000; font-size: 14px; font-weight: 900; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
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
                    <tr>
                        <td align="center" style="background-color: #080808; padding: 24px 48px; border-top: 1px solid #1a1a1a;">
                            <p style="color: #52525b; font-size: 11px; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                &copy; ${new Date().getFullYear()} Boxing Profight Management
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function buildPasswordResetEmail(name, tokenUrl, publicDomain) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Restablecer contraseña - Boxing Profight</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0c0c0c; border: 1px solid #1a1a1a; border-radius: 32px; overflow: hidden; border-collapse: separate;">
                    <tr>
                        <td align="center" style="padding: 48px 40px 20px 40px;">
                            <img src="${publicDomain}/logo_boxing_profight.webp" alt="Boxing Profight" width="100" style="display: block; border-radius: 16px;">
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 0 48px 48px 48px;">
                            <div style="display: inline-block; background-color: #1a0000; border: 1px solid #dc2626; border-radius: 50px; padding: 8px 20px; margin-bottom: 24px;">
                                <span style="color: #ef4444; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Solicitud de Seguridad</span>
                            </div>
                            <h1 style="color: #ffffff; font-size: 28px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -1px; text-transform: uppercase;">
                                Restablecer Contraseña
                            </h1>
                            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0;">
                                Hola, <strong style="color: #ffffff;">${name}</strong>.
                            </p>
                            <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin: 0 0 32px 0;">
                                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña segura.
                            </p>
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" bgcolor="#dc2626" style="border-radius: 16px;">
                                        <a href="${tokenUrl}" target="_blank" style="display: inline-block; padding: 20px 40px; color: #ffffff; font-size: 14px; font-weight: 900; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                                            🔑 CREAR NUEVA CONTRASEÑA
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #71717a; font-size: 13px; margin: 32px 0 8px 0; line-height: 1.5;">
                                Si no solicitaste este cambio, puedes ignorar este correo con total seguridad. Tu contraseña no cambiará.
                            </p>
                            <p style="color: #3f3f46; font-size: 12px; margin: 0; font-weight: 500;">
                                ⏱ Este enlace caduca en <strong style="color: #52525b;">1 hora</strong> por seguridad.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="background-color: #080808; padding: 24px 48px; border-top: 1px solid #1a1a1a;">
                            <p style="color: #52525b; font-size: 11px; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                &copy; ${new Date().getFullYear()} Boxing Profight Management
                            </p>
                            <p style="color: #27272a; font-size: 10px; margin: 4px 0 0 0;">
                                Si no reconoces esta solicitud, contacta con administración inmediatamente.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
