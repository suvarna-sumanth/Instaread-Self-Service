
"use client";

import { columns } from "@/components/dashboard/columns";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DemoConfig } from "@/types";


export default function DashboardClient({ data }: { data: DemoConfig[] }) {
    return (
        <div className="container mx-auto py-10">
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
