"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { createCharacter } from "../../actions";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Save, HelpCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function NewFriendPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    botToken: "",
    clientId: "",
    personality: "",
    tone: "",
    goal: "",
    avatarUrl: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    setLoading(true);
    try {
      const discordId = (session.user as any).id;
      const result = await createCharacter(discordId, formData);
      
      if (result.success) {
        router.push("/dashboard");
      } else {
        alert("Failed to create friend. Please try again.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.common.dashboard}
        </Link>

        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{t.newFriend.title}</h1>
            <p className="text-gray-400">{t.newFriend.subtitle}</p>
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
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="e.g. My AI Bestie"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.nicknameLabel}
                </label>
                <input
                  type="text"
                  value={formData.nickname}
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
              <input
                type="url"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder={t.newFriend.avatarPlaceholder}
              />
              <p className="mt-2 text-xs text-gray-500">
                Direct link to an image (PNG, JPG). Discord has strict rate limits for changing avatars, so it might take a while to update.
              </p>
            </div>

            {/* Personality & Tone */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.personalityLabel}
                </label>
                <textarea
                  required
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition h-24 resize-none"
                  placeholder={t.newFriend.personalityPlaceholder}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.toneLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder={t.newFriend.tonePlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t.newFriend.goalLabel}
                </label>
                <input
                  type="text"
                  required
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder={t.newFriend.goalPlaceholder}
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
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm"
                    placeholder={t.newFriend.clientIdPlaceholder}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Found in General Information {'>'} Application ID
                  </p>
                </div>

                {/* Bot Token Field */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      {t.newFriend.tokenLabel}
                    </label>
                    <div className="group relative">
                      <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                      <div className="absolute right-0 bottom-full mb-2 w-64 p-3 bg-black rounded-lg text-xs text-gray-300 hidden group-hover:block border border-gray-700 shadow-lg z-10">
                        Go to Bot section {'>'} Reset Token to get a new token. Never share this with anyone else!
                      </div>
                    </div>
                  </div>
                  <input
                    type="password"
                    required
                    value={formData.botToken}
                    onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-mono text-sm"
                    placeholder={t.newFriend.tokenPlaceholder}
                  />
                </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t.newFriend.saving}
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    {t.newFriend.save}
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
