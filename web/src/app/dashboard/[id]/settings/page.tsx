"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getCharacter, saveCharacter, deleteCharacter, wackCharacter } from "../../../actions"; // Adjusted path
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Save, ExternalLink, Power } from "lucide-react";
import Link from "next/link";
import { ICharacter, ConversationMode } from "@/types";
import ImageCropModal from "@/components/ImageCropModal";

export default function CharacterSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [wacking, setWacking] = useState(false);
  const [useDiscordBot, setUseDiscordBot] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ICharacter>>({
    name: "",
    nickname: "",
    botToken: "",
    clientId: "",
    errorMessage: "",
    aiTemperature: 0.9,
    aiTopP: 0.95,
    aiTopK: 40,
    aiMaxOutputTokens: 1024,
    personality: "",
    tone: "",
    goal: "",
    customRules: "",
    avatarUrl: "",
    isActive: true,
  });

  const resetAiParams = () => {
    setFormData((prev) => ({
      ...prev,
      aiTemperature: 0.9,
      aiTopP: 0.95,
      aiTopK: 40,
      aiMaxOutputTokens: 1024,
    }));
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated" && session?.user && params?.id) {
      const discordId = (session.user as unknown as { id?: string }).id;
      const characterId = String(params.id);
      if (!discordId) return;

      getCharacter(characterId, discordId).then((char) => {
        if (char) {
          setFormData(char);
          setUseDiscordBot(char.discordTokenRequired ?? false);
        } else {
          alert("Character not found or unauthorized.");
          router.push("/dashboard");
        }
        setLoading(false);
      });
    }
  }, [status, session, params, router]);

  const handleDelete = async () => {
    if (!params?.id) return;
    if (!confirm("本当にこのフレンドを削除しますか？この操作は取り消せません。\nAre you sure you want to delete this Friend?")) return;

    setDeleting(true);
    try {
      const discordId = (session?.user as unknown as { id?: string })?.id;
      if (!discordId) throw new Error("Unauthorized");
      await deleteCharacter(String(params.id), discordId);
        router.push('/dashboard');
    } catch (error) {
        console.error("Failed to delete", error);
        alert("Failed to delete Friend.");
        setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !params?.id) return;
    
    setSaving(true);
    try {
      const discordId = (session.user as unknown as { id?: string }).id;
      const characterId = String(params.id);
      if (!discordId) throw new Error("Unauthorized");
      
      const result = await saveCharacter(characterId, discordId, {
        ...formData,
        discordTokenRequired: useDiscordBot,
      });
      
      if (result.success) {
        alert("Saved successfully!");
      } else {
        alert("Failed to save. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleWack = async () => {
    if (!session?.user || !params?.id) return;

    setWacking(true);
    try {
      const discordId = (session.user as unknown as { id?: string }).id;
      if (!discordId) throw new Error("Unauthorized");

      const result = await wackCharacter(String(params.id), discordId);
      if (result.success) {
        alert("Wack requested. Bot will reload config and reset memory shortly.");
      } else {
        alert(result.error || "Failed to request wack.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to request wack.");
    } finally {
      setWacking(false);
    }
  };

  const handleAvatarFileChange = (file: File | null) => {
    if (!file) return;

    // Read file and show crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setCropImageUrl(imageUrl);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    setUploadingAvatar(true);
    setShowCropModal(false);
    setCropImageUrl(null);

    try {
      const fd = new FormData();
      fd.append("file", croppedImage, "avatar.jpg");

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



  if (loading) {
    return (
        <div className="h-full bg-background text-foreground p-8 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-foreground/25 border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background text-foreground p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <Link 
            href={`/dashboard/${params.id}`} 
            className="inline-flex items-center text-foreground/70 hover:text-foreground transition"
            >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
            </Link>
            
            {/* Active Toggle */}
            <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition border border-foreground/15 ${
                formData.isActive 
                ? 'bg-foreground text-background hover:bg-foreground/90' 
                : 'bg-foreground/5 text-foreground hover:bg-foreground/10'
              }`}
            >
                <Power className="h-4 w-4" />
                {formData.isActive ? t.newFriend.botActive : t.newFriend.botInactive}
            </button>
        </div>

          <div className="bg-foreground/5 border border-foreground/10 rounded-lg p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2 text-foreground">{t.newFriend.updateTitle}</h1>
            <p className="text-foreground/70">{t.newFriend.updateSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  {t.newFriend.nameLabel} <span className="text-foreground/50">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  {t.newFriend.nicknameLabel}
                </label>
                <input
                  type="text"
                  value={formData.nickname || ""}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                  placeholder={t.newFriend.nicknamePlaceholder}
                />
              </div>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                会話モード
              </label>
              <select
                value={formData.mode || ConversationMode.CASUAL}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as ConversationMode })}
                className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
              >
                <option value={ConversationMode.CASUAL}>CASUAL (日常会話)</option>
                <option value={ConversationMode.SHORT_STORY}>SHORT STORY (短編小説風)</option>
                <option value={ConversationMode.LONG_STORY}>LONG STORY (長編小説風)</option>
                <option value={ConversationMode.CRAZY}>CRAZY (クレイジー)</option>
                <option value={ConversationMode.CUSTOM}>CUSTOM (カスタム)</option>
              </select>
            </div>

            {formData.mode === ConversationMode.CUSTOM && (
              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  カスタムルール（任意）
                </label>
                <textarea
                  value={formData.customRules || ""}
                  onChange={(e) => setFormData({ ...formData, customRules: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition h-28 resize-none"
                  placeholder="例: 15単語以上言ってはいけません。\n例: 文中に必ず行動を描写すること。"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  ここに書いたルールを最優先で守ります（他の設定と矛盾する場合は、できるだけ両立するように解釈します）。
                </p>
              </div>
            )}





            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                {t.newFriend.avatarLabel}
              </label>
              <div className="flex gap-4 items-start">
                {formData.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={formData.avatarUrl} 
                    alt="Preview" 
                    className="w-12 h-12 rounded-full object-cover bg-background border border-foreground/10"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.avatarUrl || ""}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    placeholder={t.newFriend.avatarPlaceholder}
                  />
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                      画像ファイルをアップロード
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingAvatar}
                      onChange={(e) => handleAvatarFileChange(e.target.files?.[0] ?? null)}
                      className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    />
                    <p className="mt-2 text-xs text-foreground/60">
                      {uploadingAvatar ? "アップロード中..." : "PNG/JPG推奨（最大8MB）"}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-foreground/60">
                    Direct link to an image (PNG, JPG). Discord has strict rate limits for changing avatars.
                  </p>
                </div>
              </div>
            </div>

            {/* Personality & Tone */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    性別
                  </label>
                  <input
                    type="text"
                    value={formData.gender || ""}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    placeholder="例: 女性"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                    {t.newFriend.goalLabel} <span className="text-foreground/50">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.goal || ""}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  {t.newFriend.personalityLabel} <span className="text-foreground/50">*</span>
                </label>
                <textarea
                  required
                  value={formData.personality || ""}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition h-24 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  {t.newFriend.toneLabel} <span className="text-foreground/50">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tone || ""}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  外見・特徴
                </label>
                <textarea
                  value={formData.appearance || ""}
                  onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition h-24 resize-none"
                  placeholder="例: 銀髪のロングヘア。紫色の瞳。パーカーを着ている。"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  ストーリー・背景
                </label>
                <textarea
                  value={formData.story || ""}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition h-32 resize-none"
                  placeholder="例: {AI}は魔法の世界で生まれた冒険者。幼い頃にドラゴンに村を襲われ、復習の旅をしている。現在は人間界に紛れ込んで生活している。"
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
                  value={formData.exampleDialogue || ""}
                  onChange={(e) => setFormData({ ...formData, exampleDialogue: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition h-32 resize-none"
                  placeholder="ユーザー: こんにちは&#13;&#10;AI: こんにちは！今日はいい天気だね！"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                  エラー時の返信文
                </label>
                <textarea
                  value={formData.errorMessage || ""}
                  onChange={(e) => setFormData({ ...formData, errorMessage: e.target.value })}
                  className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition h-24 resize-none"
                  placeholder="例: ごめん、今ちょっと調子悪い…！少ししてからもう一回言ってね。"
                />
                <p className="mt-1 text-xs text-foreground/60">
                  コマンド実行失敗・返信生成失敗など、Bot側で例外が起きたときに返す文言です。空の場合はデフォルト文言になります。
                </p>
              </div>

              <div className="border-t border-foreground/10 pt-6">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <div className="text-sm font-bold text-foreground">AIパラメータ</div>
                    <div className="text-xs text-foreground/60">Botごとに生成の傾向を調整できます。</div>
                  </div>
                  <button
                    type="button"
                    onClick={resetAiParams}
                    className="px-3 py-2 rounded-md text-sm border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 transition"
                  >
                    デフォルトに戻す
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">Temperature</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="2"
                      value={formData.aiTemperature ?? 0.9}
                      onChange={(e) => setFormData({ ...formData, aiTemperature: Number(e.target.value) })}
                      className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    />
                    <p className="mt-1 text-xs text-foreground/60">高いほどランダム/創造的、低いほど安定。</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">Top P</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.aiTopP ?? 0.95}
                      onChange={(e) => setFormData({ ...formData, aiTopP: Number(e.target.value) })}
                      className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">Top K</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="100"
                      value={formData.aiTopK ?? 40}
                      onChange={(e) => setFormData({ ...formData, aiTopK: Number(e.target.value) })}
                      className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">Max Output Tokens</label>
                    <input
                      type="number"
                      step="64"
                      min="128"
                      max="8192"
                      value={formData.aiMaxOutputTokens ?? 1024}
                      onChange={(e) => setFormData({ ...formData, aiMaxOutputTokens: Number(e.target.value) })}
                      className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
                    />
                    <p className="mt-1 text-xs text-foreground/60">長文になりすぎる場合は下げてください。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-foreground/10 pt-6">
                <h3 className="text-lg font-bold text-foreground mb-4">{t.newFriend.discordIntegration}</h3>
                
                {/* Discord Bot Toggle */}
                <div className="mb-6 flex items-center justify-between p-3 rounded-md border border-foreground/10 bg-foreground/5">
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase mb-1">
                      Discord Botを使用する
                    </label>
                    <p className="text-xs text-foreground/60">
                      オフにするとWebアプリのみで会話可能
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
                    {/* Client ID Field */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-foreground/70 uppercase">
                          {t.newFriend.clientIdLabel} <span className="text-foreground">*</span>
                        </label>
                        <a 
                          href="https://discord.com/developers/applications" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-foreground hover:underline flex items-center gap-1"
                        >
                          Discord Developer Portal <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <input
                        type="text"
                        required={useDiscordBot}
                        value={formData.clientId || ""}
                        onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition font-mono"
                      />
                    </div>

                    {/* Bot Token Field */}
                    <div className="mb-6">
                      <label className="block text-xs font-bold text-foreground/70 uppercase mb-2">
                        {t.newFriend.tokenLabel} <span className="text-foreground">*</span>
                      </label>
                      <input
                        type="password"
                        required={useDiscordBot}
                        value={formData.botToken || ""}
                        onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                        className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition font-mono"
                      />
                    </div>
                  </>
                )}

                {!useDiscordBot && (
                  <div className="mb-6 p-3 rounded-md border border-foreground/10 bg-foreground/5 text-xs text-foreground/70">
                    <p className="font-bold mb-1">✓ Webアプリのみモード</p>
                    <p>Discord連携なしでWebアプリ側で完全に動作します。</p>
                  </div>
                )}
            </div>

            {/* Danger Zone */}
            <div className="border-t border-foreground/10 pt-6 mt-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Danger Zone</h3>
              <div className="flex items-center justify-between bg-background p-4 rounded-md border border-foreground/15">
                    <div>
                  <p className="text-sm text-foreground">このフレンドを完全に削除します。</p>
                  <p className="text-xs text-foreground/60">一度削除すると元に戻せません。</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                  className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium transition hover:bg-foreground/90 disabled:opacity-50"
                    >
                        {deleting ? '削除中...' : 'Friendを削除'}
                    </button>
                </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-foreground text-background font-medium py-3 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-foreground/90"
              >
                {saving ? (
                  <>
                    <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    {t.newFriend.updateSaving}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {t.newFriend.updateSave}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleWack}
                disabled={wacking}
                className="px-4 py-3 rounded-md text-sm font-medium transition border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {wacking ? "Wacking..." : "Wack"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Crop Modal */}
      {showCropModal && cropImageUrl && (
        <ImageCropModal
          imageUrl={cropImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false);
            setCropImageUrl(null);
          }}
        />
      )}
    </div>
  );
}
