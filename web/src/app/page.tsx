"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      <main className="flex flex-col items-center gap-8 p-8 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          iCord.me
        </h1>
        <p className="text-xl text-gray-300 max-w-md">
          Create your own AI friend for Discord. Customize their personality, tone, and story.
        </p>

        {session ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
              {session.user?.image && (
                <Image
                  src={session.user.image}
                  alt="User Avatar"
                  width={50}
                  height={50}
                  className="rounded-full"
                />
              )}
              <div className="text-left">
                <p className="font-bold">{session.user?.name}</p>
                <p className="text-sm text-gray-400">Logged in</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-full font-semibold transition"
              >
                Go to Dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-full font-semibold transition"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => signIn("discord")}
            className="px-8 py-4 bg-[#5865F2] hover:bg-[#4752C4] rounded-full font-bold text-lg transition flex items-center gap-2"
          >
            Login with Discord
          </button>
        )}
      </main>
    </div>
  );
}
