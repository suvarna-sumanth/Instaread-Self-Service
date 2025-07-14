"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { DemoConfig } from "@/types";

import { db } from "@/lib/firebase-client";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

const VIEWED_INSTALLS_KEY = "viewedInstallationIds";

export default function NotificationBell() {
  const [allInstalled, setAllInstalled] = useState<DemoConfig[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  // Fetch installed demos and initialize viewedIds
  useEffect(() => {
    const localViewedIds: string[] = JSON.parse(
      localStorage.getItem(VIEWED_INSTALLS_KEY) || "[]"
    );
    setViewedIds(localViewedIds);

    const q = query(
      collection(db, "demos"),
      where("isInstalled", "==", true),
      orderBy("installedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const installedDemos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DemoConfig[];
      setAllInstalled(installedDemos);
    });

    return () => unsubscribe();
  }, []);

  // Listen for localStorage changes across tabs
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === VIEWED_INSTALLS_KEY) {
        const updatedViewedIds = JSON.parse(event.newValue || "[]");
        setViewedIds(updatedViewedIds);
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Recalculate unread count whenever allInstalled or viewedIds changes
  useEffect(() => {
    const newNotifications = allInstalled.filter(
      (demo) => !viewedIds.includes(demo.id)
    );
    setUnreadCount(newNotifications.length);
  }, [allInstalled, viewedIds]);

  // Optionally re-read localStorage when opening the sheet
  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      const allCurrentIds = allInstalled.map((demo) => demo.id);
      localStorage.setItem(VIEWED_INSTALLS_KEY, JSON.stringify(allCurrentIds));
      setViewedIds(allCurrentIds);
    } else {
      // Always sync viewedIds in case another tab updated it
      const localViewedIds: string[] = JSON.parse(
        localStorage.getItem(VIEWED_INSTALLS_KEY) || "[]"
      );
      setViewedIds(localViewedIds);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => handleSheetOpenChange(true)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
            {unreadCount}
          </div>
        )}
        <span className="sr-only">Open notifications</span>
      </Button>

      <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
        {isSheetOpen && (
          <SheetContent className="w-[400px] sm:w-[480px]">
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
              <SheetDescription>
                A history of all partner player installations.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-8rem)] pr-6">
              <div className="py-4 space-y-4">
                {allInstalled.length > 0 ? (
                  allInstalled.map((demo) => {
                    const isUnread = !viewedIds.includes(demo.id);
                    return (
                      <div
                        key={demo.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                          isUnread
                            ? "bg-primary/10 border-primary/20"
                            : "bg-muted/50"
                        )}
                      >
                        <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
                        <div className="text-sm">
                          <p>
                            <span className="font-semibold">
                              {demo.publication}
                            </span>{" "}
                            successfully installed the player.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            on{" "}
                            {demo.installedAt
                              ? new Date(demo.installedAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-sm text-muted-foreground pt-16">
                    <p>No installations recorded yet.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
