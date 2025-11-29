import type { Metadata } from 'next';
import '@/styles/globals.scss';

export const metadata: Metadata = {
  title: 'Rmli interactive gallery',
  description: 'description',
  keywords: 'keywords',
  authors: [{ name: 'Rami Alshalabi' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="no-js loading">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="stylesheet" href="https://use.typekit.net/zvj1jsw.css" />
      </head>
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}

