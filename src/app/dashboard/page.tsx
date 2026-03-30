import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  const email = session?.user?.email;
  const role = session?.user?.role;

  if (!email) redirect("/login");

  if (role === "admin") redirect("/admin");
  if (role === "student") redirect("/student");
  if (role === "teacher") redirect("/teacher");

  redirect("/login");
}
