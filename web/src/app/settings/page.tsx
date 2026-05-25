"use client";

import { useSession } from "next-auth/react";
import { Settings, Save } from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
// We will implement updateProfile action later
// import { updateProfile } from "../actions"; 

export default function SettingsPage() {
  const { data: session } = useSession();
  
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 border-b border-foreground/10 bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-2xl px-4 py-3 flex items-center gap-2">
          <Settings className="w-5 h-5 text-foreground/60" />
          <h1 className="font-semibold">設定</h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-6">アカウント</h2>
        
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-6">
            <h3 className="text-base font-semibold mb-4">プロフィール</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground/70 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  defaultValue=""
                  className="w-full rounded-md border border-foreground/10 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-foreground/70 mb-1">
                  Email
                </label>
                <div className="text-foreground/70 text-sm">
                  <span className="ml-2 px-2 py-0.5 bg-foreground/5 text-foreground/70 text-xs rounded border border-foreground/10">
                     Verified (Discord)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ThemeSelector />

          <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-6">
            <h3 className="text-base font-semibold mb-4">パスワード / 認証</h3>
            <p className="text-sm text-foreground/70 mb-4">
              Since you logged in with Discord, you don&apos;t have a password set.
              Setting a password will allow you to log in with email/password.
            </p>
            <button
                type="button"
                className="px-4 py-2 rounded-md bg-foreground text-background hover:bg-foreground/90 font-medium transition text-sm"
                onClick={() => alert("Password setting not implemented yet.")}
            >
                Set Password
            </button>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 rounded-md bg-foreground text-background hover:bg-foreground/90 font-medium transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
