import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider && account.providerAccountId) {
        token.authSubject = `${account.provider}:${account.providerAccountId}`;
      }
      if (profile && "login" in profile && typeof profile.login === "string") {
        token.handle = profile.login;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as typeof session.user & {
          authSubject?: string;
          handle?: string;
        };
        if (typeof token.authSubject === "string") user.authSubject = token.authSubject;
        if (typeof token.handle === "string") user.handle = token.handle;
      }
      return session;
    },
  },
});
