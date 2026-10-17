'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Building, Star, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { useEffect, useState } from 'react';
import { getViewMode } from '@/lib/data-layer';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isUserView, setIsUserView] = useState(true);

  useEffect(() => {
    setIsUserView(getViewMode() === 'user');
  }, []);


  const navLinks = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/customers', label: t('customers'), icon: Users },
    { href: '/items', label: t('quick_items'), icon: Package },
    { href: '/suppliers', label: t('suppliers'), icon: Building, userViewOnly: true },
    { href: '/premium', label: 'Premium', icon: Star },
  ];

  const filteredNavLinks = navLinks.filter(link => !link.userViewOnly || isUserView);

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 border-t bg-background">
      <div className={`grid h-full max-w-lg grid-cols-${filteredNavLinks.length} mx-auto font-medium`}>
        {filteredNavLinks.map(({ href, label, icon: Icon }) => {
          const isActive = (href === '/dashboard' && pathname === href) || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] text-center font-bold tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
