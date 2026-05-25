import NextAuth, { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";

// デバッグ用: サーバー起動時に環境変数をチェックしてログ出力
console.log("=== NextAuth Configuration Check ===");
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("DISCORD_CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "Set (OK)" : "MISSING");
console.log("DISCORD_CLIENT_SECRET:", process.env.DISCORD_CLIENT_SECRET ? "Set (OK)" : "MISSING");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "Set (OK)" : "MISSING");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "Set (OK)" : "MISSING");
console.log("NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET ? "Set (OK)" : "MISSING");
console.log("====================================");

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: 'identify email' } },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // デバッグログを有効化
  // @ts-expect-error: trustHost is a valid option in NextAuth v4 but might be missing in the type definition
  trustHost: true, // プロキシやDocker環境下でのホスト認識を改善
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, profile, account }) {
      // Store provider info and user ID from either Discord or Google
      if (account) {
        (token as any).provider = account.provider;
      }
      
      const p = profile as unknown as { id?: string; sub?: string; email?: string } | undefined;
      
      // Use Discord's numeric ID if available, otherwise Google's sub
      if (p?.id) {
        (token as any).userId = p.id;
      } else if (p?.sub) {
        (token as any).userId = p.sub;
      }
      
      // Store email for potential account linking
      if (p?.email) {
        (token as any).email = p.email;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Add the user's ID to the session so we can use it to fetch their character
        const userWithId = session.user as typeof session.user & { id?: string };
        userWithId.id = (token as any).userId ?? token.sub ?? undefined;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`[SignIn] User: ${user?.email}, Provider: ${account?.provider}, New: ${isNewUser}`);
    },
    async session({ session, token }) {
      console.log(`[Session] User: ${session?.user?.email}`);
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
