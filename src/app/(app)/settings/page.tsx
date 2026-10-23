'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, Cloud, Clock, FileText, LogOut, Sun, Moon, Monitor, Shield, Users, Activity } from 'lucide-react';
import { useTheme } from 'next-themes';
import { auth } from '@/firebase/config';
import { signOut } from 'firebase/auth';
import {
  getViewMode,
  setViewMode,
  getIsPremium,
  setActiveUser,
  getActiveUser,
  updateUserName,
  User,
} from '@/lib/data-layer';
import { clearEmployeeSession } from '@/lib/employee-service';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { ADMIN_EMAIL } from '@/lib/admin-service';
import { UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import {
  COMMON_TIMEZONES,
  getEffectiveTimezone,
  getSavedTimezoneSetting,
  setAppTimezone,
  formatAppTime,
} from '@/lib/date-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ViewMode = 'user' | 'customer';

export default function SettingsPage() {
  const router = useRouter();
  const { t, language, direction } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [viewMode, setVm] = useState<ViewMode>('user');
  const [isPremium, setIsPremium] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [timezone, setTimezone] = useState('');
  const [selectedTz, setSelectedTz] = useState('auto');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
    setVm(getViewMode());
    setSelectedTz(getSavedTimezoneSetting());

    const checkPremium = () => {
      setIsPremium(getIsPremium());
    };
    checkPremium();

    const user = getActiveUser();
    if (user) {
      setUser(user);
      setUserName(user.name);
      if (user.email === ADMIN_EMAIL) setIsAdminUser(true);
    }

    const updateClock = () => {
      const effTz = getEffectiveTimezone();
      setTimezone(effTz);
      setCurrentTime(formatAppTime(new Date()));
    };

    updateClock();
    const intervalId = setInterval(updateClock, 1000);

    window.addEventListener('cashbookpro_data_updated', checkPremium);
    window.addEventListener('cashbookpro_timezone_updated', updateClock);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('cashbookpro_data_updated', checkPremium);
      window.removeEventListener('cashbookpro_timezone_updated', updateClock);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const handleViewModeChange = (value: string) => {
    const newMode = value as ViewMode;
    setViewMode(newMode);
    setVm(newMode);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearEmployeeSession();
      setActiveUser(null);
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleUpdateName = async () => {
    if (!userName.trim()) {
      toast({ variant: 'destructive', title: "Name cannot be empty" });
      return;
    }
    setIsUpdatingName(true);
    try {
      await updateUserName(userName);
      toast({ title: "Name updated successfully!" });
    } catch (error) {
      console.error("Error updating name:", error);
      toast({ variant: 'destructive', title: "Failed to update name" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 bg-[#FAF8F3] dark:bg-[#121212] min-h-screen transition-colors duration-300" dir={direction}>
      <Card className="bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#333333]">
        <CardHeader>
          <CardTitle className="text-2xl font-serif font-bold text-[#2F2F2F] dark:text-[#E0E0E0]">{t('settingsTitle')}</CardTitle>
          <CardDescription className="italic dark:text-gray-400">{t('settingsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* User Profile Info Section */}
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b border-[#CFCAC0] dark:border-[#333333]">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-[#6B7A50] bg-[#FAF8F3] dark:bg-[#252525] flex items-center justify-center shrink-0">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <UserCircle className="h-16 w-16 text-[#6B7A50]" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h3 className="text-2xl font-serif font-bold text-[#2F2F2F] dark:text-[#E0E0E0]">{user?.name || 'User'}</h3>
              <p className="text-[#8C6A4F] dark:text-[#A68A73] font-medium">{user?.email}</p>
              <Badge variant="outline" className="mt-2 border-[#6B7A50] text-[#6B7A50]">
                {isPremium ? 'Premium Plan' : 'Free Plan'}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-serif font-bold dark:text-[#E0E0E0]">Profile Settings</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Your Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="pl-10 h-11 bg-white dark:bg-[#252525] border-[#CFCAC0] dark:border-[#444444]"
                />
              </div>
              <Button
                onClick={handleUpdateName}
                className="bg-[#6B7A50] hover:bg-[#5A6940] h-11"
                disabled={isUpdatingName}
              >
                {isUpdatingName ? "Saving..." : "Update Name"}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-serif font-bold dark:text-[#E0E0E0]">Clock & Timezone / وقت اور ٹائم زون</Label>
              <span className="text-xs text-muted-foreground">Local Time / آپ کا مقامی وقت</span>
            </div>
            <Card className="p-4 bg-[#FAF8F3] dark:bg-[#252525] border-[#D3D3D3] dark:border-[#444444]">
              <CardContent className="space-y-4 p-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Clock className="w-8 h-8 text-[#8C6A4F] dark:text-[#A68A73]" />
                    <div>
                      <p className="text-2xl font-sans font-bold dark:text-white">{currentTime}</p>
                      <p className="text-sm font-medium text-[#6B7A50] dark:text-[#8FA86B]">Active Timezone: {timezone}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#D3D3D3]/60 dark:border-[#444444]">
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Select Your Timezone (آپ جہاں بھی ہوں، اپنا علاقائی ٹائم زون منتخب کریں):
                  </Label>
                  <Select
                    value={selectedTz}
                    onValueChange={(val) => {
                      setSelectedTz(val);
                      setAppTimezone(val);
                      const eff = getEffectiveTimezone();
                      setTimezone(eff);
                      setCurrentTime(formatAppTime(new Date()));
                      toast({ title: `Timezone updated: ${val === 'auto' ? `Auto-detect (${eff})` : val}` });
                    }}
                  >
                    <SelectTrigger className="w-full bg-white dark:bg-[#1E1E1E] border-[#CFCAC0] dark:border-[#444444]">
                      <SelectValue placeholder="Select Timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tzItem) => (
                        <SelectItem key={tzItem.value} value={tzItem.value}>
                          {tzItem.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Auto-detect ensures users anywhere in the world see their exact local time and date automatically.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-serif font-bold dark:text-[#E0E0E0]">{t('viewMode')}</Label>
            <RadioGroup
              value={viewMode}
              onValueChange={handleViewModeChange}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user-view" className="border-primary" />
                <Label htmlFor="user-view" className="font-serif dark:text-gray-300">{t('userView')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customer" id="customer-view" className="border-primary" />
                <Label htmlFor="customer-view" className="font-serif dark:text-gray-300">{t('customerView')}</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-serif font-bold dark:text-[#E0E0E0]">App Theme</Label>
            {mounted ? (
              <RadioGroup
                value={theme}
                onValueChange={(val) => setTheme(val)}
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="light" id="theme-light" className="border-primary" />
                  <Label htmlFor="theme-light" className="font-serif flex items-center dark:text-gray-300">
                    <Sun className="w-4 h-4 mr-2" /> Light
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dark" id="theme-dark" className="border-primary" />
                  <Label htmlFor="theme-dark" className="font-serif flex items-center dark:text-gray-300">
                    <Moon className="w-4 h-4 mr-2" /> Dark
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="system" id="theme-system" className="border-primary" />
                  <Label htmlFor="theme-system" className="font-serif flex items-center dark:text-gray-300">
                    <Monitor className="w-4 h-4 mr-2" /> System
                  </Label>
                </div>
              </RadioGroup>
            ) : (
              <div className="h-10 w-full animate-pulse bg-gray-200 dark:bg-gray-800 rounded-lg" />
            )}
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => router.push('/settings/bill-design')}
              className="w-full justify-start bg-white dark:bg-[#252525] border-[#CFCAC0] dark:border-[#444444] text-foreground dark:text-[#E0E0E0] hover:bg-[#E5E2DA] dark:hover:bg-[#333333]"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Bill Design Settings
            </Button>
            <Button
              onClick={() => router.push('/employees')}
              className="w-full justify-start bg-white dark:bg-[#252525] border-[#CFCAC0] dark:border-[#444444] text-foreground dark:text-[#E0E0E0] hover:bg-[#E5E2DA] dark:hover:bg-[#333333]"
              variant="outline"
            >
              <Users className="mr-2 h-4 w-4 text-[#6B7A50]" />
              Manage Staff / Nokar
            </Button>
            <Button
              onClick={() => router.push('/activity-log')}
              className="w-full justify-start bg-white dark:bg-[#252525] border-[#CFCAC0] dark:border-[#444444] text-foreground dark:text-[#E0E0E0] hover:bg-[#E5E2DA] dark:hover:bg-[#333333]"
              variant="outline"
            >
              <Activity className="mr-2 h-4 w-4 text-[#8C6A4F]" />
              Activity Log
            </Button>
          </div>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg space-y-2 border-[#CFCAC0] dark:border-[#444444]">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-serif font-bold dark:text-[#E0E0E0]">{t('syncNow')}</Label>
                <Button
                  onClick={() => router.push('/premium')}
                  disabled={!isPremium}
                  size="sm"
                  className="bg-[#6B7A50] hover:bg-[#5A6940]"
                >
                  <Cloud className="mr-2 h-4 w-4" />
                  {t('syncNow')}
                </Button>
              </div>
              {!isPremium && <p className="text-sm italic text-muted-foreground dark:text-gray-400 font-serif">{t('syncDescription')}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => router.push('/premium')}
              className={`w-full ${isPremium && (typeof window !== 'undefined' && localStorage.getItem('cashbookpro_isPremium') === 'true') ? 'bg-[#E5E2DA] dark:bg-[#333333] text-foreground dark:text-[#E0E0E0]' : 'bg-[#8C6A4F] text-white hover:opacity-90'}`}
              disabled={isPremium && (typeof window !== 'undefined' && localStorage.getItem('cashbookpro_isPremium') === 'true')}
            >
              {(isPremium && typeof window !== 'undefined' && localStorage.getItem('cashbookpro_isPremium') === 'true') ? (
                <>
                  <Star className="mr-2 text-yellow-500 fill-yellow-500" /> {t('premiumActive')}
                </>
              ) : (
                <>
                  <Star className="mr-2" />
                  {t('upgradePremium')}
                </>
              )}
            </Button>
          </div>

          {!isPremium && mounted && typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform() && (
            <div className="space-y-4">
              <Button
                onClick={() => window.dispatchEvent(new Event('show_rewarded_ad'))}
                className="w-full justify-start bg-amber-900/10 hover:bg-amber-900/20 border-amber-800/30 text-amber-900 dark:text-amber-400 font-serif"
                variant="outline"
              >
                <Monitor className="mr-2 h-4 w-4" />
                Watch Ad to Support Us
              </Button>
            </div>
          )}

          {isAdminUser && (
            <div className="space-y-2">
              <Button
                onClick={() => router.push('/admin')}
                className="w-full justify-start bg-blue-900/20 hover:bg-blue-900/40 border border-blue-800 text-blue-300"
                variant="outline"
              >
                <Shield className="mr-2 h-4 w-4 text-blue-400" />
                Admin Panel
              </Button>
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-serif font-bold"
            >
              <LogOut className="mr-2 h-5 w-5" />
              Logout / Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
