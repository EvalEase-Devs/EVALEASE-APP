import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const EXCEPTION_EMAILS = {
  admin: ["kevilshaji@gmail.com"],
  teacher: ["fevermusic321@gmail.com", "solankibhavik92@gmail.com", "sohampatil1510@gmail.com", "pournimarode10@gmail.com"],
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

export default async function DashboardPage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) redirect("/login");

  const role = getUserRole(email);
  if (role === "admin") redirect("/admin");
  if (role === "student") redirect("/student");
  if (role === "teacher") redirect("/teacher");

  redirect("/login");
}
