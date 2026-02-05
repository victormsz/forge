import type { Metadata } from "next";
import { redirect } from "next/navigation";

import Link from "next/link";

import { CharacterCard } from "@/components/characters/character-card";
import { Card } from "@/components/ui/card";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "ForgeSheet | Characters",
    description: "Manage your D&D 5.5 roster with point-buy or random builds, spells, and export-ready sheets.",
};

const EMPTY_PROFICIENCIES = {
    armor: [] as string[],
    weapons: [] as string[],
    tools: [] as string[],
    skills: [] as string[],
    languages: [] as string[],
};

export default async function CharactersPage() {
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const isGuest = actor.role === "guest";

    const characters = await prisma.character.findMany({
        where: { userId: actor.userId },
        // Keep roster positions stable so characters don't jump around after updates.
        orderBy: [
            { createdAt: "asc" },
            { name: "asc" },
            { id: "asc" },
        ],
        include: { spells: { select: { id: true } } },
    });

    const serialized = characters.map((character) => ({
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

    const guestLimitReached = isGuest && serialized.length >= 1;

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
                <header className="space-y-3">
                    <div className="flex items-center gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Roster</p>
                        <div className="flex-1 h-px bg-gradient-to-r from-rose-200/30 to-transparent"></div>
                    </div>
                    <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">Your Characters</h1>
                    <p className="max-w-2xl text-base text-white/80">
                        Track your party, tune builds, and export clean character sheets.
                    </p>
                </header>

                <Card
                    as="section"
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 backdrop-blur-sm shadow-2xl"
                >
                    <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white">Create New Character</h2>
                            <p className="mt-2 text-base text-white/80">
                                Guided steps for abilities, ancestry, class, and spells.
                            </p>
                            {isGuest && (
                                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
                                    <p className="text-sm text-amber-200/90">
                                        <strong>Guest limitation:</strong> Create one character. Sign in to unlock unlimited characters, leveling, and advanced features.
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-3">
                            {guestLimitReached ? (
                                <span
                                    aria-disabled="true"
                                    className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/40 cursor-not-allowed"
                                >
                                    Character Limit Reached
                                </span>
                            ) : (
                                <Link
                                    href="/characters/create"
                                    className="rounded-xl bg-gradient-to-r from-rose-500 to-rose-400 px-8 py-4 text-sm font-bold text-white shadow-lg transition hover:shadow-rose-400/40 hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Create character
                                </Link>
                            )}
                            <Link
                                href="/dashboard"
                                className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:border-white/50"
                            >
                                Back to dashboard
                            </Link>
                        </div>
                    </div>
                </Card>

                <section>
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">Your Characters ({serialized.length})</h2>
                        {serialized.length > 0 && (
                            <p className="text-sm text-white/60">Last updated {serialized[0].updatedAt.toLocaleDateString()}</p>
                        )}
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {serialized.length === 0 ? (
                            <Card className="col-span-full rounded-2xl border-2 border-dashed border-white/20 bg-black/20 p-12 text-center">
                                <div className="mx-auto max-w-sm space-y-4">
                                    <p className="text-lg font-semibold text-white/80">No characters yet</p>
                                    <p className="text-sm text-white/60">Create your first character to start tracking your roster.</p>
                                </div>
                            </Card>
                        ) : (
                            serialized.map((character) => (
                                <CharacterCard key={character.id} character={character} disableLevelUp={isGuest} />
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
