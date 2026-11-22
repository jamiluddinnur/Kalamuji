import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F9FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0F292E' },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'Kalamuji — Pelatih Komunikasi Suara Profesional',
    template: '%s | Kalamuji',
  },
  description:
    'Latih kejelasan, relevansi, persuasi, dan ketenangan nada bicara Anda melalui simulasi suara realistis.',
  applicationName: 'Kalamuji',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kalamuji',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh bg-surface-canvas font-sans text-ink-primary antialiased selection:bg-brand-100 selection:text-brand-900">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 sm:max-w-lg md:max-w-3xl">
          {children}
        </div>
      </body>
    </html>
  );
}
