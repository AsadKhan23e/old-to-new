'use client';

import { useEffect, useState, useRef } from 'react';
import Script from 'next/script';

export function AdBanner() {
  const [isPremium, setIsPremium] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const premium = localStorage.getItem('cashbookpro_isPremium') === 'true';
      setIsPremium(premium);
    }

    // Refresh interval every 25 seconds as requested
    const timer = setInterval(() => {
      setRefreshCount(prev => prev + 1);
    }, 25000);

    return () => clearInterval(timer);
  }, []);

  if (isPremium) return null;

  return (
    <div className="w-full flex flex-col items-center justify-center my-6">
      <GlobalAdInjector />
      {/* The main native ad that refreshes every 25s */}
      <NativeAdInjector refreshCount={refreshCount} />
    </div>
  );
}

function GlobalAdInjector() {
  useEffect(() => {
    // Only inject once
    if (document.getElementById('global-pop-ad-script')) return;

    const script = document.createElement('script');
    script.id = 'global-pop-ad-script';
    script.type = 'text/javascript';
    script.src = "//pl29246174.profitablecpmratenetwork.com/6b/de/2d/6bde2d27b4011bc9e8be3cc6eb0154c9.js";
    script.async = true;
    script.setAttribute('data-cfasync', 'false');

    document.head.appendChild(script);

  }, []);

  return null;
}

function NativeAdInjector({ refreshCount }: { refreshCount: number }) {
  useEffect(() => {
    const container = document.getElementById("native-ad-wrapper");
    if (!container) return;

    // Completely clear prior contents (old iframe)
    container.innerHTML = '';

    // Create a new iframe for a clean browsing context (best for Adsterra network safety and reliable refreshing)
    const iframe = document.createElement('iframe');
    iframe.width = "100%";
    iframe.height = "250"; // Generic height that native ads usually fit within
    iframe.frameBorder = "0";
    iframe.scrolling = "no";
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    // Allow scripts and standard ad behaviors but keep it slightly sandboxed from the main app's React lifecycle
    iframe.sandbox = "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

    container.appendChild(iframe);

    // Write the ad script directly into the isolated iframe document
    // This perfectly mimics a fresh page load every 25 seconds
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: transparent; overflow: hidden; }
            </style>
          </head>
          <body>
            <div id="container-2a4372fbbfaa6e47bc594309d31ca3e0"></div>
            <script async="async" data-cfasync="false" src="https://pl29246069.profitablecpmratenetwork.com/2a4372fbbfaa6e47bc594309d31ca3e0/invoke.js"></script>
          </body>
        </html>
      `);
      iframeDoc.close();
    }

    return () => {
      container.innerHTML = '';
    }
  }, [refreshCount]);

  return <div id="native-ad-wrapper" className="w-full flex justify-center overflow-hidden min-h-[100px]"></div>;
}
