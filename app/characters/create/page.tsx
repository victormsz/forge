import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateCharacterWizard } from "@/components/characters/create-character-wizard";
import { createCharacter } from "@/app/characters/actions";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "ForgeSheet | Create Character",
    description: "Guided ForgeSheet flow for D&D 5.5 heroes with live previews and step-by-step decisions.",
};

export default async function CharacterCreatePage() {
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    if (actor.isGuest) {
        const existingCharacters = await prisma.character.count({ where: { userId: actor.userId } });

        if (existingCharacters >= 1) {
            redirect("/characters");
        }
    }

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
                <header className="space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Creation Flow</p>
                    <h1 className="text-3xl font-semibold text-white sm:text-4xl">Forge a new D&D 5.5 hero</h1>
                    <p className="max-w-3xl text-sm text-white/70">
                        Move through each decision with live previews above and interactive selections below. When you are satisfied, the hero is saved to your roster instantly.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/characters" className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200 underline-offset-4 hover:underline">
                            Back to roster
                        </Link>
                        <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70 underline-offset-4 hover:text-white hover:underline">
                            View dashboard
                        </Link>
                    </div>
                </header>

                <CreateCharacterWizard action={createCharacter} />
            </main>
        </div>
    );
}
