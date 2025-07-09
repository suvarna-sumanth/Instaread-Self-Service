
"use client";

import React, { useState, useEffect } from "react";
import { columns } from "@/components/dashboard/columns";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, X } from "lucide-react";
import type { DemoConfig } from "@/types";

const VIEWED_INSTALLS_KEY = 'viewedInstallationIds';

export default function DashboardClient({ data }: { data: DemoConfig[] }) {
    const [newInstalls, setNewInstalls] = useState<DemoConfig[]>([]);

    useEffect(() => {
        const viewedIds: string[] = JSON.parse(localStorage.getItem(VIEWED_INSTALLS_KEY) || '[]');
        const newlyInstalled = data.filter(demo => demo.isInstalled && !viewedIds.includes(demo.id));
        
        if (newlyInstalled.length > 0) {
            setNewInstalls(newlyInstalled);
        }
    }, [data]);
    
    const handleDismiss = () => {
        const viewedIds: string[] = JSON.parse(localStorage.getItem(VIEWED_INSTALLS_KEY) || '[]');
        const newIds = newInstalls.map(demo => demo.id);
        const updatedViewedIds = [...new Set([...viewedIds, ...newIds])];
        localStorage.setItem(VIEWED_INSTALLS_KEY, JSON.stringify(updatedViewedIds));
        setNewInstalls([]);
    }

    return (
        <div className="container mx-auto py-10">
            {newInstalls.length > 0 && (
                 <Alert className="mb-6 border-green-500/50 text-green-700 [&>svg]:text-green-700 relative pr-10">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle className="font-bold">
                       🎉 New Partner Installation{newInstalls.length > 1 ? 's' : ''}!
                    </AlertTitle>
                    <AlertDescription>
                        Congratulations! The following partner{newInstalls.length > 1 ? 's have' : ' has'} successfully installed the player:
                        <ul className="list-disc pl-5 mt-2 text-sm font-medium text-green-800">
                           {newInstalls.map(demo => (
                               <li key={demo.id}>
                                   <span className="font-semibold">{demo.publication}</span> ({demo.websiteUrl})
                               </li>
                           ))}
                        </ul>
                    </AlertDescription>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-7 w-7 text-green-700 hover:bg-green-100 hover:text-green-800"
                        onClick={handleDismiss}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </Alert>
            )}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Demos Dashboard</CardTitle>
                    <CardDescription>
                        A list of all the demos you have created.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable columns={columns} data={data} />
                </CardContent>
            </Card>
        </div>
    );
}
