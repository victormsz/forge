import Link from "next/link";

import { EmailLoginForm } from "@/components/auth/email-login-form";
import { Card } from "@/components/ui/card";

export default function EmailLoginPage() {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,232,214,0.2),_transparent_55%),_#050506] text-white">
            <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16 sm:px-6">
                <div className="space-y-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-200">Secure sign-in</p>
                    <h1 className="text-3xl font-semibold">Email + password login</h1>
                    <p className="text-sm text-white/70">Enter your credentials, review the confirmation step, and you will land in the dashboard. Verified accounts only.</p>
                </div>
                <Card as="section" className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <EmailLoginForm />
                    <p className="mt-6 text-center text-xs text-white/70">
                        Need an account? <Link href="/auth/email/register" className="text-rose-200 underline-offset-4 hover:underline">Register first</Link>
                    </p>
                </Card>
            </main>
        </div>
    );
}
