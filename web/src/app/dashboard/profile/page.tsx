"use client";

import { useSession, signOut } from "next-auth/react";
import { User, LogOut, Settings, Mail, Shield, Zap } from "lucide-react";
import Image from "next/image";

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col h-full bg-[#313338]">
      {/* Top Bar */}
      <div className="h-12 bg-[#313338] border-b border-[#1f2023] flex items-center px-4 shadow-sm shrink-0 justify-between">
        <h1 className="font-bold text-gray-200">You</h1>
        <Settings className="w-5 h-5 text-gray-400" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* User Card */}
        <div className="bg-[#2b2d31] rounded-lg p-4 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-20 bg-[#5865F2]/20"></div>
          <div className="relative pt-8 flex flex-col items-center">
             <div className="relative">
                {session?.user?.image ? (
                    <Image 
                        src={session.user.image} 
                        alt="User" 
                        width={80} 
                        height={80} 
                        className="rounded-full ring-4 ring-[#2b2d31] bg-[#1e1f22]" 
                    />
                ) : (
                    <div className="w-20 h-20 bg-[#5865F2] rounded-full ring-4 ring-[#2b2d31] flex items-center justify-center">
                        <User className="w-10 h-10 text-white" />
                    </div>
                )}
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#23a559] rounded-full border-4 border-[#2b2d31]"></div>
             </div>
             <h2 className="mt-3 text-xl font-bold text-gray-100">{session?.user?.name || "Guest"}</h2>
             <p className="text-gray-400 text-sm">#{ (session?.user as any)?.id?.substring(0, 4) || "0000" }</p>
          </div>
        </div>

        {/* Status Settings */}
        <div className="bg-[#2b2d31] rounded-lg overflow-hidden mb-6">
            <div className="p-3 border-b border-[#1f2023] flex items-center gap-3 hover:bg-[#35373c] cursor-pointer transition">
                <div className="w-8 h-8 rounded-full bg-[#1e1f22] flex items-center justify-center">
                    <div className="w-3 h-3 bg-[#23a559] rounded-full"></div>
                </div>
                <div>
                    <div className="text-gray-200 font-medium text-sm">Online</div>
                </div>
            </div>
            <div className="p-3 flex items-center gap-3 hover:bg-[#35373c] cursor-pointer transition">
                 <div className="w-8 h-8 rounded-full bg-[#1e1f22] flex items-center justify-center">
                    <Zap className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                    <div className="text-gray-200 font-medium text-sm">Set Custom Status</div>
                </div>
            </div>
        </div>

        {/* Account Settings */}
        <h3 className="text-xs font-bold text-[#949ba4] uppercase mb-2 px-2">Account</h3>
        <div className="bg-[#2b2d31] rounded-lg overflow-hidden mb-6">
            <div className="p-3 border-b border-[#1f2023] flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                    <div className="text-gray-200 font-medium text-sm">Email</div>
                    <div className="text-xs text-gray-400 truncate">{session?.user?.email || "No email linked"}</div>
                </div>
            </div>
             <div className="p-3 flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <div className="flex-1 min-w-0">
                    <div className="text-gray-200 font-medium text-sm">Privacy & Safety</div>
                </div>
            </div>
        </div>

        <button 
            onClick={() => signOut()}
            className="w-full py-2 flex items-center justify-center gap-2 text-[#da373c] font-medium text-sm hover:underline"
        >
            <LogOut className="w-4 h-4" />
            Log Out
        </button>
      </div>
    </div>
  );
}
