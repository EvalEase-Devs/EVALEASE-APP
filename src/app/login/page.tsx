import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginContent } from "./components/login-content";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
