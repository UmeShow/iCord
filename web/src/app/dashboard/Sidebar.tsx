"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { getCharacters } from "../actions";
import { ICharacter } from "@/types";
import { Home, LayoutDashboard, Plus, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardSidebar() {
  const { data: session, status } = useSession();
  const [characters, setCharacters] = useState<ICharacter[]>([]);
  const pathname = usePathname();

  const discordId = useMemo(() => {
    return (session?.user as unknown as { id?: string } | undefined)?.id;
  }, [session]);

  const activeCharacterId = useMemo(() => {
    if (!pathname?.startsWith("/dashboard/")) return null;
    const parts = pathname.split("/").filter(Boolean);
    // /dashboard/[id] or /dashboard/[id]/settings
    return parts.length >= 2 ? parts[1] : null;
  }, [pathname]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (discordId) {
        getCharacters(discordId).then((chars) => {
          setCharacters(chars);
        });
      }
    }
  }, [status, session, discordId]);

  return (
    <>
      {/* Desktop Sidebar (simple, non-Discord) */}
      <aside className="hidden md:flex w-72 shrink-0 border-r border-foreground/10 bg-background/50">
        <div className="flex h-full w-full flex-col p-4 gap-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="iCord" className="h-5 w-5" />
              <span>iCord</span>
            </Link>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:bg-foreground/90 transition"
            >
              <Plus className="h-4 w-4" />
              新規
            </Link>
          </div>

          <nav className="space-y-1">
            <Link
              href="/"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition border border-transparent ${
                pathname === "/" ? "bg-foreground/10" : "hover:bg-foreground/5"
              }`}
            >
              <Home className="h-4 w-4" />
              ホーム
            </Link>
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition border border-transparent ${
                pathname === "/dashboard" ? "bg-foreground/10" : "hover:bg-foreground/5"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              ダッシュボード
            </Link>
            <Link
              href="/dashboard/manage"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition border border-transparent ${
                pathname === "/dashboard/manage" ? "bg-foreground/10" : "hover:bg-foreground/5"
              }`}
            >
              <Settings className="h-4 w-4" />
              管理
            </Link>
            <Link
              href="/dashboard/profile"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition border border-transparent ${
                pathname === "/dashboard/profile" ? "bg-foreground/10" : "hover:bg-foreground/5"
              }`}
            >
              <User className="h-4 w-4" />
              マイページ
            </Link>
          </nav>

          <div className="pt-2">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold text-foreground/70">AIフレンド</div>
              <div className="text-xs text-foreground/50">{characters.length}</div>
            </div>

            {status === "authenticated" && !discordId && (
              <div className="mb-2 rounded-md border border-foreground/10 bg-foreground/5 p-3 text-xs text-foreground/70">
                ログイン情報の取得に失敗しました。いったんログアウト→再ログインしてください。
              </div>
            )}

            <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1 space-y-1">
              {characters.map((char) => {
                const isActive = activeCharacterId === char.id;
                return (
                  <Link
                    key={char.id}
                    href={`/dashboard/${char.id}`}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition border border-transparent ${
                      isActive ? "bg-foreground/10" : "hover:bg-foreground/5"
                    }`}
                    title={char.name}
                  >
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-foreground/10 shrink-0 flex items-center justify-center">
                      {char.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={char.avatarUrl} alt={char.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold">{char.name.substring(0, 1)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{char.name}</div>
                      <div className="truncate text-xs text-foreground/60">{char.nickname || "ニックネームなし"}</div>
                    </div>
                    <div
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        char.isActive ? "bg-foreground" : "bg-foreground/30"
                      }`}
                      title={char.isActive ? "有効" : "停止"}
                    />
                  </Link>
                );
              })}

              {characters.length === 0 && (
                <div className="rounded-md border border-foreground/10 bg-foreground/5 p-3 text-sm text-foreground/70">
                  まだフレンドがいません。右上の「新規」から作成できます。
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-foreground/10">
            <div className="text-xs text-foreground/70 truncate">
              {status === "authenticated" ? session?.user?.name : ""}
            </div>
            <div className="text-xs text-foreground/50 truncate">
              {status === "authenticated" ? session?.user?.email : ""}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}