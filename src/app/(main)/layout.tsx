
import Header from "@/components/layout/header";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main>{children}</main>
        </div>
    );
}
