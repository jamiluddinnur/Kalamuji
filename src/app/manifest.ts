import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kalamuji — Latihan Komunikasi Profesional',
    short_name: 'Kalamuji',
    description:
      'Pelatih komunikasi suara berbasis AI untuk wawancara kerja, presentasi, negosiasi, dan percakapan profesional.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F8F9FA',
    theme_color: '#0F292E',
    lang: 'id',
    categories: ['education', 'productivity', 'business'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
