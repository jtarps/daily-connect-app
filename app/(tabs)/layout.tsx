import BottomNav from "@/components/daily-connect/bottom-nav";
import Header from "@/components/daily-connect/header";

export default function TabsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
