import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

// デバッグ用: サーバー起動時に環境変数をチェックしてログ出力
console.log("=== NextAuth Configuration Check ===");
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "Set (OK)" : "MISSING");
console.log("DISCORD_CLIENT_SECRET:", process.env.DISCORD_CLIENT_SECRET ? "Set (OK)" : "MISSING");
console.log("NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "Set (OK)" : "MISSING");
console.log("====================================");

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: 'identify' } },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // デバッグログを有効化
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        // Add the user's ID to the session so we can use it to fetch their character
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
