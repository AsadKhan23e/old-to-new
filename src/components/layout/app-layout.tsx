import { ReactNode } from 'react';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { DesktopSidebar } from './desktop-sidebar';
import { AdBanner } from '@/components/AdBanner';
import { UserNotifications } from '@/components/UserNotifications';

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground h-screen overflow-hidden">
      {/* Sidebar (Desktop Only) */}
      <DesktopSidebar className="hidden md:flex flex-none" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-full overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-8 pt-4">
          <UserNotifications />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full animate-in fade-in duration-500">
            {children}
            <div className="mt-8 mb-4 border-t pt-4">
              <AdBanner />
            </div>
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
