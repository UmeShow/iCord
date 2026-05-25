"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getCharacter, generateAIResponse, saveMessage, getChatHistory } from "../../actions";
import { ICharacter } from "@/types";
import { ArrowLeft, Settings, Users, PlusCircle, Send, X, Zap, RotateCcw, Gamepad2, Brain, Users as UsersIcon } from "lucide-react";
import Image from "next/image";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  
  const [character, setCharacter] = useState<ICharacter | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberListOpen, setMemberListOpen] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  
  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model'; parts: string; image?: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isExecutingCommand, setIsExecutingCommand] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [chatHistory, isChatLoading, selectedImage]);

  // Load Character & History
  useEffect(() => {
    if (status === "authenticated" && session?.user && params?.id) {
            const discordId = (session.user as unknown as { id?: string }).id;
            const characterId = String(params.id);
            if (!discordId) return;

      getCharacter(characterId, discordId).then((char) => {
        if (char) {
          setCharacter(char);
          // Load chat history
          getChatHistory(characterId, discordId).then(history => {
              if (history && history.length > 0) {
                  setChatHistory(history.map(m => ({ role: m.role, parts: m.parts, image: m.image })));
              }
          });
        } else {
          router.push("/dashboard");
        }
        setLoading(false);
      });
    } else if (status === "unauthenticated") {
        router.push("/");
    }
  }, [status, session, params, router]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCommandExecute = async (command: string) => {
    if (!character || isExecutingCommand) return;

    setIsExecutingCommand(true);
    try {
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          characterId: character.id,
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = (await response.json()) as { success?: boolean; response?: string; error?: string };
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.response) {
        // Add system message to chat
        setChatHistory(prev => [...prev, { role: 'model', parts: `[${command}] ${data.response}` }]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Command error:", errorMessage);
      setChatHistory(prev => [...prev, { role: 'model', parts: `エラー: ${errorMessage}` }]);
    } finally {
      setIsExecutingCommand(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !selectedImage) || isChatLoading || !character || !session?.user) return;

    const userMessage = chatInput;
    const currentImage = selectedImage;
    const discordId = (session.user as unknown as { id?: string }).id;
    if (!discordId) return;
    const characterId = character.id!;

    setChatInput(""); // Clear input immediately
    setSelectedImage(null); // Clear image
    
    // Optimistic Update
    const newHistory = [...chatHistory, { role: 'user' as const, parts: userMessage, image: currentImage || undefined }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    try {
      // Save User Message
      await saveMessage(characterId, discordId, 'user', userMessage, currentImage || undefined);

      // Check for slash commands (Web-side implementation placeholder)
      if (userMessage.startsWith('/')) {
         // Logic for /wack or other commands would go here
      }

      const response = await generateAIResponse(
        userMessage, 
        newHistory.map(h => ({ role: h.role, parts: h.parts })), 
        character.systemInstruction,
        currentImage || undefined,
        { 
          nsfwEnabled: character.nsfwEnabled, 
          userName: session.user.name || "User",
          maxTokens: character.aiMaxOutputTokens || 512,
          temperature: character.aiTemperature || 0.9,
        }
      );
      
      // Save Model Response
      await saveMessage(characterId, discordId, 'model', response);

      setChatHistory(prev => [...prev, { role: 'model', parts: response }]);
    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { role: 'model', parts: "Error: Could not generate response." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (loading || !character) {
     return (
                <div className="h-full bg-background text-foreground p-8 flex items-center justify-center">
                    <div className="h-8 w-8 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
        </div>
    );
  }

  return (
        <div className="flex h-full overflow-hidden bg-background text-foreground relative">
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="sticky top-0 z-10 border-b border-foreground/10 bg-background/90 backdrop-blur">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="inline-flex items-center gap-2 rounded-md border border-foreground/10 bg-foreground/5 px-2.5 py-1.5 text-sm hover:bg-foreground/10 transition"
                            aria-label="Back"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">戻る</span>
                        </button>

                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-full overflow-hidden bg-foreground/10 shrink-0 flex items-center justify-center">
                                {character.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={character.avatarUrl} alt={character.name} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-sm font-semibold">{character.name.substring(0, 1)}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="font-semibold truncate">{character.name}</div>
                                {character.tone && <div className="text-xs text-foreground/60 truncate">{character.tone}</div>}
                            </div>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setMemberListOpen(true)}
                                className="lg:hidden inline-flex items-center gap-2 rounded-md border border-foreground/10 bg-foreground/5 px-2.5 py-1.5 text-sm hover:bg-foreground/10 transition"
                                aria-label="Details"
                            >
                                <Users className="h-4 w-4" />
                                <span className="hidden sm:inline">詳細</span>
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/${params?.id}/settings`)}
                                className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:bg-foreground/90 transition"
                            >
                                <Settings className="h-4 w-4" />
                                設定
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-6">
                    {chatHistory.length === 0 && (
                        <div className="max-w-2xl mx-auto mb-6 rounded-lg border border-foreground/10 bg-foreground/5 p-4 text-sm text-foreground/70">
                            {character.name} と会話を始めましょう。メッセージや画像を送れます。
                        </div>
                    )}

                    <div className="max-w-2xl mx-auto space-y-4">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className="flex gap-3">
                                <div className="shrink-0 mt-0.5">
                                    {msg.role === "user" ? (
                                        session?.user?.image ? (
                                            <Image src={session.user.image} alt="User" width={36} height={36} className="rounded-full" />
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-semibold">
                                                U
                                            </div>
                                        )
                                    ) : character.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={character.avatarUrl} alt="Bot" className="h-9 w-9 rounded-full object-cover" />
                                    ) : (
                                        <div className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center text-sm font-semibold">
                                            AI
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-sm font-semibold truncate">
                                            {msg.role === "user" ? session?.user?.name || "User" : character.name}
                                        </span>
                                        <span className="text-xs text-foreground/50 select-none">
                                            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                    </div>

                                    <div className="mt-1 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                                        {msg.image && (
                                            <div className="mb-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={msg.image} alt="Uploaded content" className="max-w-full sm:max-w-xs max-h-60 rounded-md border border-foreground/10" />
                                            </div>
                                        )}
                                        {msg.parts}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isChatLoading && (
                            <div className="text-sm text-foreground/60">返信を生成中…</div>
                        )}

                        <div ref={chatEndRef} className="h-2" />
                    </div>
                </div>

                {/* Composer */}
                <div className="shrink-0 border-t border-foreground/10 bg-background/90 backdrop-blur p-3 mb-safe-area-bottom">
                    <div className="max-w-2xl mx-auto">
                        {selectedImage && (
                            <div className="mb-3">
                                <div className="relative inline-block rounded-lg border border-foreground/10 bg-foreground/5 p-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={selectedImage} alt="Selected" className="h-32 w-auto object-contain rounded-md" />
                                    <button
                                        onClick={() => setSelectedImage(null)}
                                        className="absolute -top-2 -right-2 rounded-full border border-foreground/10 bg-background p-1 hover:bg-foreground/5 transition"
                                        aria-label="Remove image"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />

                        <div className="flex items-end gap-2 rounded-lg border border-foreground/10 bg-background px-3 py-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center justify-center rounded-md border border-foreground/10 bg-foreground/5 p-2 hover:bg-foreground/10 transition"
                                aria-label="Attach image"
                            >
                                <PlusCircle className="h-5 w-5" />
                            </button>

                            <form onSubmit={handleChatSubmit} className="flex-1 flex items-end gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={`${character.name} にメッセージ`}
                                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-foreground/50 py-2"
                                    disabled={isChatLoading}
                                    autoComplete="off"
                                />
                                
                                {/* Commands Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowCommands(!showCommands)}
                                        className="inline-flex items-center justify-center rounded-md border border-foreground/10 bg-foreground/5 hover:bg-foreground/10 p-2 transition"
                                        title="コマンド"
                                    >
                                        <span className="text-lg">/</span>
                                    </button>

                                    {showCommands && (
                                        <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-foreground/10 bg-background shadow-lg z-50">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleCommandExecute("/wack");
                                                    setShowCommands(false);
                                                }}
                                                disabled={isExecutingCommand}
                                                className="w-full text-left inline-flex items-center gap-2 rounded-t-md hover:bg-foreground/5 disabled:opacity-50 px-3 py-2 text-xs font-medium transition"
                                                title="メモリをリセット"
                                            >
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                <span>リセット</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleCommandExecute("/shiritori");
                                                    setShowCommands(false);
                                                }}
                                                disabled={isExecutingCommand}
                                                className="w-full text-left inline-flex items-center gap-2 hover:bg-foreground/5 disabled:opacity-50 px-3 py-2 text-xs font-medium transition border-t border-foreground/10"
                                                title="しりとりゲーム"
                                            >
                                                <Brain className="h-3.5 w-3.5" />
                                                <span>しりとり</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleCommandExecute("/tictactoe");
                                                    setShowCommands(false);
                                                }}
                                                disabled={isExecutingCommand}
                                                className="w-full text-left inline-flex items-center gap-2 hover:bg-foreground/5 disabled:opacity-50 px-3 py-2 text-xs font-medium transition border-t border-foreground/10"
                                                title="マルバツゲーム"
                                            >
                                                <Gamepad2 className="h-3.5 w-3.5" />
                                                <span>マルバツ</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleCommandExecute("/yesno");
                                                    setShowCommands(false);
                                                }}
                                                disabled={isExecutingCommand}
                                                className="w-full text-left inline-flex items-center gap-2 hover:bg-foreground/5 disabled:opacity-50 px-3 py-2 text-xs font-medium transition border-t border-foreground/10"
                                                title="Yes/No質問"
                                            >
                                                <Zap className="h-3.5 w-3.5" />
                                                <span>Yes/No</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleCommandExecute("/wordwolf");
                                                    setShowCommands(false);
                                                }}
                                                disabled={isExecutingCommand}
                                                className="w-full text-left inline-flex items-center gap-2 rounded-b-md hover:bg-foreground/5 disabled:opacity-50 px-3 py-2 text-xs font-medium transition border-t border-foreground/10"
                                                title="ワードウルフゲーム"
                                            >
                                                <UsersIcon className="h-3.5 w-3.5" />
                                                <span>ワードウルフ</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={(!chatInput.trim() && !selectedImage) || isChatLoading}
                                    className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 transition"
                                    aria-label="Send"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Details Panel */}
            <aside className="hidden lg:flex w-72 shrink-0 border-l border-foreground/10 bg-background/50 p-4 overflow-y-auto">
                <div className="space-y-3">
                    <div className="text-sm font-semibold">詳細</div>
                    <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-3">
                        <div className="text-xs text-foreground/60">AIフレンド</div>
                        <div className="mt-1 font-semibold truncate">{character.name}</div>
                        {character.tone && <div className="mt-1 text-sm text-foreground/70 break-words">{character.tone}</div>}
                        <button
                            className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:bg-foreground/90 transition"
                            onClick={() => router.push(`/dashboard/${params?.id}/settings`)}
                        >
                            設定を開く
                        </button>
                    </div>

                    <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-3">
                        <div className="text-xs text-foreground/60">ユーザー</div>
                        <div className="mt-1 font-semibold truncate">{session?.user?.name}</div>
                        <div className="text-sm text-foreground/70 truncate">{session?.user?.email}</div>
                    </div>
                </div>
            </aside>

            {/* Mobile Details Drawer */}
            {memberListOpen && (
                <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMemberListOpen(false)}>
                    <div className="absolute inset-0 bg-black/40" />
                    <div
                        className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-background border-l border-foreground/10 p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div className="font-semibold">詳細</div>
                            <button
                                className="rounded-md border border-foreground/10 bg-foreground/5 p-2 hover:bg-foreground/10 transition"
                                onClick={() => setMemberListOpen(false)}
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-3">
                                <div className="text-xs text-foreground/60">AIフレンド</div>
                                <div className="mt-1 font-semibold truncate">{character.name}</div>
                                {character.tone && <div className="mt-1 text-sm text-foreground/70 break-words">{character.tone}</div>}
                                <button
                                    className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:bg-foreground/90 transition"
                                    onClick={() => router.push(`/dashboard/${params?.id}/settings`)}
                                >
                                    設定を開く
                                </button>
                            </div>

                            <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-3">
                                <div className="text-xs text-foreground/60">ユーザー</div>
                                <div className="mt-1 font-semibold truncate">{session?.user?.name}</div>
                                <div className="text-sm text-foreground/70 truncate">{session?.user?.email}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
  );
}


