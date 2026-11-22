import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

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
    <html lang="id" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-dvh bg-surface-canvas font-sans text-ink-primary antialiased selection:bg-brand-100 selection:text-brand-900">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 sm:max-w-lg md:max-w-3xl">
          {children}
        </div>
      </body>
    </html>
  );
}
