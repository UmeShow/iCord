"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCharacters } from "../actions";
import { ICharacter, IUser } from "@/types";
import { Loader2, Plus, Search, UserPlus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import { getUserProfile, getFriendsList } from "../userActions";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<ICharacter[]>([]);
  const [friends, setFriends] = useState<IUser[]>([]);
  const [view, setView] = useState<'chats' | 'friends'>('chats'); // Toggle between Chat List and Friend List

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status !== "authenticated" || !session?.user) return;

    const discordId = (session.user as unknown as { id?: string }).id;
    if (!discordId) {
      setLoadError("ログイン情報の取得に失敗しました。もう一度ログインしてください。");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [chars, user] = await Promise.all([
          getCharacters(discordId),
          getUserProfile(discordId),
        ]);

        if (cancelled) return;
        setCharacters(chars || []);

        if (user?.friends && user.friends.length > 0) {
          try {
            const f = await getFriendsList(discordId);
            if (!cancelled) setFriends(f || []);
          } catch (e) {
            console.error("Failed to load friends:", e);
            if (!cancelled) setFriends([]);
          }
        } else {
          setFriends([]);
        }
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
        if (!cancelled) {
          setLoadError(
            "ダッシュボードのデータ読み込みに失敗しました。時間をおいて再読み込みしてください。"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    }
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/70" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full bg-background text-foreground p-6 flex items-center justify-center">
        <div className="w-full max-w-md rounded-lg border border-foreground/10 bg-foreground/5 p-5">
          <div className="text-sm font-semibold">読み込みに失敗しました</div>
          <div className="mt-2 text-sm text-foreground/70">{loadError}</div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition"
            >
              再読み込み
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-foreground/10 bg-background px-4 py-2 text-sm hover:bg-foreground/5 transition"
            >
              ホームへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-foreground/10 bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-base sm:text-lg font-semibold">ダッシュボード</h1>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex rounded-md border border-foreground/10 bg-foreground/5 px-3 py-1.5 text-sm hover:bg-foreground/10 transition"
            >
              開発者ポータル
            </a>
            <Link
              href="/dashboard/new"
              className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:bg-foreground/90 transition"
            >
              <Plus className="h-4 w-4" />
              新規
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 pb-3">
          <div className="inline-flex rounded-md border border-foreground/10 bg-foreground/5 p-1">
            <button
              onClick={() => setView("chats")}
              className={`px-3 py-1.5 text-sm rounded ${
                view === "chats" ? "bg-background shadow-sm" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              会話
            </button>
            <button
              onClick={() => setView("friends")}
              className={`px-3 py-1.5 text-sm rounded ${
                view === "friends" ? "bg-background shadow-sm" : "text-foreground/70 hover:text-foreground"
              }`}
            >
              フレンド
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-4 flex-1 overflow-y-auto">
        {view === "chats" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border border-foreground/10 bg-foreground/5 px-3 py-2">
              <Search className="h-4 w-4 text-foreground/60" />
              <input
                type="text"
                placeholder="会話を検索"
                className="w-full bg-transparent outline-none text-sm placeholder:text-foreground/50"
              />
            </div>

            {characters.length === 0 ? (
              <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-6">
                <div className="text-lg font-semibold">まだ会話はありません</div>
                <div className="mt-1 text-sm text-foreground/70">
                  AIフレンドを作成して会話を始めましょう。
                </div>
                <div className="mt-4">
                  <Link
                    href="/dashboard/new"
                    className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition"
                  >
                    <Plus className="h-4 w-4" />
                    フレンドを作成
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    className="text-left rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition p-4"
                    onClick={() => router.push(`/dashboard/${char.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-foreground/10 shrink-0 flex items-center justify-center">
                        {char.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={char.avatarUrl}
                            alt={char.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-sm font-semibold">{char.name.substring(0, 1)}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate font-semibold">{char.name}</div>
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              char.isActive ? "bg-foreground" : "bg-foreground/30"
                            }`}
                            title={char.isActive ? "有効" : "停止"}
                          />
                        </div>
                        <div className="truncate text-xs text-foreground/70">{char.nickname || "ニックネームなし"}</div>
                        <div className="truncate text-xs text-foreground/60 mt-1">
                          {char.exampleDialogue ? char.exampleDialogue.substring(0, 36) : "メッセージの例"}…
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-4">
              <div className="flex items-center gap-2 rounded-md border border-foreground/10 bg-background px-3 py-2">
                <UserPlus className="h-4 w-4 text-foreground/60" />
                <input
                  type="text"
                  placeholder="フレンドIDで検索 (@user_...)"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-foreground/50"
                />
              </div>
              <button
                className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/90 transition"
              >
                フレンド申請を送る
              </button>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">フレンド一覧</h2>
              <div className="text-sm text-foreground/60">{friends.length}人</div>
            </div>

            {friends.length === 0 ? (
              <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-6 text-center">
                <UserPlus className="h-8 w-8 mx-auto text-foreground/30 mb-2" />
                <div className="text-sm font-semibold">フレンドをまだ追加していません</div>
                <div className="text-xs text-foreground/60 mt-1">
                  上で検索してフレンド申請を送りましょう
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div 
                    key={friend.uid} 
                    className="rounded-lg border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 transition p-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-foreground/20 to-foreground/10 shrink-0 flex items-center justify-center overflow-hidden">
                        {friend.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={friend.avatarUrl}
                            alt={friend.displayName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="text-lg font-bold">
                            {friend.displayName ? friend.displayName.substring(0, 1).toUpperCase() : "?"}
                          </span>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate font-semibold text-sm">
                            {friend.displayName || "Unknown User"}
                          </div>
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        </div>
                        <div className="truncate text-xs text-foreground/60 mt-0.5">
                          @{friend.customId}
                        </div>
                        {friend.bio && (
                          <div className="line-clamp-1 text-xs text-foreground/70 mt-1">
                            {friend.bio}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => console.log("Chat with", friend.uid)}
                        className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition"
                      >
                        チャット
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
