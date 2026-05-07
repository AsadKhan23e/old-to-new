'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdOptions, RewardAdPluginEvents, AdLoadInfo } from '@capacitor-community/admob';

export function AdManager() {
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const premium = localStorage.getItem('cashbookpro_isPremium') === 'true';
            setIsPremium(premium);

            if (premium) return;

            if (Capacitor.isNativePlatform()) {
                initializeAdMob();
            }
        }
    }, []);

    const initializeAdMob = async () => {
        try {
            await AdMob.initialize({
                // testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
                initializeForTesting: false,
            });

            const options: RewardAdOptions = {
                adId: 'ca-app-pub-6805305075660963/7880319625',
                isTesting: false
            };

            AdMob.addListener(RewardAdPluginEvents.Loaded, (info: AdLoadInfo) => {
                console.log('Rewarded Ad Loaded', info);
            });

            AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem: any) => {
                console.log('User Rewarded', rewardItem);
            });

            AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                console.log('Rewarded Ad Dismissed. Preparing next...');
                AdMob.prepareRewardVideoAd(options).catch((e: any) => console.error(e));
            });

            // Prepare the first ad
            await AdMob.prepareRewardVideoAd(options);

            // Allow triggering the ad globally from anywhere in the app
            const triggerRewardedAd = async () => {
                // Double check premium to avoid ads for paid users
                if (localStorage.getItem('cashbookpro_isPremium') === 'true') return;

                try {
                    await AdMob.showRewardVideoAd();
                } catch (err) {
                    console.log("Ad not ready yet, trying to prepare...");
                    await AdMob.prepareRewardVideoAd(options);
                    await AdMob.showRewardVideoAd().catch((e: any) => console.error("Ad showing failed twice", e));
                }
            };

            window.addEventListener('show_mobile_ad', triggerRewardedAd as EventListener);
            window.addEventListener('show_rewarded_ad', triggerRewardedAd as EventListener);

            return () => {
                window.removeEventListener('show_mobile_ad', triggerRewardedAd as EventListener);
                window.removeEventListener('show_rewarded_ad', triggerRewardedAd as EventListener);
            };

        } catch (e) {
            console.error('AdMob initialization failed', e);
        }
    };

    return null;
}
