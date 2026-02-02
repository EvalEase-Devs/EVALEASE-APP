import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Exception emails for testing/special access (must match auth.ts)
const EXCEPTION_EMAILS = {
  admin: ["kevilshaji@gmail.com"],
  teacher: ["fevermusic321@gmail.com", "solankibhavik92@gmail.com","sohampatil1510@gmail.com","pournimarode10@gmail.com"],
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

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const email = req.auth?.user?.email;

  // Public routes
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/api/auth");

  // If not logged in and trying to access protected route
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If logged in and trying to access login page
  if (isLoggedIn && pathname === "/login" && email) {
    const role = getUserRole(email);
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    } else if (role === "student") {
      return NextResponse.redirect(new URL("/student", req.url));
    } else if (role === "teacher") {
      return NextResponse.redirect(new URL("/teacher", req.url));
    }
  }

  // Role-based route protection
  if (isLoggedIn && email) {
    const role = getUserRole(email);

    if (pathname.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/student") && role !== "student") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (pathname.startsWith("/teacher") && role !== "teacher") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
