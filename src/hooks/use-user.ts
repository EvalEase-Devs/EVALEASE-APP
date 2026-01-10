"use client";

import { useSession } from "next-auth/react";
import { getUserRole, type UserRole } from "@/lib/types";

export function useUser() {
  const { data: session, status } = useSession();
  const email = session?.user?.email;
  const role = getUserRole(email);

  return {
    user: session?.user,
    email,
    role,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
}

export function useRequireAuth(requiredRole?: UserRole) {
  const { role, isLoading, isAuthenticated } = useUser();

  const hasAccess =
    isAuthenticated && (!requiredRole || role === requiredRole);

  return {
    hasAccess,
    isLoading,
    role,
  };
}
