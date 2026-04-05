// public/sw.js

self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.content || data.body || "Tienes un nuevo anuncio en Boxeo ProFight",
            icon: '/icon_boxing_profight-192x192.webp',
            badge: '/icon_boxing_profight-192x192.webp',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/perfil'
            },
            tag: 'boxing-profight-announcement',
            renotify: true,
            actions: [
                { action: 'open', title: 'Ver Tablón' },
                { action: 'close', title: 'Omitir' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || "ProFight: Nuevo Aviso", options)
        );
    } catch (e) {
        // Fallback con texto plano
        try {
            const text = event.data.text();
            event.waitUntil(
                self.registration.showNotification("ProFight: Nuevo Aviso", {
                    body: text,
                    icon: '/icon_boxing_profight-192x192.webp',
                })
            );
        } catch (e2) {
            console.error('[SW] Error en push event:', e2);
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.action === 'close') return;

    const targetUrl = event.notification.data?.url || '/perfil';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
