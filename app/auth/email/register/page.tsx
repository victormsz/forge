import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,232,214,0.2),_transparent_55%),_#050506] text-white">
            <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16 sm:px-6">
                <div className="space-y-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-200">ForgeSheet access</p>
                    <h1 className="text-3xl font-semibold">Create an email login</h1>
                    <p className="text-sm text-white/70">Prefer to skip OAuth? Register with your email and a password, then confirm the verification link we send before you sign in.</p>
                </div>
                <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <RegisterForm />
                    <p className="mt-6 text-center text-xs text-white/70">
                        Already have an account? <Link href="/auth/email/login" className="text-rose-200 underline-offset-4 hover:underline">Sign in</Link>
                    </p>
                </section>
            </main>
        </div>
    );
}
