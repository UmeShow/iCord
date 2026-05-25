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
      const discordId = (session.user as unknown as { id?: string }).id;
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
      <div className="flex h-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/70" />
      </div>
    );
  }

  // This view is specifically for the "Dashboard" tab on Mobile (Management view)
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 border-b border-foreground/10 bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            管理
          </h1>
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:bg-foreground/90 transition"
          >
            <Plus className="w-4 h-4" />
            新規
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-4 flex-1 overflow-y-auto pb-20">
        <header className="mb-4">
          <div className="flex items-center gap-3">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt="User"
                width={40}
                height={40}
                className="rounded-full border border-foreground/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate">{session?.user?.name}</h2>
              <p className="text-sm text-foreground/70">AIフレンドの管理</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {characters.map((char) => (
            <button
              key={char.id}
              className="text-left rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition p-4"
              onClick={() => router.push(`/dashboard/${char.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-foreground/10 flex items-center justify-center">
                    {char.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base font-semibold">{char.name.substring(0, 1)}</span>
                    )}
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-background ${
                      char.isActive ? "bg-foreground" : "bg-foreground/30"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{char.name}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-foreground/10 text-foreground/70">
                      {char.mode || "CASUAL"}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/70 truncate">{char.tone || ""}</p>
                </div>
              </div>
            </button>
          ))}

          <Link
            href="/dashboard/new"
            className="sm:col-span-2 rounded-lg border border-dashed border-foreground/20 bg-foreground/5 hover:bg-foreground/10 transition p-4 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            新しいフレンドを作成
          </Link>
        </div>
      </div>
    </div>
  );
}
