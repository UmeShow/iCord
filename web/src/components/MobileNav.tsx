"use client";

import { Home, LayoutDashboard, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileNav() {
  const pathname = usePathname();

  // Hide on chat detail page and landing page
  if (pathname === "/" || (pathname.startsWith("/dashboard/") && pathname.split("/").length > 2 && pathname !== "/dashboard/profile")) {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1e1f22] border-t border-[#1f2023] flex items-center justify-around z-50 pb-safe">
      <Link 
        href="/dashboard"
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            pathname === "/dashboard" ? "text-white" : "text-[#949ba4] hover:text-[#dbdee1]"
        }`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] font-medium">Home</span>
      </Link>
      
      <Link 
        href="/dashboard/manage" 
        // Note: I'll likely need to create a separate 'manage' route or use query param to distinguish "Home" (Chat list) vs "Dashboard" (Bot management)
        // For now, let's point "Dashboard" to a management view and "Home" to the chat list view.
        // Actually, the current /dashboard basically does both (lists bots). 
        // Let's make:
        // /dashboard -> Home (Chat List style on mobile)
        // /dashboard/manage -> Dashboard (Grid style on mobile)
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            pathname === "/dashboard/manage" ? "text-white" : "text-[#949ba4] hover:text-[#dbdee1]"
        }`}
      >
        <LayoutDashboard className="w-6 h-6" />
        <span className="text-[10px] font-medium">Dashboard</span>
      </Link>

      <Link 
        href="/dashboard/profile"
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            pathname === "/dashboard/profile" ? "text-white" : "text-[#949ba4] hover:text-[#dbdee1]"
        }`}
      >
        <User className="w-6 h-6" />
        <span className="text-[10px] font-medium">You</span>
      </Link>
    </div>
  );
}
