import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Home",
};

// Exception emails for testing/special access (must match auth.ts)
const EXCEPTION_EMAILS = {
  admin: ["kevilshaji@gmail.com"],
  teacher: ["fevermusic321@gmail.com","solankibhavik92@gmail.com","sohampatil1510@gmail.com","pournimarode10@gmail.com"],
  student: [] as string[],
};

function getUserRole(email: string): "admin" | "teacher" | "student" | null {
  if (EXCEPTION_EMAILS.admin.includes(email)) return "admin";
  if (EXCEPTION_EMAILS.teacher.includes(email)) return "teacher";
  if (EXCEPTION_EMAILS.student.includes(email)) return "student";
  
  if (email.endsWith("@student.sfit.ac.in")) return "student";
  if (email.endsWith("@sfit.ac.in")) return "teacher";
  
  return null;
}

export default async function Home() {
  const session = await auth();
  
  if (!session) {
    redirect("/login");
  }

  // Redirect based on role
  const email = session.user?.email;
  
  if (email) {
    const role = getUserRole(email);
    
    if (role === "admin") {
      redirect("/admin");
    } else if (role === "student") {
      redirect("/student");
    } else if (role === "teacher") {
      redirect("/teacher");
    }
  }

  redirect("/login");
}
