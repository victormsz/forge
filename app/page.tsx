import Link from "next/link";
import { getServerSession } from "next-auth";

import { continueAsGuest } from "@/app/guest/actions";
import { SignInButtons, SignOutButton } from "@/components/auth/auth-buttons";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getCurrentActor } from "@/lib/current-actor";

const featureCards = [
  {
    title: "Party Command",
    body: "Dungeon Masters can spin up parties, invite players by email, and view every character sheet in their roster.",
  },
  {
    title: "Shared Table Chat",
    body: "Keep one chat per party with text, item shares, and uploads for images or short video clips.",
  },
  {
    title: "Precision Spellcraft",
    body: "Model every spell with single-target darts, 30 ft cones, squares, or sprawling AOEs. Flag who it hits: allies, foes, everyone, or just the scenery.",
  },
];

const accountOptions = [
  {
    title: "Guest",
    tag: "Try the forge",
    detail: "1 character, no leveling, no parties. Seven-day guest save.",
    cta: "Continue as guest",
    href: null as string | null,
  },
  {
    title: "Paid Player",
    tag: "Full character tools",
    detail: "Unlimited characters, full features, can join parties.",
    cta: "Create player account",
    href: "/auth/email/register?plan=paid_player",
  },
  {
    title: "Basic DM",
    tag: "One party",
    detail: "Create 1 party with up to 5 players, plus full DM views.",
    cta: "Create basic DM account",
    href: "/auth/email/register?plan=basic_dm",
  },
  {
    title: "Premium DM",
    tag: "Unlimited parties",
    detail: "Unlimited parties and players, full DM control.",
    cta: "Create premium DM account",
    href: "/auth/email/register?plan=premium_dm",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const actor = await getCurrentActor(session);
  const isGuest = actor?.role === "guest";
  const userName = session?.user?.name ?? actor?.name ?? "Adventurer";
  const guestLimitCopy = "Guest access covers one character slot without leveling, items, or spells.";
  const heroHeadline = session
    ? `${userName}, your spellbook is ready.`
    : isGuest
      ? "Guest mode unlocked — limited forge access."
      : "Sign in to start forging.";
  const heroBody = session
    ? "Create characters, manage parties, and keep chat-ready summaries for the table."
    : isGuest
      ? "Prototype a hero without linking an account. Guest mode saves one character and previews the forge, but leveling, inventory, parties, and spell tracking stay locked until you sign in."
      : "Pick a player or DM account, invite your table by email, and keep party chat and sheets in sync.";
  const emailAuthLinks = (
    <p className="text-xs text-white/70">
      Prefer email credentials?{" "}
      <Link href="/auth/email/register" className="text-rose-200 underline-offset-4 hover:underline">
        Sign up with email
      </Link>{" "}
      <span className="text-white/50">or</span>{" "}
      <Link href="/auth/email/login" className="text-rose-200 underline-offset-4 hover:underline">
        log in
      </Link>
      .
    </p>
  );

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
                  {emailAuthLinks}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <SignInButtons />
                  <p className="text-xs text-white/60">Sign in with Google or Discord to unlock parties, chat, and full spell/item tooling.</p>
                  {emailAuthLinks}
                </div>
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

        {!session && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Account Paths</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Choose your account type</h2>
                <p className="mt-2 text-sm text-white/70">Plan selection is saved on signup, with upgrades coming soon.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {accountOptions.map((option) => (
                <Card
                  key={option.title}
                  collapsible
                  title={option.title}
                  titleAs="h3"
                  titleClassName="mt-2 text-lg font-semibold text-white"
                  leading={<p className="hidden text-xs uppercase tracking-[0.25em] text-white/50 group-open:block">{option.tag}</p>}
                  className="rounded-2xl border border-white/10 bg-black/30 p-5"
                >
                  <p className="mt-2 text-sm text-white/70">{option.detail}</p>
                  {option.href ? (
                    <Link
                      href={option.href}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-rose-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                    >
                      {option.cta}
                    </Link>
                  ) : (
                    <form action={continueAsGuest} className="mt-4">
                      <button
                        type="submit"
                        className="w-full rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                      >
                        {option.cta}
                      </button>
                    </form>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <Card
              key={card.title}
              collapsible
              title={card.title}
              titleAs="h3"
              titleClassName="text-lg font-semibold text-white"
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            >
              <p className="mt-2 text-sm text-white/70">{card.body}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
