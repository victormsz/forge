import Link from "next/link";
import { formatSubclassName } from "@/lib/characters/level-up-options";

type Props = {
    character: {
        id: string;
        name: string;
        level: number;
        charClass: string | null;
        subclass: string | null;
        ancestry: string | null;
        background: string | null;
        alignment: string | null;
    };
    isOwner: boolean;
};

export function SheetHeader({ character, isOwner }: Props) {
    const ancestryLine =
        [character.ancestry, character.background, character.alignment].filter(Boolean).join(" · ") ||
        "Awaiting ancestry, background, and alignment.";

    const classLine = character.charClass
        ? `Level ${character.level} ${character.charClass}${character.subclass ? ` (${formatSubclassName(character.subclass)})` : ""}`
        : `Level ${character.level}`;

    return (
        <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-rose-200">Character Sheet</p>
                    <div className="flex-1 h-px bg-gradient-to-r from-rose-200/30 to-transparent" />
                </div>
                <h1 className="text-4xl font-bold text-white sm:text-5xl truncate">{character.name}</h1>
                <p className="mt-2 text-lg text-white/80">{classLine}</p>
                <p className="mt-1 text-sm text-white/60">{ancestryLine}</p>
                {!isOwner && (
                    <p className="mt-3 text-xs text-rose-200/80">
                        Viewing as DM for a party member. Editing tools are disabled.
                    </p>
                )}
            </div>
            <div className="flex flex-wrap gap-3">
                <Link
                    href="/characters"
                    className="rounded-xl border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50"
                >
                    Back to roster
                </Link>
                {isOwner && (
                    <>
                        <Link
                            href={`/characters/${character.id}/items`}
                            className="rounded-xl border border-sky-400/40 bg-sky-400/10 px-5 py-2.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-400/20"
                        >
                            Inventory
                        </Link>
                        <Link
                            href={`/characters/${character.id}/spells`}
                            className="rounded-xl border border-blue-400/40 bg-blue-400/10 px-5 py-2.5 text-sm font-semibold text-blue-300 transition hover:bg-blue-400/20"
                        >
                            Spells
                        </Link>
                        <Link
                            href={`/characters/${character.id}/level-up`}
                            className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-400/20"
                        >
                            Level up
                        </Link>
                    </>
                )}
                <Link
                    href={`/api/characters/${character.id}/sheet`}
                    prefetch={false}
                    className="rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition hover:shadow-rose-400/40 hover:scale-[1.02]"
                >
                    Export PDF
                </Link>
            </div>
        </div>
    );
}
