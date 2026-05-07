'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLanguage, setLanguage } from '@/lib/data-layer';
import en from '@/locales/en.json';
import ur from '@/locales/ur.json';

const translations = { en, ur };

type TranslationKey = keyof typeof en;

export function useTranslation() {
  const [language, setLangState] = useState<'en' | 'ur'>('en');
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');

  useEffect(() => {
    const currentLang = getLanguage();
    setLangState(currentLang);
    setDirection(currentLang === 'ur' ? 'rtl' : 'ltr');
  }, []);

  const setLang = useCallback((lang: 'en' | 'ur') => {
    setLanguage(lang);
    setLangState(lang);
    setDirection(lang === 'ur' ? 'rtl' : 'ltr');
    // Manually update html tag attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    window.dispatchEvent(new Event('storage'));
  }, []);
  
  useEffect(() => {
    const handleStorageChange = () => {
        const newLang = getLanguage();
        if (newLang !== language) {
            setLangState(newLang);
            setDirection(newLang === 'ur' ? 'rtl' : 'ltr');
            document.documentElement.lang = newLang;
            document.documentElement.dir = newLang === 'ur' ? 'rtl' : 'ltr';
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [language]);


  const t = useCallback((key: string): string => {
    return translations[language][key as TranslationKey] || key;
  }, [language]);

  return { t, setLang, language, direction };
}