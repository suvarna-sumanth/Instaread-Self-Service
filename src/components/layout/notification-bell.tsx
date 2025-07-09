'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, PartyPopper, CheckCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllDemos } from '@/services/demo-service';
import type { DemoConfig } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const VIEWED_INSTALLS_KEY = 'viewedInstallationIds';

export default function NotificationBell() {
    const [unreadNotifications, setUnreadNotifications] = useState<DemoConfig[]>([]);
    const [allInstalled, setAllInstalled] = useState<DemoConfig[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        const fetchAndSetNotifications = async () => {
            const allDemos = await getAllDemos();
            const installedDemos = allDemos
                .filter(demo => demo.isInstalled && demo.installedAt)
                .sort((a, b) => new Date(b.installedAt!).getTime() - new Date(a.installedAt!).getTime());
            
            setAllInstalled(installedDemos);
            
            const viewedIds: string[] = JSON.parse(localStorage.getItem(VIEWED_INSTALLS_KEY) || '[]');
            const newNotifications = installedDemos.filter(demo => !viewedIds.includes(demo.id));
            
            setUnreadNotifications(newNotifications);
            setUnreadCount(newNotifications.length);
        };
        
        fetchAndSetNotifications();
        
        const interval = setInterval(fetchAndSetNotifications, 30000); // every 30 seconds
        return () => clearInterval(interval);

    }, []);

    const handlePopoverOpenChange = (open: boolean) => {
        setIsPopoverOpen(open);
        if (open && unreadNotifications.length > 0) {
            const viewedIds: string[] = JSON.parse(localStorage.getItem(VIEWED_INSTALLS_KEY) || '[]');
            const newIds = unreadNotifications.map(demo => demo.id);
            const updatedViewedIds = [...new Set([...viewedIds, ...newIds])];
            localStorage.setItem(VIEWED_INSTALLS_KEY, JSON.stringify(updatedViewedIds));
            
            setUnreadCount(0);
        }
    };

    const handleViewAllClick = () => {
        setIsPopoverOpen(false);
        setIsSheetOpen(true);
    };

    return (
        <>
        <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                            {unreadCount}
                        </div>
                    )}
                    <span className="sr-only">Open notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="p-2">
                    <h3 className="font-medium px-2">Notifications</h3>
                </div>
                <Separator />
                {unreadNotifications.length > 0 ? (
                    <ScrollArea className="max-h-80">
                        <div className="p-2 space-y-2">
                            {unreadNotifications.slice(0, 5).map(demo => (
                                <div key={demo.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted">
                                    <PartyPopper className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p><span className="font-semibold">{demo.publication}</span> has installed the player.</p>
                                        <p className="text-xs text-muted-foreground/80 mt-1">
                                            {demo.installedAt ? formatDistanceToNow(new Date(demo.installedAt), { addSuffix: true }) : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="text-center text-sm text-muted-foreground p-8">
                        <p>No new notifications</p>
                    </div>
                )}
                <Separator />
                <div className="p-2">
                    <Button variant="link" size="sm" className="w-full" onClick={handleViewAllClick}>
                        View all notifications
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
        
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetContent className="w-[400px] sm:w-[480px]">
                <SheetHeader>
                    <SheetTitle>All Notifications</SheetTitle>
                    <SheetDescription>A history of all partner player installations.</SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] pr-6">
                    <div className="py-4 space-y-4">
                        {allInstalled.length > 0 ? (
                             allInstalled.map(demo => (
                                <div key={demo.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                    <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p><span className="font-semibold">{demo.publication}</span> successfully installed the player.</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            on {demo.installedAt ? new Date(demo.installedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric'}) : ''}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                             <div className="text-center text-sm text-muted-foreground pt-16">
                                <p>No installations recorded yet.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
        </>
    );
}
