"use client";

import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading" || status === "authenticated") {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0f172a] text-white">
            <Loader2 className="h-8 w-8 animate-spin text-[#5865F2]" />
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0f172a] to-[#1e1f22]">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex justify-center mb-8">
             <Image 
              src="/icon.png" 
              alt="iCord.me Logo" 
              width={80} 
              height={80} 
              className="rounded-2xl shadow-2xl shadow-indigo-500/20"
            />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to iCord.me
        </h1>
        
        <p className="text-gray-400 text-lg">
           Your personal AI companion for Discord.
        </p>

        <div className="pt-8">
            <button
                onClick={() => signIn("discord")}
                className="w-full px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl font-bold text-lg transition flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 group"
            >
                Login with Discord
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </button>
        </div>
      </div>
    </div>
  );
}

