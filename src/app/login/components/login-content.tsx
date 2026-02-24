"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function LoginContent() {
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();
    const error = searchParams.get("error");

    useEffect(() => {
        if (error === "AccessDenied") {
            toast.error("Access Denied", {
                description: "Please use your @sfit.ac.in email address to sign in.",
                duration: 5000,
            });
        } else if (error) {
            toast.error("Authentication Error", {
                description: "An error occurred during sign in. Please try again.",
                duration: 5000,
            });
        }
    }, [error]);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signIn("google", {
                callbackUrl: "/",
                redirect: true
            });
        } catch (error) {
            console.error("Sign in error:", error);
            toast.error("Sign In Failed", {
                description: "Unable to sign in. Please try again.",
            });
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-muted/40 bg-[radial-gradient(#00000020_1.5px,transparent_1.5px)] [background-size:24px_24px] flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                {/* Logo and Brand */}
                <a href="#" className="flex items-center gap-2 self-center font-medium">
                    <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-sm">
                        <Sparkles className="size-4" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                        EvalEase
                    </span>
                </a>

                {/* Login Card - Floating Sheet */}
                <Card className="border-none shadow-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                            Welcome back
                        </CardTitle>
                        <CardDescription>
                            Sign in to your account using your SFIT Google account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form>
                            <FieldGroup>
                                {/* Helpful Note - Softer Warning */}
                                <Field>
                                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                                        <div className="space-y-1 text-sm">
                                            <p className="font-medium text-amber-900 dark:text-amber-100">
                                                SFIT Account Required
                                            </p>
                                            <p className="text-amber-700 dark:text-amber-200">
                                                Please use your <strong>@sfit.ac.in</strong> email address to sign in.
                                            </p>
                                        </div>
                                    </div>
                                </Field>

                                {/* Google Sign In Button */}
                                <Field>
                                    <Button
                                        type="button"
                                        className="w-full transition-transform hover:scale-[1.02]"
                                        onClick={handleGoogleSignIn}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                Signing in...
                                            </>
                                        ) : (
                                            <>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    className="mr-2 h-4 w-4"
                                                >
                                                    <path
                                                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                                        fill="currentColor"
                                                    />
                                                </svg>
                                                Continue with Google
                                            </>
                                        )}
                                    </Button>
                                    <FieldDescription className="text-center text-xs">
                                        Supported: <strong>student.sfit.ac.in</strong> (Student) · <strong>@sfit.ac.in</strong> (Teacher)
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer */}
                <FieldDescription className="text-center text-xs">
                    By clicking continue, you agree to our{" "}
                    <a href="#" className="underline underline-offset-4 hover:text-primary">
                        Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="underline underline-offset-4 hover:text-primary">
                        Privacy Policy
                    </a>
                    .
                </FieldDescription>
            </div>
        </div>
    );
}
