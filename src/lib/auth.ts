import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getTeacherByEmail } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

// Exception emails for testing/special access
const EXCEPTION_EMAILS = {
  admin: ["kevilshaji@gmail.com", "", "sohampatil1510@gmail.com", "pournimarode10@gmail.com", "solankibhavik9112@gmail.com"],
  teacher: ["fevermusic321@gmail.com", "pournimar203@gmail.com", "solankibhavik92@gmail.com"],
  student: [] as string[],
};

async function resolveUserRole(email: string): Promise<UserRole | null> {
  if (EXCEPTION_EMAILS.admin.includes(email)) return "admin";
  if (EXCEPTION_EMAILS.teacher.includes(email)) return "teacher";
  if (EXCEPTION_EMAILS.student.includes(email)) return "student";

  if (email.endsWith("@student.sfit.ac.in")) return "student";

  if (email.endsWith("@sfit.ac.in") && !email.endsWith("@student.sfit.ac.in")) {
    try {
      const teacher = await getTeacherByEmail(email);
      const designation = teacher?.designation?.trim().toUpperCase();

      if (designation === "LAB ASSISTANT") return "admin";
      return "teacher";
    } catch {
      // If teacher lookup fails, keep domain-based fallback.
      return "teacher";
    }
  }

  return null;
}

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

      const role = await resolveUserRole(email);
      return role !== null;
    },
    async jwt({ token }) {
      const email = token.email;

      if (!email) {
        token.role = undefined;
        return token;
      }

      token.role = await resolveUserRole(email);
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
