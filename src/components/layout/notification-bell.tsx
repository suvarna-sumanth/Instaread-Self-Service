
'use client';

import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, PartyPopper } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getAllDemos } from '@/services/demo-service';
import type { DemoConfig } from '@/types';
import { formatDistanceToNow } from 'date-fns';

const VIEWED_INSTALLS_KEY = 'viewedInstallationIds';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<DemoConfig[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchAndSetNotifications = async () => {
            const allDemos = await getAllDemos();
            const installedDemos = allDemos.filter(demo => demo.isInstalled);
            
            const viewedIds: string[] = JSON.parse(localStorage.getItem(VIEWED_INSTALLS_KEY) || '[]');
            const newNotifications = installedDemos.filter(demo => !viewedIds.includes(demo.id));
            
            setNotifications(newNotifications);
            setUnreadCount(newNotifications.length);
        };
        
        fetchAndSetNotifications();
        
        // Optional: Poll for new notifications periodically
        const interval = setInterval(fetchAndSetNotifications, 60000); // every 60 seconds
        return () => clearInterval(interval);

    }, []);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && notifications.length > 0) {
            // Mark current notifications as read
            const viewedIds: string[] = JSON.parse(localStorage.getItem(VIEWED_INSTALLS_KEY) || '[]');
            const newIds = notifications.map(demo => demo.id);
            const updatedViewedIds = [...new Set([...viewedIds, ...newIds])];
            localStorage.setItem(VIEWED_INSTALLS_KEY, JSON.stringify(updatedViewedIds));
            
            // Optimistically update the UI
            setUnreadCount(0);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                    <span className="sr-only">Open notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Notifications</h3>
                    {notifications.length > 0 && (
                         <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setNotifications([])}>
                            Clear all
                         </Button>
                    )}
                </div>
                <Separator />
                {notifications.length > 0 ? (
                    <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
                        {notifications.map(demo => (
                             <div key={demo.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted">
                                <PartyPopper className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                                <div className="text-sm">
                                    <p className="font-semibold">{demo.publication}</p>
                                    <p className="text-muted-foreground">Successfully installed the player.</p>
                                    <p className="text-xs text-muted-foreground/80 mt-1">
                                       {demo.installedAt ? formatDistanceToNow(new Date(demo.installedAt), { addSuffix: true }) : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        <p>No new notifications</p>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
