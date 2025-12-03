"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getCharacter, saveCharacter } from "../../actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Save, HelpCircle, ExternalLink, Trash2, Power } from "lucide-react";
import Link from "next/link";
import { ICharacter } from "@/types";

export default function EditFriendPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
        router.push("/dashboard");
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
        <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <Link 
            href="/dashboard"
            className="inline-flex items-center text-gray-400 hover:text-white transition"
            >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.dashboard}
            </Link>
            
            {/* Active Toggle */}
            <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                    formData.isActive 
                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}
            >
                <Power className="h-4 w-4" />
                {formData.isActive ? t.newFriend.botActive : t.newFriend.botInactive}
            </button>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t.newFriend.updateTitle}: {formData.name}</h1>
            <p className="text-gray-400">{t.newFriend.updateSubtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.nicknameLabel}
                </label>
                <input
                  type="text"
                  value={formData.nickname || ""}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder={t.newFriend.nicknamePlaceholder}
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t.newFriend.avatarLabel}
              </label>
              <div className="flex gap-4 items-start">
                {formData.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={formData.avatarUrl} 
                    alt="Preview" 
                    className="w-12 h-12 rounded-full object-cover border border-gray-600"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.avatarUrl || ""}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    placeholder={t.newFriend.avatarPlaceholder}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Direct link to an image (PNG, JPG). Discord has strict rate limits for changing avatars.
                  </p>
                </div>
              </div>
            </div>

            {/* Personality & Tone */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.personalityLabel}
                </label>
                <textarea
                  required
                  value={formData.personality || ""}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition h-24 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.toneLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.tone || ""}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.goalLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.goal || ""}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">{t.newFriend.discordIntegration}</h3>
                
                {/* Client ID Field */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      {t.newFriend.clientIdLabel}
                    </label>
                    <a 
                      href="https://discord.com/developers/applications" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      Discord Developer Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.clientId || ""}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm"
                  />
                </div>

                {/* Bot Token Field */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      {t.newFriend.tokenLabel}
                    </label>
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.botToken || ""}
                    onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm"
                  />
                </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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