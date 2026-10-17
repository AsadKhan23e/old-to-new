'use client';

import { useEffect, useState } from 'react';
import { Store, ChevronDown, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getActiveUser, getUserData, switchShop, AppData } from '@/lib/data-layer';
import { cn } from '@/lib/utils';

export function ShopSelector() {
    const [data, setData] = useState<AppData | null>(null);
    const user = getActiveUser();

    useEffect(() => {
        if (user) {
            setData(getUserData(user.email));

            const handleUpdate = () => {
                setData(getUserData(user.email));
            };

            window.addEventListener('cashbookpro_data_updated', handleUpdate);
            return () => window.removeEventListener('cashbookpro_data_updated', handleUpdate);
        }
    }, [user]);

    if (!data || !user) return null;

    const currentShop = data.myShops?.find(s => s.shopId === data.activeShopId) || {
        shopId: data.activeShopId,
        name: data.settings?.billDesign?.shopName || 'My Business',
        role: 'owner'
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 px-3 h-10 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all">
                    <Store className="h-4 w-4 text-primary" />
                    <div className="flex flex-col items-start leading-none text-left hidden xs:block">
                        <span className="text-xs font-bold text-primary truncate max-w-[120px]">
                            {currentShop.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            {currentShop.role}
                        </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 p-2">
                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">
                    Switch Shop
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />

                {data.myShops?.map((shop) => (
                    <DropdownMenuItem
                        key={shop.shopId}
                        onClick={() => switchShop(shop.shopId)}
                        className={cn(
                            "flex items-center justify-between px-2 py-2 cursor-pointer rounded-md transition-colors",
                            shop.shopId === data.activeShopId ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold">{shop.name}</span>
                            <span className="text-[10px] opacity-70 uppercase font-bold">{shop.role}</span>
                        </div>
                        {shop.shopId === data.activeShopId && <Check className="h-4 w-4" />}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                    className="flex items-center gap-2 px-2 py-2 cursor-pointer focus:bg-primary focus:text-white group transition-all"
                    disabled // Multi-shop creation coming soon in next turn
                >
                    <div className="flex items-center justify-center h-5 w-5 rounded bg-muted group-focus:bg-white/20 transition-all">
                        <Plus className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-bold">Create New Shop</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
