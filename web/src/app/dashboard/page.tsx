"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCharacters } from "../actions";
import { ICharacter } from "@/types";
import { Loader2, Plus, Settings, Bot, LayoutDashboard, Search, Mail, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Dashboard() {
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

  return (
    <>
      {/* Mobile View: Discord-like Direct Message List */}
      <div className="md:hidden flex h-full bg-[#313338]">
          {/* Server Raid (Left Sidebar Strip) - Mimicking the reference image "Group" list */}
          <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 shrink-0 overflow-y-auto no-scrollbar">
               <div className="w-12 h-12 bg-[#5865F2] rounded-[16px] flex items-center justify-center text-white mb-2">
                   <Mail className="w-6 h-6" />
               </div>
               <div className="w-8 h-[2px] bg-[#35363C] rounded-lg mx-auto mb-2" />
               
               {/* Placeholder Groups mimicking the image */}
               <div className="w-12 h-12 bg-[#F97316] rounded-[24px] flex items-center justify-center text-white text-xs font-bold">Group</div>
               <div className="w-12 h-12 bg-[#D8B4FE] rounded-[24px] flex items-center justify-center text-white text-xs font-bold">Group</div>
               <div className="w-12 h-12 bg-[#22C55E] rounded-[24px] flex items-center justify-center text-white text-xs font-bold">Group</div>
               <div className="w-12 h-12 bg-[#A855F7] rounded-[24px] flex items-center justify-center text-white text-xs font-bold">Group</div>
               
               <div className="w-12 h-12 bg-[#313338] rounded-[24px] flex items-center justify-center text-[#23a559] hover:bg-[#23a559] hover:text-white transition cursor-pointer">
                   <Plus className="w-6 h-6" />
               </div>
          </div>

          {/* DM List Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#2b2d31] rounded-tl-[16px]">
              {/* Header */}
              <div className="h-12 border-b border-[#1f2023] flex items-center justify-between px-4 shadow-sm shrink-0">
                  <h1 className="font-bold text-gray-200">Direct Message</h1>
                  <div className="w-8 h-8 bg-[#1e1f22] rounded-full flex items-center justify-center text-gray-400">
                      <Search className="w-5 h-5" />
                  </div>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto p-2">
                  {characters.map((char) => (
                      <div 
                        key={char.id}
                        className="flex items-center gap-3 p-2 hover:bg-[#35373c] rounded cursor-pointer transition"
                        onClick={() => router.push(`/dashboard/${char.id}`)}
                      >
                          <div className="relative">
                            {char.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={char.avatarUrl} alt={char.name} className="w-10 h-10 rounded-full object-cover bg-[#1e1f22]" />
                            ) : (
                                <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center text-white font-bold">
                                    {char.name.substring(0, 1)}
                                </div>
                            )}
                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[3px] border-[#2b2d31] ${char.isActive ? 'bg-[#23a559]' : 'bg-gray-500'}`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-200 truncate flex items-center gap-1">
                                  {char.name}
                                  {char.isActive && <span className="bg-[#5865F2] text-white text-[9px] px-1 rounded h-3.5 flex items-center">BOT</span>}
                              </div>
                              <div className="text-xs text-gray-400 truncate">
                                  {/* Placeholder for last message or tone */}
                                  AI: {char.exampleDialogue ? char.exampleDialogue.substring(0, 20) : "Message Text test"}...
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  {characters.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-sm">
                          No chats yet. <Link href="/dashboard/new" className="text-[#00a8fc]">Create a friend</Link> to start!
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* Desktop View (Existing Layout) */}
      <div className="hidden md:flex flex-col h-full">
        {/* Top Bar */}
        <div className="h-12 bg-[#313338] border-b border-[#1f2023] flex items-center px-4 shadow-sm shrink-0 ml-12 md:ml-0">
          <h1 className="font-bold text-gray-200 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-gray-400" />
            Dashboard
          </h1>
          <div className="ml-auto flex items-center gap-4">
             <a 
                href="https://discord.com/developers/applications" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-medium text-gray-300 hover:text-white bg-[#1e1f22] px-3 py-1.5 rounded hover:bg-[#404249] transition hidden sm:block"
              >
                Discord Dev Portal
              </a>
          </div>
        </div>

        <div className="p-4 md:p-8 overflow-y-auto flex-1">
          <header className="mb-8">
            <h2 className="text-2xl font-bold mb-2 text-gray-100">Welcome back, {session?.user?.name}</h2>
            <p className="text-gray-400">Manage your AI friends and servers.</p>
             <div className="mt-4 sm:hidden">
                <a 
                    href="https://discord.com/developers/applications" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-gray-300 hover:text-white bg-[#1e1f22] px-3 py-2 rounded hover:bg-[#404249] transition inline-block"
                >
                    Discord Dev Portal
                </a>
             </div>
          </header>

          {characters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#2b2d31] rounded-lg border border-[#1f2023] border-dashed">
              <div className="w-16 h-16 bg-[#5865F2]/20 rounded-full flex items-center justify-center text-[#5865F2] mb-6">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-200">No Friends Yet</h3>
              <p className="text-gray-400 mb-8 text-center max-w-md px-4">
                Create your first AI friend to start chatting on Discord.
              </p>
              <Link
                href="/dashboard/new"
                className="px-6 py-3 bg-[#5865F2] text-white rounded-md font-medium hover:bg-[#4752C4] transition"
              >
                Create Friend
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="group bg-[#2b2d31] rounded-lg p-4 hover:bg-[#404249] transition duration-200 cursor-pointer border border-[#1f2023] hover:border-[#1f2023]"
                  onClick={() => router.push(`/dashboard/${char.id}`)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#1e1f22] overflow-hidden ring-2 ring-[#1e1f22] shrink-0">
                      {char.avatarUrl ? (
                        <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Bot className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-100 group-hover:underline decoration-2 decoration-[#5865F2] underline-offset-2 truncate">{char.name}</h3>
                      <p className="text-xs text-gray-400 truncate">{char.nickname || "No nickname"}</p>
                    </div>
                    <div className={`ml-auto w-3 h-3 rounded-full shrink-0 ${char.isActive ? 'bg-[#23a559]' : 'bg-gray-500'}`} title={char.isActive ? "Active" : "Inactive"} />
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1f2023]">
                    <span className="text-xs text-gray-400 font-mono bg-[#1e1f22] px-2 py-1 rounded">
                      {char.mode || "CASUAL"}
                    </span>
                    <Settings className="w-4 h-4 text-gray-400 group-hover:text-white transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
    </>
  );
}
