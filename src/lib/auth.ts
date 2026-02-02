import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Exception emails for testing/special access
const EXCEPTION_EMAILS = {
  admin: ["kevilshaji@gmail.com"],
  teacher: ["fevermusic321@gmail.com", "solankibhavik92@gmail.com","sohampatil1510@gmail.com","pournimarode10@gmail.com"],
  student: [] as string[],
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email;

      if (!email) {
        return false;
      }

      // Check exception emails first
      if (EXCEPTION_EMAILS.admin.includes(email)) {
        return true;
      }
      if (EXCEPTION_EMAILS.teacher.includes(email)) {
        return true;
      }
      if (EXCEPTION_EMAILS.student.includes(email)) {
        return true;
      }

      // Check for valid SFIT email domains
      // Students: *@student.sfit.ac.in
      // Teachers: *@sfit.ac.in (but not student.sfit.ac.in)
      const isStudent = email.endsWith("@student.sfit.ac.in");
      const isTeacher = email.endsWith("@sfit.ac.in") && !email.endsWith("@student.sfit.ac.in");

      if (isStudent || isTeacher) {
        return true;
      }

      return false;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
