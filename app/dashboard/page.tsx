import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AbilityGenerationMethod } from "@prisma/client";

import { CharacterCard } from "@/components/characters/character-card";
import { Card } from "@/components/ui/card";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";

const EMPTY_PROFICIENCIES = {
    armor: [] as string[],
    weapons: [] as string[],
    tools: [] as string[],
    skills: [] as string[],
    languages: [] as string[],
};

export const metadata: Metadata = {
    title: "ForgeSheet | Command Dashboard",
    description: "Review your roster, spell coverage, and next actions for your D&D 5.5 heroes.",
};

export default async function DashboardPage() {
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const isGuest = actor.role === "guest";

    const [user, characters] = await Promise.all([
        prisma.user.findUnique({
            where: { id: actor.userId },
            select: { id: true, name: true, email: true, createdAt: true },
        }),
        prisma.character.findMany({
            where: { userId: actor.userId },
            include: { spells: { select: { id: true, shape: true } } },
            orderBy: { updatedAt: "desc" },
        }),
    ]);

    if (!user) {
        redirect("/");
    }

    const methodTotals: Record<AbilityGenerationMethod, number> = {
        [AbilityGenerationMethod.POINT_BUY]: 0,
        [AbilityGenerationMethod.RANDOM]: 0,
    };

    let totalSpells = 0;

    characters.forEach((character) => {
        methodTotals[character.generationMethod] += 1;
        totalSpells += character.spells.length;
    });

    const latestCharacter = characters[0] ?? null;

    const summaryCards = [
        {
            title: "Characters forged",
            value: characters.length.toString(),
            detail: `${methodTotals[AbilityGenerationMethod.POINT_BUY]} point buy · ${methodTotals[AbilityGenerationMethod.RANDOM]} random`,
        },
        {
            title: "Spell templates",
            value: totalSpells.toString(),
            detail: totalSpells > 0 ? "Custom targeting ready" : "Log your first spell",
        },
        isGuest
            ? {
                title: "Guest access",
                value: "Limited (1 hero)",
                detail: "Sign in to unlock leveling, items, and spells",
            }
            : {
                title: "Account created",
                value: user.createdAt.toLocaleDateString(),
                detail: user.email,
            },
        {
            title: "Latest update",
            value: latestCharacter ? latestCharacter.name : "No activity yet",
            detail: latestCharacter ? latestCharacter.updatedAt.toLocaleDateString() : "Forge a hero to start tracking",
        },
    ];

    const rosterPreview = characters.slice(0, 3).map((character) => ({
        id: character.id,
        name: character.name,
        level: character.level,
        charClass: character.charClass,
        ancestry: character.ancestry,
        background: character.background,
        alignment: character.alignment,
        generationMethod: character.generationMethod,
        abilityScores: (character.abilityScores as Record<string, number>) ?? {},
        proficiencies: character.proficiencies
            ? ({ ...EMPTY_PROFICIENCIES, ...(character.proficiencies as Record<string, string[]>) })
            : { ...EMPTY_PROFICIENCIES },
        spellsCount: character.spells.length,
        updatedAt: character.updatedAt,
    }));

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
                <header className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Dashboard</p>
                    <h1 className="text-3xl font-semibold text-white sm:text-4xl">Welcome back, {user.name ?? "Adventurer"}</h1>
                    <p className="max-w-3xl text-sm text-white/70">
                        Review your roster, recent updates, and quick actions without leaving this panel.
                    </p>
                    {isGuest && (
                        <p className="text-xs text-white/60">Guest mode is limited to one hero and basic features. Sign in to unlock leveling, items, and spells.</p>
                    )}
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href="/characters"
                            className="rounded-full bg-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                        >
                            Open roster
                        </Link>
                        <Link
                            href="/characters#forge"
                            className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-rose-200"
                        >
                            Forge new hero
                        </Link>
                    </div>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {summaryCards.map((card) => (
                        <Card
                            key={card.title}
                            collapsible
                            title={card.title}
                            titleAs="p"
                            titleClassName="text-xs uppercase tracking-[0.25em] text-white/60"
                            className="rounded-3xl border border-white/10 bg-white/5 p-5"
                        >
                            <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
                            <p className="mt-2 text-sm text-white/70">{card.detail}</p>
                        </Card>
                    ))}
                </section>

                <Card as="section" className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <h2 className="text-lg font-semibold text-white">Latest character activity</h2>
                    {latestCharacter ? (
                        <div className="mt-4">
                            <CharacterCard
                                character={{
                                    id: latestCharacter.id,
                                    name: latestCharacter.name,
                                    level: latestCharacter.level,
                                    charClass: latestCharacter.charClass,
                                    ancestry: latestCharacter.ancestry,
                                    background: latestCharacter.background,
                                    alignment: latestCharacter.alignment,
                                    generationMethod: latestCharacter.generationMethod,
                                    abilityScores: (latestCharacter.abilityScores as Record<string, number>) ?? {},
                                    proficiencies: latestCharacter.proficiencies
                                        ? ({
                                            ...EMPTY_PROFICIENCIES,
                                            ...(latestCharacter.proficiencies as Record<string, string[]>),
                                        })
                                        : { ...EMPTY_PROFICIENCIES },
                                    spellsCount: latestCharacter.spells.length,
                                    updatedAt: latestCharacter.updatedAt,
                                }}
                                disableLevelUp={isGuest}
                            />
                        </div>
                    ) : (
                        <p className="mt-6 text-sm text-white/60">No characters yet. Use the forge to create your first adventurer.</p>
                    )}
                </Card>

                <Card as="section" className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Roster snapshot</h2>
                            <p className="text-sm text-white/70">A quick glance at your three most recently updated characters.</p>
                        </div>
                        <Link href="/characters" className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200 underline-offset-4 hover:underline">
                            View full roster
                        </Link>
                    </div>
                    {rosterPreview.length ? (
                        <div className="mt-6 grid gap-4 lg:grid-cols-3">
                            {rosterPreview.map((character) => (
                                <CharacterCard key={character.id} character={character} disableLevelUp={isGuest} />
                            ))}
                        </div>
                    ) : (
                        <p className="mt-6 text-sm text-white/60">No roster yet. Create a hero to populate your dashboard.</p>
                    )}
                </Card>
            </main>
        </div>
    );
}
