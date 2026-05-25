"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createCharacter } from "../../actions";
import { ArrowLeft, Save, HelpCircle, ExternalLink, Bot, Sparkles } from "lucide-react";
import Link from "next/link";
import { ConversationMode } from "@/types";

export default function NewFriendPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [useDiscordBot, setUseDiscordBot] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [vibeInput, setVibeInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceImageBase64, setReferenceImageBase64] = useState<string | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    botToken: "",
    clientId: "",
    personality: "",
    tone: "",
    goal: "",
    customRules: "",
    avatarUrl: "",
    mode: "CASUAL",
    gender: "",
    appearance: "",
    story: "",
    exampleDialogue: "",
    discordTokenRequired: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    setLoading(true);
    try {
      const discordId = (session.user as unknown as { id?: string }).id;
      if (!discordId) throw new Error("Unauthorized");
      const result = await createCharacter(discordId, {
        ...formData,
        mode: formData.mode as ConversationMode,
        discordTokenRequired: useDiscordBot,
      });
      
      if (result.success) {
        router.push("/dashboard");
      } else {
        alert("作成に失敗しました。もう一度お試しください。");
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFileChange = async (file: File | null) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });

      const json = (await res.json()) as { url?: string; error?: string; detail?: string };
      if (!res.ok || !json.url) {
        throw new Error(`${res.status} ${res.statusText}: ${json.detail || json.error || "Upload failed"}`);
      }

      setFormData((prev) => ({ ...prev, avatarUrl: json.url! }));
    } catch (error) {
      console.error(error);
      alert(`アバター画像のアップロードに失敗しました。\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleGenerateCharacter = async () => {
    if (!vibeInput.trim()) {
      alert("雰囲気を入力してください。");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          vibe: vibeInput,
          referenceImage: referenceImageBase64,
        }),
        credentials: "same-origin",
      });

      const json = (await res.json()) as { success?: boolean; characterId?: string; character?: any; error?: string };
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || "生成に失敗しました");
      }

      if (json.characterId) {
        // Redirect to settings page to edit the generated character
        router.push(`/dashboard/${json.characterId}/settings`);
      }
    } catch (error) {
      console.error(error);
      alert(`キャラクター生成に失敗しました。\n${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReferenceImageChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setReferenceImageBase64(base64);
      setReferenceImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-foreground/70 hover:text-foreground mb-8 transition group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          ダッシュボードに戻る
        </Link>

        <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-6 md:p-8">
          <div className="mb-8">
            <div className="w-12 h-12 bg-foreground/10 rounded-xl flex items-center justify-center text-foreground mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold mb-2">新しいフレンドを作成</h1>
            <p className="text-foreground/70">
              Discord Botのトークンを入力して、AIフレンドに命を吹き込みましょう。
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/80 to-pink-500/80 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition text-white text-sm"
              >
                <Sparkles className="w-4 h-4" />
                ✨ おまかせで生成
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Discord Integration Section */}
            <div className="rounded-lg p-4 border border-foreground/10 bg-background">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase">
                <Bot className="w-4 h-4" />
                Discord連携設定
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 rounded-md border border-foreground/10 bg-foreground/5">
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase mb-1">
                      Discord Botを使用する
                    </label>
                    <p className="text-xs text-foreground/60">
                      オフにするとWebアプリのみで会話可能（コマンド機能も利用可）
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseDiscordBot(!useDiscordBot)}
                    className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors ${
                      useDiscordBot ? "bg-foreground" : "bg-foreground/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-background transition-transform ${
                        useDiscordBot ? "translate-x-9" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {useDiscordBot && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                        Bot Token <span className="text-foreground">*</span>
                      </label>
                      <input
                        type="password"
                        required={useDiscordBot}
                        value={formData.botToken}
                        onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                        className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition font-mono"
                        placeholder="MTE..."
                      />
                      <div className="mt-3 p-3 bg-foreground/5 border border-foreground/10 rounded-md text-xs text-foreground/80 space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          重要: Message Content Intentを有効にしてください
                        </p>
                        <p className="opacity-90">
                          Discord Developer Portalの「Bot」タブにある「Message Content Intent」をONにしないと、Botは会話できません。
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                        Client ID (Application ID) <span className="text-foreground">*</span>
                      </label>
                      <input
                        type="text"
                        required={useDiscordBot}
                        value={formData.clientId}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition font-mono"
                        placeholder="123456789..."
                      />
                      {formData.clientId && (
                        <div className="mt-3">
                          <a
                            href={`https://discord.com/api/oauth2/authorize?client_id=${formData.clientId}&permissions=68608&scope=bot`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-medium text-foreground hover:underline transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            このBotの招待リンクを開く（テスト用）
                          </a>
                          <p className="mt-1 text-xs text-foreground/60">
                            ※ Botをサーバーに追加するための招待URLです。
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {!useDiscordBot && (
                  <div className="p-3 rounded-md border border-foreground/10 bg-foreground/5 text-xs text-foreground/70">
                    <p className="font-bold mb-1">✓ Webアプリのみモード</p>
                    <p>Discord連携なしでWebアプリ側で完全に動作します。コマンド機能も利用可能です。</p>
                  </div>
                )}
              </div>
            </div>

            {/* Character Details */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  会話モード <span className="text-foreground">*</span>
                </label>
                <select
                  required
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition"
                >
                  <option value="CASUAL">CASUAL (日常会話)</option>
                  <option value="SHORT_STORY">SHORT STORY (短編小説風)</option>
                  <option value="LONG_STORY">LONG STORY (長編小説風)</option>
                  <option value="CRAZY">CRAZY (クレイジー)</option>
                  <option value="CUSTOM">CUSTOM (カスタム)</option>
                </select>
                <p className="mt-2 text-xs text-foreground/60">
                  AIの応答スタイルを決定します。
                </p>
              </div>

              {formData.mode === "CUSTOM" && (
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    カスタムルール（任意）
                  </label>
                  <textarea
                    value={formData.customRules}
                    onChange={(e) => setFormData({ ...formData, customRules: e.target.value })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition h-28 resize-none"
                    placeholder="例: 15単語以上言ってはいけません。\n例: 文中に必ず行動を描写すること。"
                  />
                  <p className="mt-2 text-xs text-foreground/60">
                    ここに書いたルールを最優先で守ります（他の設定と矛盾する場合は、できるだけ両立するように解釈します）。
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    キャラクター名 <span className="text-foreground">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    placeholder="例: 結月ゆかり"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    ニックネーム（呼び名）
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    placeholder="例: ゆかりん"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    性別
                  </label>
                  <input
                    type="text"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    placeholder="例: 女性"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    アバター画像のURL
                  </label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    placeholder="https://example.com/image.png"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    性格 <span className="text-foreground">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition h-32 resize-none"
                    placeholder="例: 明るくて元気。少しドジなところがある。ゲームが好き。"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    口調・話し方 <span className="text-foreground">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition h-32 resize-none"
                    placeholder="例: タメ口で話す。語尾に「〜だよ」「〜だね」をつける。絵文字をよく使う。"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  外見・特徴
                    <div className="mt-3">
                      <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                        画像ファイルをアップロード
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingAvatar}
                        onChange={(e) => handleAvatarFileChange(e.target.files?.[0] ?? null)}
                        className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition"
                      />
                      <p className="mt-2 text-xs text-foreground/60">
                        {uploadingAvatar ? "アップロード中..." : "PNG/JPG推奨（最大8MB）"}
                      </p>
                    </div>
                </label>
                <textarea
                  value={formData.appearance}
                  onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                  className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition h-24 resize-none"
                  placeholder="例: 銀髪のロングヘア。紫色の瞳。パーカーを着ている。"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  ストーリー・背景
                </label>
                <textarea
                  value={formData.story}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition h-32 resize-none"
                  placeholder="例: 魔法の世界で生まれた冒険者。幼い頃にドラゴンに村を襲われ、復習の旅をしている。"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  生い立ちや現在の状況など、キャラクターの背景情報を詳しく記述してください。
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  対話例
                </label>
                <textarea
                  value={formData.exampleDialogue}
                  onChange={(e) => setFormData({ ...formData, exampleDialogue: e.target.value })}
                  className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition h-32 resize-none"
                  placeholder="ユーザー: こんにちは&#13;&#10;AI: こんにちは！今日はいい天気だね！"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  目標・役割
                </label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20 transition"
                  placeholder="例: ユーザーの話し相手になる。プログラミングのサポートをする。"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-foreground/10 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md font-medium transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    フレンドを作成
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Generate Character Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-foreground/10 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-foreground">✨ キャラクター自動生成</h2>
              </div>
              
              <p className="text-sm text-foreground/70 mb-4">
                キャラクターの雰囲気を説明してください。その情報から各項目を自動生成します。
              </p>

              {/* Reference Image Upload */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  参考画像（オプション）
                </label>
                <p className="text-xs text-foreground/60 mb-2">
                  Geminiが画像を参照してキャラクターを生成します
                </p>
                
                {referenceImagePreview && (
                  <div className="mb-3 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={referenceImagePreview} 
                      alt="Reference" 
                      className="w-full h-32 object-cover rounded-md border border-foreground/10"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReferenceImageBase64(null);
                        setReferenceImagePreview(null);
                      }}
                      disabled={isGenerating}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  disabled={isGenerating}
                  onChange={(e) => handleReferenceImageChange(e.target.files?.[0] ?? null)}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-foreground/20 transition disabled:opacity-50"
                />
              </div>

              <textarea
                value={vibeInput}
                onChange={(e) => setVibeInput(e.target.value)}
                disabled={isGenerating}
                placeholder="例: 名前はゆめちゃん、女の子、自分が先輩、静かめ、ダウナー系、可愛い、身長は小さめ、色素薄め..."
                className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 outline-none focus:ring-2 focus:ring-foreground/20 transition h-24 resize-none mb-4 disabled:opacity-50"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setVibeInput("");
                    setReferenceImageBase64(null);
                    setReferenceImagePreview(null);
                  }}
                  disabled={isGenerating}
                  className="flex-1 px-4 py-2 rounded-md border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleGenerateCharacter}
                  disabled={isGenerating || !vibeInput.trim()}
                  className="flex-1 px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-500/90 hover:to-pink-500/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      生成して作成
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
