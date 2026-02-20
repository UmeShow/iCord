"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCharacters } from "../../actions";
import { ICharacter } from "@/types";
import { Loader2, Plus, LayoutDashboard, User as UserIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function MobileDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<ICharacter[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user) {
      const discordId = (session.user as any).id;
      if (discordId) {
        getCharacters(discordId).then((chars) => {
          setCharacters(chars);
          setLoading(false);
        });
      }
    }
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#313338] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#5865F2]" />
      </div>
    );
  }

  // This view is specifically for the "Dashboard" tab on Mobile (Management view)
  return (
    <div className="flex flex-col h-full bg-[#313338]">
        {/* Top Bar */}
        <div className="h-12 bg-[#313338] border-b border-[#1f2023] flex items-center px-4 shadow-sm shrink-0 justify-between">
          <h1 className="font-bold text-gray-200 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-gray-400" />
            Dashboard
          </h1>
          <Link href="/dashboard/new">
             <Plus className="w-6 h-6 text-[#5865F2]" />
          </Link>
        </div>

        <div className="p-4 overflow-y-auto flex-1 pb-20">
          <header className="mb-6">
            <div className="flex items-center gap-3 mb-2">
                {session?.user?.image ? (
                    <Image 
                        src={session.user.image} 
                        alt="User" 
                        width={40} 
                        height={40} 
                        className="rounded-full ring-2 ring-[#1f2023]" 
                    />
                ) : (
                    <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-white" />
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-bold text-gray-100">{session?.user?.name}</h2>
                    <p className="text-sm text-gray-400">Manage AI Friends</p>
                </div>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-3">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="bg-[#2b2d31] rounded-lg p-3 flex items-center gap-3 cursor-pointer active:bg-[#35373c] transition border border-[#1f2023]"
                  onClick={() => router.push(`/dashboard/${char.id}`)}
                >
                    <div className="relative shrink-0">
                        {char.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={char.avatarUrl} alt={char.name} className="w-12 h-12 rounded-full object-cover bg-[#1e1f22]" />
                        ) : (
                            <div className="w-12 h-12 bg-[#5865F2] rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {char.name.substring(0, 1)}
                            </div>
                        )}
                        <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#2b2d31] ${char.isActive ? 'bg-[#23a559]' : 'bg-[#da373c]'}`}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-200 truncate">{char.name}</h3>
                            {char.isActive && <span className="bg-[#5865F2] text-white text-[10px] px-1.5 py-0.5 rounded">BOT</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{char.tone || "No description"}</p>
                    </div>
                </div>
              ))}
              
              <Link
                href="/dashboard/new"
                className="mt-4 flex items-center justify-center p-3 border border-dashed border-[#5865F2] rounded-lg text-[#5865F2] hover:bg-[#5865F2]/10 transition font-medium gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New Friend
              </Link>
          </div>
        </div>
    </div>
  );
}
