import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const inter = Inter({ subsets: ["latin"] });

// --- SOCIAL MEDIA SHARING CONFIGURATION ---
export const metadata = {
  title: "Jahan Music Player",
  description: "Pro Fidelity Audio Player with Spotify Integration. Zero latency, smooth animations, and premium dark UI.",
  
  // This is your actual domain
  metadataBase: new URL('https://music.jachu.xyz'), 

  // WhatsApp, Facebook, Discord, etc.
  openGraph: {
    title: 'Jahan Music Player',
    description: 'Experience music like never before. Connect Spotify and listen in high fidelity.',
    url: 'https://music.jachu.xyz',
    siteName: 'Jahan Music',
    images: [
      {
        url: '/og-image.png', // This looks for the file in your public folder
        width: 1200,
        height: 630,
        alt: 'Jahan Music Player Interface',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  // Twitter / X
  twitter: {
    card: 'summary_large_image',
    title: 'Jahan Music Player',
    description: 'Pro Fidelity Audio Player with Spotify Integration.',
    images: ['/og-image.png'],
  },

  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}