import React from 'react';
import { BillDesignSettings } from "@/lib/data-layer";

type Props = {
    settings: BillDesignSettings;
};

export const InvoiceBackgroundLayer = ({ settings }: Props) => {
    if (!settings.backgroundBanner) return null;

    const opacity = settings.backgroundOpacity ?? 0.15;
    const size = settings.backgroundSize || 'cover';
    const position = settings.backgroundPosition || 'center';
    const repeat = settings.backgroundRepeat || 'no-repeat';
    const scale = settings.backgroundScale ?? 1;

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: `url(${settings.backgroundBanner})`,
                    backgroundSize: size,
                    backgroundPosition: position,
                    backgroundRepeat: repeat,
                    opacity: opacity,
                    transform: `scale(${scale})`,
                    transformOrigin: 'center center',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                }}
            />
        </div>
    );
};
