import Link from "next/link";
import { getServerSession } from "next-auth";

import { continueAsGuest } from "@/app/guest/actions";
import { SignInButtons, SignOutButton } from "@/components/auth/auth-buttons";
import { authOptions } from "@/lib/auth";
import { getCurrentActor } from "@/lib/current-actor";

const featureCards = [
  {
    title: "Precision Spellcraft",
    body: "Model every spell with single-target darts, 30 ft cones, squares, or sprawling AOEs. Flag who it hits: allies, foes, everyone, or just the scenery.",
  },
  {
    title: "Point Buy or Chaos",
    body: "Lock in disciplined point-buy spreads or let the dice gods choose with fast random rolls. Track budgets, rerolls, and variant rules in one spot.",
  },
  {
    title: "Mobile-First Sheets",
    body: "Craft on your phone, finalize on desktop. Responsive cards stack into a printable grid that exports to PDF without tedious formatting passes.",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const actor = await getCurrentActor(session);
  const isGuest = actor?.isGuest ?? false;
  const userName = session?.user?.name ?? actor?.name ?? "Adventurer";
  const guestLimitCopy = "Guest access covers one character slot without leveling, items, or spells.";
  const heroHeadline = session
    ? `${userName}, your spellbook is ready.`
    : isGuest
      ? "Guest mode unlocked — limited forge access."
      : "Sign in to start forging.";
  const heroBody = session
    ? "Create a character, assign ownership, and start logging ability rolls, spell slots, and party buffs."
    : isGuest
      ? "Prototype a hero without linking an account. Guest mode saves one character and previews the forge, but leveling, inventory, and spell tracking stay locked until you sign in."
      : "Authenticate once, sync across devices, and keep every feature unlocked while we build the 5.5 ruleset.";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,232,214,0.8),_transparent_55%),_#0b0b0d] text-white">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <header className="space-y-6 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">
            ForgeSheet beta
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
            D&D 5.5 characters built for the table *and* the timeline.
          </h1>
          <p className="text-base text-white/80 sm:max-w-2xl">
            Log in with Google or Discord, tie characters to your party roster, and rapidly sculpt spells, feats, and equipment with precise targeting rules. Export to polished PDFs when it is showtime.
          </p>
        </header>

        <section className="grid gap-6 rounded-3xl bg-white/5 p-6 backdrop-blur-lg sm:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-rose-200">Welcome</p>
            <h2 className="text-2xl font-semibold text-white">
              {heroHeadline}
            </h2>
            <p className="text-sm text-white/70">
              {heroBody}
            </p>
            {session ? (
              <div className="flex flex-col gap-4">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-rose-400 px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-black transition hover:bg-rose-300"
                >
                  Open my party dashboard
                </Link>
                <SignOutButton />
              </div>
            ) : isGuest ? (
              <div className="flex flex-col gap-4">
                <Link
                  href="/dashboard"
                  className="rounded-full bg-rose-400 px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide text-black transition hover:bg-rose-300"
                >
                  Resume guest dashboard
                </Link>
                <p className="text-xs text-white/70">{guestLimitCopy}</p>
                <div className="space-y-2">
                  <SignInButtons />
                  <p className="text-xs text-white/60">Sign in with Google or Discord to unlock unlimited heroes and full spell/item tooling.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <SignInButtons />
                <form action={continueAsGuest} className="space-y-2">
                  <button
                    type="submit"
                    className="w-full rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-rose-200"
                  >
                    Continue as guest
                  </button>
                  <p className="text-xs text-white/70">{guestLimitCopy}</p>
                </form>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/0 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose-200">Character Snapshot</p>
            {session ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-white/70">Owner</span>
                  <span className="text-sm font-semibold text-white">{session.user?.email}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-white/70">Builder Mode</span>
                  <span className="text-sm font-semibold text-white">Point Buy · Random</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-white/70">Export</span>
                  <span className="text-sm font-semibold text-white">PDF (soon)</span>
                </div>
              </div>
            ) : isGuest ? (
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <p>• Guest mode saves one hero for seven days.</p>
                <p>• Level ups and inventory/spell tracking stay locked.</p>
                <p>• Sign in when you are ready to keep the character forever.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <p>• Track spell templates with friend/foe/environment toggles.</p>
                <p>• Switch between point buy and random rolling anytime.</p>
                <p>• Save straight to PDF when your DM needs receipts.</p>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm text-white/70">{card.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
