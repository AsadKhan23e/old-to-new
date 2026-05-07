'use client';

import Link from 'next/link';
import { Settings, ArrowLeft, Languages, Cloud, CloudOff, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/use-translation';
import { useSyncStatus } from '@/lib/data-layer';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLang } = useTranslation();
  const syncStatus = useSyncStatus();

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ur' : 'en';
    setLang(newLang);
  };

  const showBackButton = true;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Button>
          )}
          <Link href="/dashboard">
            <h1 className="text-xl font-bold font-headline text-primary">
              CashbookPro
            </h1>
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="mr-1 sm:mr-2 flex items-center justify-center bg-muted/30 p-2 rounded-full hidden sm:flex">
            {syncStatus === 'synced' && <div className="flex items-center gap-1.5"><Cloud className="h-4 w-4 text-green-500" /><span className="text-[10px] text-muted-foreground font-medium">Synced</span></div>}
            {syncStatus === 'offline' && <div className="flex items-center gap-1.5"><CloudOff className="h-4 w-4 text-orange-500" /><span className="text-[10px] text-muted-foreground font-medium">Offline</span></div>}
            {syncStatus === 'syncing' && <div className="flex items-center gap-1.5"><RefreshCcw className="h-4 w-4 text-blue-500 animate-spin" /><span className="text-[10px] text-muted-foreground font-medium">Syncing...</span></div>}
          </div>
          <Button onClick={toggleLanguage} variant="ghost" size="icon">
            <Languages className="h-5 w-5" />
            <span className="sr-only">Toggle Language</span>
          </Button>
          <Button asChild variant="ghost" size="icon">
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
