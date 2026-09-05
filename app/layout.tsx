import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Spyder - Hand Tracking & Gesture Canvas',
  description: 'Camera hand tracking and finger analysis tool with pinch-to-draw and fist-to-erase gesture controls.',
  openGraph: {
    title: 'Spyder - Hand Tracking & Gesture Canvas',
    description: 'Camera hand tracking and finger analysis tool with pinch-to-draw and fist-to-erase gesture controls.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spyder - Hand Tracking & Gesture Canvas',
    description: 'Camera hand tracking and finger analysis tool with pinch-to-draw and fist-to-erase gesture controls.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
