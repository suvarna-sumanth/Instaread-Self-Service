
import { getAllDemos } from "@/services/demo-service";
import { columns } from "@/components/dashboard/columns";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
    const demos = await getAllDemos();

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
                    <DataTable columns={columns} data={demos} />
                </CardContent>
            </Card>
        </div>
    );
}
