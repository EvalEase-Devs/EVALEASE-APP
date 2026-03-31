import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

function fallbackRoleFromEmail(email: string): "admin" | "teacher" | "student" | null {
  if (email === "kevilshaji@gmail.com" || email === "pournimarode10@gmail.com" || email === "sohampatil1510@gmail.com") return "admin";
  if (email.endsWith("@student.sfit.ac.in")) return "student";
  if (email.endsWith("@sfit.ac.in") && !email.endsWith("@student.sfit.ac.in")) return "teacher";
  return null;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const email = req.auth?.user?.email;
  const sessionRole = req.auth?.user?.role;

  // Public routes
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/api/auth");

  // If not logged in and trying to access protected route
  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If logged in and trying to access login page
  if (isLoggedIn && pathname === "/login" && email) {
    const role = sessionRole ?? fallbackRoleFromEmail(email);
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
    const role = sessionRole ?? fallbackRoleFromEmail(email);

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
