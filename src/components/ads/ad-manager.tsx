'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdOptions, RewardAdPluginEvents, AdLoadInfo, AdOptions, AdmobConsentStatus } from '@capacitor-community/admob';
import { getIsPremium } from '@/lib/data-layer';

export function AdManager() {
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const premium = getIsPremium();
            setIsPremium(premium);

            if (premium) return;

            if (Capacitor.isNativePlatform()) {
                initializeAdMob();
            }
        }
    }, []);

    const [sessionStartTime] = useState(Date.now());
    const [actionCount, setActionCount] = useState(0);

    const initializeAdMob = async () => {
        try {
            await AdMob.initialize({ initializeForTesting: false });

            const rewardOptions: RewardAdOptions = {
                adId: 'ca-app-pub-6805305075660963/7880319625',
                isTesting: false
            };

            const interstitialOptions: AdOptions = {
                adId: 'ca-app-pub-6805305075660963/3465905239', // New ID
                isTesting: false
            };

            // Initial preparation
            await AdMob.prepareRewardVideoAd(rewardOptions).catch(() => { });
            await AdMob.prepareInterstitial(interstitialOptions).catch(() => { });

            const canShowAd = () => {
                if (getIsPremium()) return false;

                const timeInApp = Date.now() - sessionStartTime;
                const minTime = 120000; // 2 minutes initial delay for account safety

                return timeInApp > minTime;
            };

            const showRewardAd = async () => {
                if (getIsPremium()) return;
                try {
                    await AdMob.showRewardVideoAd();
                } catch (err) {
                    await AdMob.prepareRewardVideoAd(rewardOptions);
                    await AdMob.showRewardVideoAd().catch(() => { });
                }
            };

            const showInterstitialAd = async () => {
                if (!canShowAd()) return;

                try {
                    await AdMob.showInterstitial();
                    setActionCount(0);
                    await AdMob.prepareInterstitial(interstitialOptions);
                } catch (err) {
                    await AdMob.prepareInterstitial(interstitialOptions);
                    await AdMob.showInterstitial().catch(() => { });
                }
            };

            // --- Background Timer Logic ---
            // Show ad every 5 minutes to active free users automatically
            const backgroundAdInterval = setInterval(() => {
                if (canShowAd()) {
                    console.log("AdManager: Triggering background scheduled ad");
                    showInterstitialAd();
                }
            }, 300000); // 5 minutes

            window.addEventListener('show_mobile_ad', showInterstitialAd);
            window.addEventListener('show_rewarded_ad', showRewardAd);
            window.addEventListener('show_interstitial_ad', showInterstitialAd);

            return () => {
                clearInterval(backgroundAdInterval);
                window.removeEventListener('show_mobile_ad', showInterstitialAd);
                window.removeEventListener('show_rewarded_ad', showRewardAd);
                window.removeEventListener('show_interstitial_ad', showInterstitialAd);
            };
        } catch (e) {
            console.error('AdMob init failed', e);
        }
    };

    return null;
}
