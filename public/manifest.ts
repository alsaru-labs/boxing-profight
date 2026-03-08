import {
    MetadataRoute
} from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Boxing ProFight',
        short_name: 'BoxingProFight',
        description: 'App de Boxeo',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
            {
                src: '/icon_boxing_profight.webp',
                sizes: '180x180',
                type: 'image/webp',
            },
            {
                src: '/icon_boxing_profight-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon_boxing_profight-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable', // <--- IMPORTANTE para Android
            }
        ],
    }
}