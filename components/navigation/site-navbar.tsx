import Link from "next/link";

const navLinks = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Characters", href: "/characters" },
];

export function SiteNavbar() {
    return (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(5,5,8,0.9)] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                <Link
                    href="/"
                    className="text-xs font-semibold uppercase tracking-[0.5em] text-rose-200 transition hover:text-white"
                >
                    ForgeSheet
                </Link>
                <nav className="hidden gap-6 text-sm font-medium text-white/70 sm:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="transition hover:text-white"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <Link
                    href="/dashboard"
                    className="rounded-full bg-gradient-to-r from-rose-400 to-amber-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black shadow-lg transition hover:shadow-rose-400/40"
                >
                    Launch Builder
                </Link>
            </div>
        </header>
    );
}
