import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { CapacitorHandler } from "@/components/capacitor-handler";
import { DataInitializer } from "@/components/data-initializer";
import { AdManager } from "@/components/ads/ad-manager";
import { AppUpdateChecker } from "@/components/app-update-checker";
import { PWARegister } from "@/components/pwa-register";
import './globals.css';

export const metadata: Metadata = {
  title: 'MyShopBook',
  applicationName: 'MyShopBook',
  description: 'MyShopBook - Business finance, ledger, and customer accounts management web app.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'MyShopBook',
    description: 'MyShopBook - Business finance, ledger, and customer accounts management.',
    siteName: 'MyShopBook',
  },
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
          <PWARegister />
          <CapacitorHandler />
          <DataInitializer />
          <AdManager />
          <AppUpdateChecker />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
