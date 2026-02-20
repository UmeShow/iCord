"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getCharacters } from "../actions";
import { ICharacter } from "@/types";
import { Plus, Home, LayoutDashboard, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardSidebar() {
  const { data: session, status } = useSession();
  const [characters, setCharacters] = useState<ICharacter[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const discordId = (session.user as any).id;
      if (discordId) {
        getCharacters(discordId).then((chars) => {
          setCharacters(chars);
        });
      }
    }
  }, [status, session]);

  return (
    <>
      {/* Mobile Menu Button (Visible only on mobile) */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-[#1e1f22] rounded-md text-gray-200"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar (Discord-like) */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-[72px] bg-[#1e1f22] flex flex-col items-center gap-2 shrink-0 transition-transform duration-300 ease-in-out
        pt-16 pb-3 md:py-3 md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Link href="/" className="w-12 h-12 bg-[#313338] rounded-[24px] hover:rounded-[16px] hover:bg-[#5865F2] transition-all duration-200 flex items-center justify-center group mb-2">
          <Home className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
        </Link>
        
        <div className="w-8 h-[2px] bg-[#35363C] rounded-lg mx-auto mb-2" />

        <Link 
          href="/dashboard"
          className={`w-12 h-12 rounded-[16px] flex items-center justify-center shadow-lg transition-all duration-200 group ${pathname === '/dashboard' ? 'bg-[#5865F2] text-white' : 'bg-[#313338] text-gray-400 hover:bg-[#5865F2] hover:text-white'}`}
        >
          <LayoutDashboard className="w-6 h-6" />
        </Link>

        {/* Character Icons */}
        <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-2 scrollbar-hide pt-2">
            {characters.map((char) => {
              const isActive = pathname === `/dashboard/${char.id}`;
              return (
                <Link 
                    key={char.id} 
                    href={`/dashboard/${char.id}`}
                    className={`w-12 h-12 rounded-[24px] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center group overflow-hidden relative shrink-0 ${isActive ? 'rounded-[16px] ring-2 ring-white/20' : 'bg-[#313338]'}`}
                    title={char.name}
                >
                    {char.avatarUrl ? (
                    <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                    <span className="text-xs font-bold text-gray-400 group-hover:text-white">
                        {char.name.substring(0, 2)}
                    </span>
                    )}
                </Link>
              );
            })}
             <Link 
            href="/dashboard/new"
            className="w-12 h-12 bg-[#313338] rounded-[24px] hover:rounded-[16px] hover:bg-[#23a559] transition-all duration-200 flex items-center justify-center group mt-2 shrink-0"
            title="Add New Friend"
            >
            <Plus className="w-6 h-6 text-[#23a559] group-hover:text-white transition-colors" />
            </Link>
        </div>
      </div>
    </>
  );
}