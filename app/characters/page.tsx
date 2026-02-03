import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import Link from "next/link";

import { CharacterCard } from "@/components/characters/character-card";
import { authOptions } from "@/lib/auth";
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
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        redirect("/");
    }

    const characters = await prisma.character.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
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
        armorBonus: character.armorBonus,
        shieldBonus: character.shieldBonus,
        miscBonus: character.miscBonus,
        spellsCount: character.spells.length,
        updatedAt: character.updatedAt,
    }));

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(250,232,214,0.15),_transparent_45%),_#050506] text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
                <header className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Roster</p>
                    <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">Manage your party vault</h1>
                    <p className="max-w-2xl text-sm text-white/70">
                        Track every character, lock in ability generation methods, and keep spell geometry tidy. Export-ready layouts launch soon, but you can start sculpting now.
                    </p>
                </header>

                <section id="forge" className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <h2 className="text-lg font-semibold">Create a character</h2>
                    <p className="text-sm text-white/70">
                        Launch the dedicated forge to walk through ability method, ancestry, and class with live previews and guided steps.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            href="/characters/create"
                            className="rounded-full bg-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300"
                        >
                            Start creation flow
                        </Link>
                        <Link
                            href="/dashboard"
                            className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/40"
                        >
                            Back to dashboard
                        </Link>
                    </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {serialized.length === 0 ? (
                        <div className="col-span-full rounded-3xl border border-dashed border-white/20 bg-black/40 p-8 text-center text-white/60">
                            <p>No characters yet. Use the forge above to conjure your first hero.</p>
                        </div>
                    ) : (
                        serialized.map((character) => <CharacterCard key={character.id} character={character} />)
                    )}
                </section>
            </main>
        </div>
    );
}
