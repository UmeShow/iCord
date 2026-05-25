import DashboardSidebar from "./Sidebar";
import MobileNav from "@/components/MobileNav";

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</div>
        <MobileNav />
      </div>
    </div>
  );
}