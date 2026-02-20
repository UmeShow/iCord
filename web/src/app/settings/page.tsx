"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { Settings, Save, AlertTriangle } from "lucide-react";
import Link from "next/link";
// We will implement updateProfile action later
// import { updateProfile } from "../actions"; 

export default function SettingsPage() {
  const { data: session } = useSession();
  const [nickname, setNickname] = useState(session?.user?.name || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      // Implement profile update logic here
      // await updateProfile({ name: nickname });
      setMessage({ type: 'success', text: "Profile updated! (Not implemented yet)" });
    } catch (error) {
       console.error(error);
      setMessage({ type: 'error', text: "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#313338]">
      {/* Top Bar */}
      <div className="h-12 bg-[#313338] border-b border-[#1f2023] flex items-center px-4 shadow-sm shrink-0">
        <h1 className="font-bold text-gray-200 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Settings
        </h1>
      </div>

      <div className="p-8 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6 text-gray-100">My Account</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1f2023]">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Profile</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-[#1e1f22] border-none text-gray-100 p-2 rounded focus:ring-2 focus:ring-[#5865F2]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                  Email
                </label>
                <div className="text-gray-400 text-sm">
                  {session?.user?.email}
                  <span className="ml-2 px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">
                     Verified (Discord)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#2b2d31] p-6 rounded-lg border border-[#1f2023]">
            <h3 className="text-lg font-medium text-gray-200 mb-4">Password & Auth</h3>
            <p className="text-sm text-gray-400 mb-4">
              Since you logged in with Discord, you don't have a password set.
              Setting a password will allow you to log in with email/password.
            </p>
            <button
                type="button"
                className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded font-medium transition text-sm"
                onClick={() => alert("Password setting not implemented yet.")}
            >
                Set Password
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-[#23a559] hover:bg-[#1a7f44] text-white rounded font-medium transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
