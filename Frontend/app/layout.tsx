import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// Replace with your actual website URL
const siteUrl = 'https://zenith.nexite.site';

export const metadata: Metadata = {
  title: 'ZENITH: EARTH ENGINE AI Agent',
  description: 'An advanced geospatial analysis assistant powered by AI.',
  // Open Graph / Facebook
  openGraph: {
    images: [`${siteUrl}/banner.png`],
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'ZENITH: EARTH ENGINE AI Agent',
    description: 'An advanced geospatial analysis assistant powered by AI.',
    images: [`${siteUrl}/banner.png`], // URL to your image
    // creator: '@yourTwitterHandle', // Optional: add your Twitter handle
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}