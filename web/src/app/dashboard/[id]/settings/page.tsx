"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getCharacter, saveCharacter, deleteCharacter } from "../../../actions"; // Adjusted path
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Save, ExternalLink, Power } from "lucide-react";
import Link from "next/link";
import { ICharacter, ConversationMode } from "@/types";

export default function CharacterSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState<Partial<ICharacter>>({
    name: "",
    nickname: "",
    botToken: "",
    clientId: "",
    personality: "",
    tone: "",
    goal: "",
    avatarUrl: "",
    isActive: true,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated" && session?.user && params?.id) {
      const discordId = (session.user as any).id;
      const characterId = params.id as string;

      getCharacter(characterId, discordId).then((char) => {
        if (char) {
          setFormData(char);
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
        const discordId = (session?.user as any).id;
        await deleteCharacter(params.id as string, discordId);
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
      const discordId = (session.user as any).id;
      const characterId = params.id as string;
      
      const result = await saveCharacter(characterId, discordId, formData);
      
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

  if (loading) {
    return (
        <div className="h-full bg-[#313338] text-white p-8 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#313338] text-[#dbdee1] p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <Link 
            href={`/dashboard/${params.id}`} 
            className="inline-flex items-center text-[#b5bac1] hover:text-white transition"
            >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
            </Link>
            
            {/* Active Toggle */}
            <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition ${
                    formData.isActive 
                    ? 'bg-[#23a559] text-white hover:bg-[#1a7f42]' 
                    : 'bg-[#da373c] text-white hover:bg-[#a1282c]'
                }`}
            >
                <Power className="h-4 w-4" />
                {formData.isActive ? t.newFriend.botActive : t.newFriend.botInactive}
            </button>
        </div>

        <div className="bg-[#2b2d31] rounded-lg p-6 md:p-8 shadow-md">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2 text-[#f2f3f5]">{t.newFriend.updateTitle}</h1>
            <p className="text-[#b5bac1]">{t.newFriend.updateSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  {t.newFriend.nameLabel} <span className="text-[#da373c]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  {t.newFriend.nicknameLabel}
                </label>
                <input
                  type="text"
                  value={formData.nickname || ""}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                  placeholder={t.newFriend.nicknamePlaceholder}
                />
              </div>
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                会話モード
              </label>
              <select
                value={formData.mode || ConversationMode.CASUAL}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value as ConversationMode })}
                className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
              >
                <option value={ConversationMode.CASUAL}>CASUAL (日常会話)</option>
                <option value={ConversationMode.SHORT_STORY}>SHORT STORY (短編小説風)</option>
                <option value={ConversationMode.LONG_STORY}>LONG STORY (長編小説風)</option>
                <option value={ConversationMode.CRAZY}>CRAZY (クレイジー)</option>
              </select>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                {t.newFriend.avatarLabel}
              </label>
              <div className="flex gap-4 items-start">
                {formData.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={formData.avatarUrl} 
                    alt="Preview" 
                    className="w-12 h-12 rounded-full object-cover bg-[#1e1f22]"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.avatarUrl || ""}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                    placeholder={t.newFriend.avatarPlaceholder}
                  />
                  <p className="mt-2 text-xs text-[#949ba4]">
                    Direct link to an image (PNG, JPG). Discord has strict rate limits for changing avatars.
                  </p>
                </div>
              </div>
            </div>

            {/* Personality & Tone */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    性別
                  </label>
                  <input
                    type="text"
                    value={formData.gender || ""}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                    placeholder="例: 女性"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    {t.newFriend.goalLabel} <span className="text-[#da373c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.goal || ""}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  {t.newFriend.personalityLabel} <span className="text-[#da373c]">*</span>
                </label>
                <textarea
                  required
                  value={formData.personality || ""}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition h-24 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  {t.newFriend.toneLabel} <span className="text-[#da373c]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tone || ""}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  外見・特徴
                </label>
                <textarea
                  value={formData.appearance || ""}
                  onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition h-24 resize-none"
                  placeholder="例: 銀髪のロングヘア。紫色の瞳。パーカーを着ている。"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  対話例
                </label>
                <textarea
                  value={formData.exampleDialogue || ""}
                  onChange={(e) => setFormData({ ...formData, exampleDialogue: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition h-32 resize-none"
                  placeholder="ユーザー: こんにちは&#13;&#10;AI: こんにちは！今日はいい天気だね！"
                />
              </div>
            </div>

            <div className="border-t border-[#3f4147] pt-6">
                <h3 className="text-lg font-bold text-[#f2f3f5] mb-4">{t.newFriend.discordIntegration}</h3>
                
                {/* Client ID Field */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase">
                      {t.newFriend.clientIdLabel} <span className="text-[#da373c]">*</span>
                    </label>
                    <a 
                      href="https://discord.com/developers/applications" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-[#00a8fc] hover:underline flex items-center gap-1"
                    >
                      Discord Developer Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.clientId || ""}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition font-mono text-sm"
                  />
                </div>

                {/* Bot Token Field */}
                <div>
            {/* Danger Zone */}
            <div className="border-t border-red-500/30 pt-6 mt-6">
                <h3 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
                <div className="flex items-center justify-between bg-red-500/5 p-4 rounded border border-red-500/20">
                    <div>
                        <p className="text-sm text-[#dbdee1]">このフレンドを完全に削除します。</p>
                        <p className="text-xs text-[#949ba4]">一度削除すると元に戻せません。</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition disabled:opacity-50"
                    >
                        {deleting ? '削除中...' : 'Friendを削除'}
                    </button>
                </div>
            </div>

                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-[#b5bac1] uppercase">
                      {t.newFriend.tokenLabel} <span className="text-[#da373c]">*</span>
                    </label>
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.botToken || ""}
                    onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition font-mono text-sm"
                  />
                </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium py-3 rounded-[3px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.newFriend.updateSaving}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {t.newFriend.updateSave}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
