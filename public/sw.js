// public/sw.js
self.addEventListener('push', function (event) {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.content || data.body || "Tienes un nuevo anuncio en Boxeo ProFight",
            icon: '/logo_boxing_profight.webp',
            badge: '/logo_boxing_profight_small.webp', // Assuming a small icon exists or fallback
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/perfil'
            },
            tag: 'boxing-profight-announcement',
            actions: [
                { action: 'open', title: 'Ver Tablón' },
                { action: 'close', title: 'Omitir' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || "ProFight: Nuevo Aviso", options)
        );
    } catch (e) {
        console.error("Push event data error:", e);
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.action === 'close') return;

    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
