"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCharacters } from "../actions";
import { ICharacter } from "@/types";
import { Loader2, Plus, MessageSquare, Settings, Power, PowerOff } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [characters, setCharacters] = useState<ICharacter[]>([]);
  const { t, language, setLanguage } = useLanguage();

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
      <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t.dashboard.title}</h1>
            <p className="text-gray-400">{t.dashboard.subtitle}</p>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setLanguage(language === 'en' ? 'ja' : 'en')}
              className="text-sm font-medium text-gray-400 hover:text-white transition"
            >
              {language === 'en' ? '🇯🇵 日本語' : '🇺🇸 English'}
            </button>
            <div className="flex items-center gap-3 bg-gray-800 py-2 px-4 rounded-full">
               {session?.user?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full" />
               )}
               <span className="font-medium">{session?.user?.name}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* New Friend Card */}
          <Link 
            href="/dashboard/new"
            className="group flex flex-col items-center justify-center h-64 bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-2xl hover:bg-gray-800 hover:border-blue-500 transition-all cursor-pointer"
          >
            <div className="h-16 w-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus className="h-8 w-8 text-blue-500" />
            </div>
            <span className="text-lg font-semibold text-gray-300 group-hover:text-white">
              {t.dashboard.newFriend}
            </span>
          </Link>

          {/* Character Cards */}
          {characters.map((char) => (
            <div key={char.id} className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all flex flex-col">
              <div className="flex justify-between items-start mb-4">
                {char.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={char.avatarUrl} 
                    alt={char.name} 
                    className="h-12 w-12 rounded-xl object-cover bg-gray-700"
                  />
                ) : (
                  <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-xl font-bold">
                    {char.name[0]}
                  </div>
                )}
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                  char.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {char.isActive ? <Power className="h-3 w-3" /> : <PowerOff className="h-3 w-3" />}
                  {char.isActive ? t.dashboard.active : t.dashboard.inactive}
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-1">{char.name}</h3>
              <p className="text-gray-400 text-sm mb-6 line-clamp-2">{char.personality}</p>
              
              <div className="mt-auto flex gap-3">
                <Link 
                  href={`/dashboard/${char.id}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-medium transition"
                >
                  <Settings className="h-4 w-4" />
                  {t.dashboard.edit}
                </Link>
                {char.clientId && (
                  <a 
                    href={`https://discord.com/api/oauth2/authorize?client_id=${char.clientId}&permissions=8&scope=bot`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Invite
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {characters.length === 0 && (
          <div className="text-center mt-12 text-gray-500">
            <p>{t.dashboard.noFriends}</p>
          </div>
        )}
      </div>
    </div>
  );
}
