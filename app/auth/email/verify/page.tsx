import Link from "next/link";

import { verifyEmailToken } from "@/lib/auth/email-auth-service";

interface VerifyPageProps {
    searchParams: Promise<{
        token?: string;
    }>;
}

export default async function EmailVerifyPage({ searchParams }: VerifyPageProps) {
    const params = await searchParams;
    const token = typeof params.token === "string" ? params.token : undefined;

    let status: "success" | "error" = "error";
    let title = "Verification failed";
    let message = "We could not validate that link. Request a new verification email and try again.";

    if (!token) {
        message = "Missing verification token. Use the link from your email to verify your account.";
    } else {
        try {
            const result = await verifyEmailToken(token);
            status = "success";
            title = "Email verified";
            message = `Your account (${result.email}) is confirmed. You can now sign in with your email and password.`;
        } catch (error) {
            message = error instanceof Error ? error.message : message;
        }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,232,214,0.2),_transparent_55%),_#050506] text-white">
            <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-16 sm:px-6">
                <div className="space-y-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-200">Email confirmation</p>
                    <h1 className="text-3xl font-semibold">{title}</h1>
                    <p className="text-sm text-white/70">{message}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
                    {status === "success" ? (
                        <Link
                            href="/auth/email/login"
                            className="inline-flex items-center justify-center rounded-full bg-rose-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                        >
                            Continue to login
                        </Link>
                    ) : (
                        <div className="space-y-3">
                            <Link
                                href="/auth/email/register"
                                className="inline-flex items-center justify-center rounded-full bg-rose-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                            >
                                Start over
                            </Link>
                            <p className="text-xs text-white/60">
                                Did the link expire? Submit the registration form again to get a fresh verification email.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
