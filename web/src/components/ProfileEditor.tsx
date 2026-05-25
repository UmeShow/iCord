"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { User, LogOut, Mail, Shield, Edit2, Save, X } from "lucide-react";
import Image from "next/image";
import { getUserProfile, updateUserProfile } from "@/app/userActions";
import { IUser } from "@/types";

export function ProfileEditor() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<IUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (session?.user?.id) {
        const userProfile = await getUserProfile(session.user.id);
        setProfile(userProfile);
        setDisplayName(userProfile?.displayName || session.user.name || "");
        setBio(userProfile?.bio || "");
        setLoading(false);
      }
    };
    loadProfile();
  }, [session]);

  const handleSave = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await updateUserProfile(session.user.id, {
        displayName,
        bio,
      });
      if (result.success) {
        setProfile(prev => prev ? { ...prev, displayName, bio } : null);
        setIsEditing(false);
        setMessage({ type: 'success', text: result.message });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: "エラーが発生しました。" });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(profile?.displayName || session?.user?.name || "");
    setBio(profile?.bio || "");
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-foreground border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <>
      {/* Profile Card */}
      <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-4">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-foreground/10 flex items-center justify-center shrink-0">
            {session?.user?.image ? (
              <Image src={session.user.image} alt="User" width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              <User className="h-10 w-10" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1">
                    表示名
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-md border border-foreground/10 bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                    maxLength={30}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/70 mb-1">
                    プロフィール説明
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-md border border-foreground/10 bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20 resize-none"
                    rows={3}
                    maxLength={150}
                    placeholder="自己紹介を入力..."
                  />
                  <div className="text-xs text-foreground/50 mt-1">
                    {bio.length}/150
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-lg font-semibold truncate">{displayName || "ユーザー"}</div>
                <div className="text-sm text-foreground/70 truncate">{session?.user?.email || ""}</div>
                {bio && (
                  <div className="mt-2 text-sm text-foreground/70 line-clamp-2">
                    {bio}
                  </div>
                )}
                <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-foreground/10 bg-background px-2 py-1 text-xs text-foreground/70">
                  <span>@{profile?.customId || "user_id"}</span>
                  <span className="text-foreground/40">/</span>
                  <span>#{session?.user?.id?.substring(0, 4) || "0000"}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-md border border-foreground/20 hover:bg-foreground/5 transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-foreground text-background hover:bg-foreground/90 transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      )}

      {/* Info Cards */}
      {!isEditing && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="h-4 w-4 text-foreground/60" />
              メール
            </div>
            <div className="mt-2 text-sm text-foreground/70 break-words">{session?.user?.email || "No email linked"}</div>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="h-4 w-4 text-foreground/60" />
              プライバシー
            </div>
            <div className="mt-2 text-sm text-foreground/70">Discordログインのため、パスワードは不要です。</div>
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm border ${
          message.type === 'success' 
            ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400' 
            : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {!isEditing && (
        <div className="mt-6">
          <button
            onClick={() => signOut()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-foreground/15 bg-background px-4 py-2 text-sm font-medium hover:bg-foreground/5 transition"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      )}
    </>
  );
}
