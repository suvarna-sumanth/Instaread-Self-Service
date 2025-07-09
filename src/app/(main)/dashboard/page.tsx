
import { getAllDemos } from "@/services/demo-service";
import DashboardClient from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
    const demos = await getAllDemos();
    return <DashboardClient data={demos} />;
}
