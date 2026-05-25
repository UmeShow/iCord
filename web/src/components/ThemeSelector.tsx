"use client";

import { Palette } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeSelector() {
  const { theme, setTheme, availableThemes } = useTheme();

  return (
    <div className="rounded-lg border border-foreground/10 bg-foreground/5 p-6">
      <h3 className="text-base font-semibold mb-4">カラーテーマ</h3>
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4 text-foreground/60" />
        <span className="text-sm text-foreground/70">表示テーマを選択</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {availableThemes.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={`py-3 px-4 rounded-lg border-2 transition font-medium text-sm ${
              theme === t.id
                ? 'border-foreground bg-foreground/10'
                : 'border-foreground/20 hover:border-foreground/40'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
