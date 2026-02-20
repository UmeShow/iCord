import DashboardSidebar from "./Sidebar";
import MobileNav from "@/components/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#313338] text-white font-sans overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 bg-[#313338] flex flex-col min-w-0 relative">
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
        </div>
        <MobileNav />
      </div>
    </div>
  );
}