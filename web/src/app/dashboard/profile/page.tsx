import { Edit2 } from "lucide-react";
import { ProfileEditor } from "@/components/ProfileEditor";

export default function ProfilePage() {
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 border-b border-foreground/10 bg-background/90 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-semibold">マイページ</h1>
          <div className="p-2">
            <Edit2 className="w-5 h-5 text-foreground/60" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-4 flex-1 overflow-y-auto pb-20">
        <ProfileEditor />
      </div>
    </div>
  );
}
