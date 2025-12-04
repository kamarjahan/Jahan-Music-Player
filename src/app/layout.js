import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers"; // Import the new wrapper
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

// --- PREVIEW CARD CONFIGURATION ---
export const metadata = {
  title: "Jahan Music Player",
  description: "Pro Fidelity Audio Player with Spotify Integration. Zero latency, smooth animations, and premium dark UI.",
  
  // Your real domain
  metadataBase: new URL('https://music.jachu.xyz'), 

  // Configuration for WhatsApp, Discord, Facebook, etc.
  openGraph: {
    title: 'Jahan Music Player',
    description: 'Connect Spotify and listen in high fidelity.',
    url: 'https://music.jachu.xyz',
    siteName: 'Jahan Music',
    images: [
      {
        url: '/og-image.png', // This is the image file we will add next
        width: 1200,
        height: 630,
        alt: 'Jahan Music Player UI',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  // Configuration for Twitter / X
  twitter: {
    card: 'summary_large_image',
    title: 'Jahan Music Player',
    description: 'Pro Fidelity Audio Player with Spotify Integration.',
    images: ['/og-image.png'], // Same image
  },

  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* We wrap the app in the Providers component we created */}
        <Providers>
            {children}
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}