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

        // 2. Check if user already exists in Auth
        let authUser;
        try {
            authUser = await users.get(profile.user_id);
            log("User already exists in Auth. Skipping creation.");
        } catch (e) {
            log("Creating new Auth user...");
            const tempPassword = crypto.randomBytes(20).toString('hex');
            authUser = await users.create(
                profile.user_id, // Match the ID used in the database
                profile.email,
                null, // No phone for Auth yet
                tempPassword,
                profile.name
            );
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
        <html>
        <head>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #000; color: #fff; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 40px auto; padding: 40px; border-radius: 24px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(20px); }
                .logo { font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; color: #10b981; margin-bottom: 30px; }
                h1 { font-size: 32px; font-weight: 800; margin-bottom: 20px; letter-spacing: -0.5px; }
                p { color: rgba(255, 255, 255, 0.6); line-height: 1.6; font-size: 16px; margin-bottom: 30px; }
                .button { display: inline-block; padding: 18px 36px; background: #fff; color: #000; font-weight: 900; text-decoration: none; border-radius: 12px; transition: all 0.3s; }
                .footer { margin-top: 40px; font-size: 12px; color: rgba(255, 255, 255, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">BOXING PROFIGHT</div>
                <h1>Bienvenido, ${profile.name}</h1>
                <p>Tu plaza en el ring está lista. Solo falta que configures tu acceso personal a la plataforma para empezar a reservar tus sesiones.</p>
                <a href="${setPasswordUrl}" class="button">ESTABLECER CONTRASEÑA</a>
                <p style="margin-top: 30px; font-size: 14px;">Este enlace caduca en 48 horas por motivos de seguridad.</p>
                <div class="footer">
                    &copy; ${new Date().getFullYear()} Boxing Profight Management. Acceso exclusivo para alumnos.
                </div>
            </div>
        </body>
        </html>
        `;

        const data = await resend.emails.send({
            from: 'Boxing Profight <onboarding@profight.com>',
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
