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
  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    botToken: "",
    clientId: "",
    personality: "",
    tone: "",
    goal: "",
    avatarUrl: "",
    mode: "CASUAL",
    gender: "",
    appearance: "",
    exampleDialogue: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    
    setLoading(true);
    try {
      const discordId = (session.user as any).id;
      const result = await createCharacter(discordId, {
        ...formData,
        mode: formData.mode as ConversationMode
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

  return (
    <div className="h-full overflow-y-auto bg-[#313338] text-[#dbdee1] p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link 
          href="/dashboard"
          className="inline-flex items-center text-[#b5bac1] hover:text-white mb-8 transition group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          ダッシュボードに戻る
        </Link>

        <div className="bg-[#2b2d31] rounded-lg p-6 md:p-8 shadow-md">
          <div className="mb-8">
            <div className="w-12 h-12 bg-[#5865F2]/20 rounded-xl flex items-center justify-center text-[#5865F2] mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-[#f2f3f5]">新しいフレンドを作成</h1>
            <p className="text-[#b5bac1]">
              Discord Botのトークンを入力して、AIフレンドに命を吹き込みましょう。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Discord Integration Section */}
            <div className="bg-[#1e1f22] rounded-[3px] p-4 border border-[#1e1f22]">
              <h3 className="text-sm font-bold text-[#f2f3f5] mb-4 flex items-center gap-2 uppercase">
                <Bot className="w-4 h-4" />
                Discord連携設定
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    Bot Token <span className="text-[#da373c]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.botToken}
                    onChange={(e) => setFormData({ ...formData, botToken: e.target.value })}
                    className="w-full bg-[#383a40] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition font-mono text-sm"
                    placeholder="MTE..."
                  />
                  <div className="mt-3 p-3 bg-[#f0b232]/10 border border-[#f0b232]/20 rounded-[3px] text-xs text-[#f0b232] space-y-1">
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
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    Client ID (Application ID) <span className="text-[#da373c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full bg-[#383a40] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition font-mono text-sm"
                    placeholder="123456789..."
                  />
                  {formData.clientId && (
                    <div className="mt-3">
                      <a
                        href={`https://discord.com/api/oauth2/authorize?client_id=${formData.clientId}&permissions=68608&scope=bot`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-medium text-[#00a8fc] hover:underline transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        このBotの招待リンクを開く（テスト用）
                      </a>
                      <p className="mt-1 text-xs text-[#949ba4]">
                        ※ Botをサーバーに追加するための招待URLです。
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Character Details */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  会話モード <span className="text-[#da373c]">*</span>
                </label>
                <select
                  required
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                >
                  <option value="CASUAL">CASUAL (日常会話)</option>
                  <option value="SHORT_STORY">SHORT STORY (短編小説風)</option>
                  <option value="LONG_STORY">LONG STORY (長編小説風)</option>
                  <option value="CRAZY">CRAZY (クレイジー)</option>
                </select>
                <p className="mt-2 text-xs text-[#949ba4]">
                  AIの応答スタイルを決定します。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    キャラクター名 <span className="text-[#da373c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                    placeholder="例: 結月ゆかり"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    ニックネーム（呼び名）
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                    placeholder="例: ゆかりん"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    性別
                  </label>
                  <input
                    type="text"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                    placeholder="例: 女性"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    アバター画像のURL
                  </label>
                  <input
                    type="url"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                    placeholder="https://example.com/image.png"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    性格 <span className="text-[#da373c]">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.personality}
                    onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition h-32 resize-none"
                    placeholder="例: 明るくて元気。少しドジなところがある。ゲームが好き。"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                    口調・話し方 <span className="text-[#da373c]">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.tone}
                    onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                    className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition h-32 resize-none"
                    placeholder="例: タメ口で話す。語尾に「〜だよ」「〜だね」をつける。絵文字をよく使う。"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  外見・特徴
                </label>
                <textarea
                  value={formData.appearance}
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
                  value={formData.exampleDialogue}
                  onChange={(e) => setFormData({ ...formData, exampleDialogue: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition h-32 resize-none"
                  placeholder="ユーザー: こんにちは&#13;&#10;AI: こんにちは！今日はいい天気だね！"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#b5bac1] uppercase mb-2">
                  目標・役割
                </label>
                <input
                  type="text"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="w-full bg-[#1e1f22] border-none rounded-[3px] px-3 py-2.5 text-[#dbdee1] focus:outline-none focus:ring-2 focus:ring-[#00a8fc] transition"
                  placeholder="例: ユーザーの話し相手になる。プログラミングのサポートをする。"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-[#3f4147] flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed rounded-[3px] font-medium text-white transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
      </div>
    </div>
  );
}
