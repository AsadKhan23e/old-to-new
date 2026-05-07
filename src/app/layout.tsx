import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { CapacitorHandler } from "@/components/capacitor-handler";
import { DataInitializer } from "@/components/data-initializer";
import { AdManager } from "@/components/ads/ad-manager";
import './globals.css';

export const metadata: Metadata = {
  title: 'CashbookPro',
  description: 'Manage your business finances with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CapacitorHandler />
          <DataInitializer />
          <AdManager />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
