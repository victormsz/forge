"use client";

import { useCallback, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { useFormStatus } from "react-dom";

import type { AbilityKey, AbilityScores } from "@/lib/point-buy";
import {
    ABILITY_KEYS,
    DEFAULT_ABILITY_SCORES,
    MAX_ABILITY_SCORE,
    MIN_ABILITY_SCORE,
    POINT_BUY_BUDGET,
    RANDOM_MAX_ABILITY_SCORE,
    RANDOM_MIN_ABILITY_SCORE,
    calculatePointBuyCost,
    getIncrementalPointCost,
} from "@/lib/point-buy";

type AbilityGenerationMethod = "POINT_BUY" | "RANDOM";

interface CreateCharacterWizardProps {
    action: (formData: FormData) => void;
}

const abilityOptions: { label: string; value: AbilityGenerationMethod; description: string }[] = [
    {
        label: "Point Buy",
        value: "POINT_BUY",
        description: "Plan every stat with a 27-point budget and variant rules.",
    },
    {
        label: "Random Rolls",
        value: "RANDOM",
        description: "Trust the dice gods with 4d6 drop-lowest ability rolls.",
    },
];

const ancestryOptions = [
    {
        label: "Human",
        value: "Human",
        description: "Adaptable excellence across every class.",
        detail: "Humans thrive in any environment, picking up regional tricks and diplomatic savvy in equal measure.",
    },
    {
        label: "Elf",
        value: "Elf",
        description: "Graceful experts with sharp minds and senses.",
        detail: "Elven lineages gift keen senses, a trance-like meditative rest, and timeless lore passed down in song.",
    },
    {
        label: "Dwarf",
        value: "Dwarf",
        description: "Stalwart defenders with deep artisan roots.",
        detail: "Dwarves train from childhood with tools and axes, bolstered by hearty constitutions and clan oaths.",
    },
    {
        label: "Halfling",
        value: "Halfling",
        description: "Lucky nimble souls who dodge danger.",
        detail: "Halflings blend optimism with supernatural luck, slipping past giants and calamity with a grin.",
    },
    {
        label: "Dragonborn",
        value: "Dragonborn",
        description: "Heritage of dragons, breath weapons included.",
        detail: "Draconic ancestry fuels elemental breath, proud honor codes, and intimidating presence on any battlefield.",
    },
    {
        label: "Orc",
        value: "Orc",
        description: "Relentless strength, perfect for frontline heroes.",
        detail: "Orcs carry ancestral fury that converts into raw power and tireless endurance during extended fights.",
    },
];

const backgroundOptions = [
    {
        label: "Soldier",
        value: "Soldier",
        description: "Campaign-hardened veteran.",
        detail: "You drilled in formations, know army jargon, and can still call in favors from your old unit.",
    },
    {
        label: "Sage",
        value: "Sage",
        description: "Archivist of esoteric lore.",
        detail: "Years in libraries honed your memory for obscure myths, planar theory, and ancient scripts.",
    },
    {
        label: "Outlander",
        value: "Outlander",
        description: "Warden of the wilds.",
        detail: "You can always find food and know hidden trails thanks to seasons spent tracking beasts and storms.",
    },
    {
        label: "Noble",
        value: "Noble",
        description: "Court-savvy aristocrat.",
        detail: "Diplomacy, etiquette, and heraldry are second nature, and household retainers still recognize your crest.",
    },
    {
        label: "Acolyte",
        value: "Acolyte",
        description: "Raised by the temple.",
        detail: "You know liturgies, sacred calendars, and have pull within your faith's hierarchy for shelter or aid.",
    },
    {
        label: "Urchin",
        value: "Urchin",
        description: "Streetwise survivor.",
        detail: "City alleys taught you smuggler cant, secret paths through markets, and how to vanish in a crowd.",
    },
];

const alignmentOptions = [
    { label: "Lawful Good", value: "Lawful Good", description: "Orderly altruist upholding codes." },
    { label: "Neutral Good", value: "Neutral Good", description: "Helps others without rigid rules." },
    { label: "Chaotic Good", value: "Chaotic Good", description: "Follows conscience over laws." },
    { label: "Lawful Neutral", value: "Lawful Neutral", description: "Prioritizes structure and duty." },
    { label: "True Neutral", value: "True Neutral", description: "Balances forces without bias." },
    { label: "Chaotic Neutral", value: "Chaotic Neutral", description: "Values freedom above all." },
    { label: "Lawful Evil", value: "Lawful Evil", description: "Manipulates systems for gain." },
    { label: "Neutral Evil", value: "Neutral Evil", description: "Self-serving opportunist." },
    { label: "Chaotic Evil", value: "Chaotic Evil", description: "Sows destruction for personal whim." },
];

const classOptions = [
    { label: "Barbarian", value: "Barbarian", description: "Rage-fueled frontline bruiser." },
    { label: "Bard", value: "Bard", description: "Versatile support with spellcraft and song." },
    { label: "Cleric", value: "Cleric", description: "Divine caster anchoring any party." },
    { label: "Druid", value: "Druid", description: "Shapeshifter commanding primal magic." },
    { label: "Fighter", value: "Fighter", description: "Weapon master with unmatched flexibility." },
    { label: "Monk", value: "Monk", description: "Martial artist channeling ki." },
    { label: "Paladin", value: "Paladin", description: "Oath-bound warrior with radiant smites." },
    { label: "Ranger", value: "Ranger", description: "Skilled scout with nature magic." },
    { label: "Rogue", value: "Rogue", description: "Stealth expert and crit fisher." },
    { label: "Sorcerer", value: "Sorcerer", description: "Innate arcane talent, metamagic tricks." },
    { label: "Warlock", value: "Warlock", description: "Pact mage with eldritch invocations." },
    { label: "Wizard", value: "Wizard", description: "Prepared arcane scholar with vast spellbooks." },
];

const abilityMeta: Record<AbilityKey, { label: string; summary: string }> = {
    str: { label: "Strength", summary: "Melee damage and athletics" },
    dex: { label: "Dexterity", summary: "Initiative, AC, stealth" },
    con: { label: "Constitution", summary: "Hit points and endurance" },
    int: { label: "Intelligence", summary: "Arcana, investigation" },
    wis: { label: "Wisdom", summary: "Perception, spell DCs" },
    cha: { label: "Charisma", summary: "Social checks, spell DCs" },
};

const baseSteps = [
    { id: "core", title: "Core Details", description: "Name your hero and choose ability generation." },
    { id: "ancestry", title: "Choose Ancestry", description: "Pick the people and culture that shaped them." },
    { id: "background", title: "Select Background", description: "Ground them in a life before adventuring." },
    { id: "class", title: "Select Class", description: "Lock their primary toolkit for adventures." },
    { id: "alignment", title: "Set Alignment", description: "Capture their guiding ethos." },
];

const randomAbilityStep = {
    id: "random-abilities",
    title: "Roll Ability Scores",
    description: "Drop 4d6 sets, keep the highest three, and slot totals into your stats.",
};

const MIN_NAME_LENGTH = 2;

interface RolledSet {
    id: string;
    dice: number[];
    keptTotal: number;
    droppedIndex: number;
}

type RollAssignments = Record<string, AbilityKey | null>;

const RANDOM_ROLL_COUNT = 6;

function generateRollId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `roll-${Math.random().toString(36).slice(2)}`;
}

function rollFourDSixDropLowest(): RolledSet {
    const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    const sorted = dice
        .map((value, index) => ({ value, index }))
        .sort((a, b) => (a.value === b.value ? a.index - b.index : a.value - b.value));
    const droppedIndex = sorted[0].index;
    const keptTotal = dice.reduce((total, value, index) => (index === droppedIndex ? total : total + value), 0);

    return {
        id: generateRollId(),
        dice,
        keptTotal,
        droppedIndex,
    };
}

function createManualScoreState(seed?: AbilityScores) {
    return ABILITY_KEYS.reduce((acc, ability) => {
        const value = seed?.[ability];
        acc[ability] = typeof value === "number" ? String(value) : "";
        return acc;
    }, {} as Record<AbilityKey, string>);
}

interface WizardFormState {
    name: string;
    method: AbilityGenerationMethod;
    ancestry: string;
    charClass: string;
    background: string;
    alignment: string;
    abilityScores: AbilityScores;
}

function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={disabled || pending}
            className="w-full rounded-2xl bg-rose-400 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-black transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Forging..." : "Forge character"}
        </button>
    );
}

export function CreateCharacterWizard({ action }: CreateCharacterWizardProps) {
    const [step, setStep] = useState(0);
    const [formState, setFormState] = useState<WizardFormState>(() => ({
        name: "",
        method: abilityOptions[0].value,
        ancestry: "",
        charClass: "",
        background: "",
        alignment: "",
        abilityScores: { ...DEFAULT_ABILITY_SCORES },
    }));
    const [rolledSets, setRolledSets] = useState<RolledSet[]>([]);
    const [rollAssignments, setRollAssignments] = useState<RollAssignments>({});
    const [draggedRollId, setDraggedRollId] = useState<string | null>(null);
    const [manualEntryMode, setManualEntryMode] = useState(false);
    const [manualScores, setManualScores] = useState<Record<AbilityKey, string>>(() => createManualScoreState());
    const [hoveredAncestry, setHoveredAncestry] = useState<string | null>(null);
    const [hoveredBackground, setHoveredBackground] = useState<string | null>(null);

    const isPointBuy = formState.method === "POINT_BUY";

    const activeSteps = useMemo(() => {
        if (formState.method === "RANDOM") {
            return [baseSteps[0], randomAbilityStep, ...baseSteps.slice(1)];
        }
        return baseSteps;
    }, [formState.method]);

    const currentStep = activeSteps[step] ?? activeSteps[activeSteps.length - 1];

    const totalPointBuySpent = useMemo(
        () => (isPointBuy ? calculatePointBuyCost(formState.abilityScores) : 0),
        [isPointBuy, formState.abilityScores],
    );
    const pointsRemaining = POINT_BUY_BUDGET - totalPointBuySpent;
    const pointBuyBudgetValid = !isPointBuy || pointsRemaining >= 0;

    const rollLookup = useMemo(() => {
        const map = new Map<string, RolledSet>();
        rolledSets.forEach((roll) => {
            map.set(roll.id, roll);
        });
        return map;
    }, [rolledSets]);

    const rollByAbility = useMemo(() => {
        const map: Partial<Record<AbilityKey, string>> = {};
        Object.entries(rollAssignments).forEach(([rollId, assignedAbility]) => {
            if (assignedAbility) {
                map[assignedAbility] = rollId;
            }
        });
        return map;
    }, [rollAssignments]);

    const manualEntryValid = manualEntryMode
        ? ABILITY_KEYS.every((ability) => {
            const rawValue = manualScores[ability]?.trim();
            if (!rawValue) {
                return false;
            }
            const numericValue = Number(rawValue);
            return (
                Number.isFinite(numericValue) &&
                numericValue >= RANDOM_MIN_ABILITY_SCORE &&
                numericValue <= RANDOM_MAX_ABILITY_SCORE
            );
        })
        : true;

    const diceAssignmentsComplete = ABILITY_KEYS.every((ability) => Boolean(rollByAbility[ability]));
    const randomStepComplete = manualEntryMode ? manualEntryValid : diceAssignmentsComplete;
    const randomAssignmentsComplete = formState.method !== "RANDOM" || randomStepComplete;
    const generationReady = formState.method === "POINT_BUY" ? pointBuyBudgetValid : randomAssignmentsComplete;

    const methodLabel = abilityOptions.find((option) => option.value === formState.method)?.label ?? abilityOptions[0].label;
    const progress = ((step + 1) / activeSteps.length) * 100;

    const resetAbilityScoresToDefault = useCallback(() => {
        setFormState((prev) => ({ ...prev, abilityScores: { ...DEFAULT_ABILITY_SCORES } }));
    }, [setFormState]);

    const handleManualScoreChange = useCallback(
        (ability: AbilityKey, rawValue: string) => {
            const sanitized = rawValue.replace(/[^0-9]/g, "");
            setManualScores((prev) => ({ ...prev, [ability]: sanitized }));
            if (sanitized === "") {
                setFormState((prev) => {
                    if (prev.method !== "RANDOM") {
                        return prev;
                    }
                    return {
                        ...prev,
                        abilityScores: { ...prev.abilityScores, [ability]: DEFAULT_ABILITY_SCORES[ability] },
                    };
                });
                return;
            }
            const numericValue = Number(sanitized);
            if (!Number.isFinite(numericValue)) {
                return;
            }
            const clamped = Math.max(
                RANDOM_MIN_ABILITY_SCORE,
                Math.min(RANDOM_MAX_ABILITY_SCORE, numericValue),
            );
            setFormState((prev) => {
                if (prev.method !== "RANDOM") {
                    return prev;
                }
                return {
                    ...prev,
                    abilityScores: { ...prev.abilityScores, [ability]: clamped },
                };
            });
        },
        [setManualScores, setFormState],
    );

    const rollAllPools = useCallback(() => {
        if (formState.method !== "RANDOM") {
            return;
        }

        const pools = Array.from({ length: RANDOM_ROLL_COUNT }, () => rollFourDSixDropLowest());
        const assignments: RollAssignments = {};
        pools.forEach((pool) => {
            assignments[pool.id] = null;
        });

        setRolledSets(pools);
        setRollAssignments(assignments);
        setDraggedRollId(null);
        resetAbilityScoresToDefault();
    }, [formState.method, resetAbilityScoresToDefault]);

    const resetRandomAssignments = useCallback(() => {
        setRolledSets([]);
        setRollAssignments({});
        setDraggedRollId(null);
    }, []);


    const assignRollToAbility = useCallback(
        (rollId: string, ability: AbilityKey) => {
            if (manualEntryMode) {
                return;
            }
            const roll = rollLookup.get(rollId);
            if (!roll) {
                return;
            }

            const updatedAssignments: RollAssignments = { ...rollAssignments };
            if (updatedAssignments[rollId] === ability) {
                return;
            }

            const previousAbilityForRoll = updatedAssignments[rollId];
            Object.entries(updatedAssignments).forEach(([id, assignedAbility]) => {
                if (id !== rollId && assignedAbility === ability) {
                    updatedAssignments[id] = null;
                }
            });

            updatedAssignments[rollId] = ability;
            setRollAssignments(updatedAssignments);

            setFormState((prev) => {
                if (prev.method !== "RANDOM") {
                    return prev;
                }
                const nextScores: AbilityScores = { ...prev.abilityScores };
                if (previousAbilityForRoll) {
                    nextScores[previousAbilityForRoll] = DEFAULT_ABILITY_SCORES[previousAbilityForRoll];
                }
                nextScores[ability] = roll.keptTotal;
                return { ...prev, abilityScores: nextScores };
            });
        },
        [manualEntryMode, rollAssignments, rollLookup, setFormState],
    );

    const clearAbilitySlot = useCallback(
        (ability: AbilityKey) => {
            if (manualEntryMode) {
                return;
            }
            const updatedAssignments: RollAssignments = { ...rollAssignments };
            let mutated = false;
            Object.entries(updatedAssignments).forEach(([rollId, assignedAbility]) => {
                if (assignedAbility === ability) {
                    updatedAssignments[rollId] = null;
                    mutated = true;
                }
            });

            if (!mutated) {
                return;
            }

            setRollAssignments(updatedAssignments);
            setFormState((prev) => {
                if (prev.method !== "RANDOM") {
                    return prev;
                }
                return {
                    ...prev,
                    abilityScores: { ...prev.abilityScores, [ability]: DEFAULT_ABILITY_SCORES[ability] },
                };
            });
        },
        [manualEntryMode, rollAssignments, setFormState],
    );

    const handleRollDragStart = useCallback((event: DragEvent<HTMLDivElement>, rollId: string) => {
        event.dataTransfer.setData("text/plain", rollId);
        event.dataTransfer.effectAllowed = "move";
        setDraggedRollId(rollId);
    }, []);

    const handleAbilityDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

    const handleAbilityDrop = useCallback(
        (event: DragEvent<HTMLDivElement>, ability: AbilityKey) => {
            event.preventDefault();
            const rollId = event.dataTransfer.getData("text/plain");
            if (!rollId) {
                return;
            }
            assignRollToAbility(rollId, ability);
            setDraggedRollId(null);
        },
        [assignRollToAbility],
    );

    const toggleManualEntryMode = () => {
        if (formState.method !== "RANDOM") {
            return;
        }
        if (manualEntryMode) {
            setManualEntryMode(false);
            setManualScores(createManualScoreState());
            resetAbilityScoresToDefault();
            resetRandomAssignments();
            rollAllPools();
            return;
        }
        setManualEntryMode(true);
        setManualScores(createManualScoreState());
        resetAbilityScoresToDefault();
        resetRandomAssignments();
    };

    const handleNext = () => {
        if (!canAdvance) {
            return;
        }
        setStep((prev) => {
            const nextIndex = Math.min(prev + 1, activeSteps.length - 1);
            if (
                activeSteps[nextIndex]?.id === "random-abilities" &&
                !manualEntryMode &&
                rolledSets.length === 0
            ) {
                rollAllPools();
            }
            return nextIndex;
        });
    };

    const handleBack = () => {
        if (step === 0) {
            return;
        }

        const current = activeSteps[step];
        if (current?.id === "random-abilities") {
            resetRandomAssignments();
            resetAbilityScoresToDefault();
            setManualEntryMode(false);
            setManualScores(createManualScoreState());
        }

        setStep((prev) => Math.max(prev - 1, 0));
    };

    const canAdvance = (() => {
        if (!currentStep) {
            return false;
        }

        switch (currentStep.id) {
            case "core":
                return formState.name.trim().length >= MIN_NAME_LENGTH && (isPointBuy ? pointBuyBudgetValid : true);
            case "random-abilities":
                return randomAssignmentsComplete;
            case "ancestry":
                return Boolean(formState.ancestry);
            case "background":
                return Boolean(formState.background);
            case "class":
                return Boolean(formState.charClass);
            case "alignment":
                return Boolean(formState.alignment);
            default:
                return true;
        }
    })();

    const canSubmit =
        formState.name.trim().length >= MIN_NAME_LENGTH &&
        Boolean(formState.ancestry) &&
        Boolean(formState.background) &&
        Boolean(formState.charClass) &&
        Boolean(formState.alignment) &&
        generationReady;

    const adjustAbilityScore = (ability: AbilityKey, delta: 1 | -1) => {
        if (!isPointBuy) {
            return;
        }

        setFormState((prev) => {
            const currentValue = prev.abilityScores[ability];
            const nextValue = currentValue + delta;

            if (nextValue < MIN_ABILITY_SCORE || nextValue > MAX_ABILITY_SCORE) {
                return prev;
            }

            const updatedScores: AbilityScores = {
                ...prev.abilityScores,
                [ability]: nextValue,
            };

            if (calculatePointBuyCost(updatedScores) > POINT_BUY_BUDGET) {
                return prev;
            }

            return { ...prev, abilityScores: updatedScores };
        });
    };

    return (
        <form action={action} className="mt-2 flex flex-col gap-6" aria-labelledby="character-wizard-title">
            <input type="hidden" name="name" value={formState.name} />
            <input type="hidden" name="method" value={formState.method} />
            <input type="hidden" name="ancestry" value={formState.ancestry} />
            <input type="hidden" name="class" value={formState.charClass} />
            <input type="hidden" name="background" value={formState.background} />
            <input type="hidden" name="alignment" value={formState.alignment} />
            <input type="hidden" name="abilityScores" value={JSON.stringify(formState.abilityScores)} />
            <div className="space-y-6">
                <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/0 p-6 shadow-lg">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Live preview</p>
                            <h2 className="text-3xl font-semibold text-white">{formState.name.trim() || "Unnamed hero"}</h2>
                        </div>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                            Step {String(step + 1).padStart(2, "0")} / {String(activeSteps.length).padStart(2, "0")}
                        </p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Ability Method</p>
                            <p className="mt-1 text-lg font-semibold text-white">{methodLabel}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Ancestry</p>
                            <p className="mt-1 text-lg font-semibold text-white">{formState.ancestry || "Pending"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Class</p>
                            <p className="mt-1 text-lg font-semibold text-white">{formState.charClass || "Pending"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Background</p>
                            <p className="mt-1 text-lg font-semibold text-white">{formState.background || "Pending"}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/60">Alignment</p>
                            <p className="mt-1 text-lg font-semibold text-white">{formState.alignment || "Pending"}</p>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ABILITY_KEYS.map((ability) => (
                            <div key={ability} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                                <p className="text-[0.55rem] uppercase tracking-[0.35em] text-white/50">{abilityMeta[ability].label}</p>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <p className="text-2xl font-semibold text-white">{formState.abilityScores[ability]}</p>
                                    <p className="text-xs text-white/50">{ability.toUpperCase()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 h-2 w-full rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                </section>

                <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">{currentStep.title}</p>
                        <p className="text-sm text-white/70">{currentStep.description}</p>
                    </div>

                    {currentStep.id === "core" && (
                        <div className="mt-6 space-y-4">
                            <label className="flex w-full flex-col text-sm font-semibold uppercase tracking-wide text-white/70">
                                Hero name
                                <input
                                    type="text"
                                    name="display-name"
                                    placeholder="E.g. Nyx Stormveil"
                                    value={formState.name}
                                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                                    className="mt-2 rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-base font-normal text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                                />
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                                {abilityOptions.map((option) => (
                                    <button
                                        type="button"
                                        key={option.value}
                                        onClick={() => {
                                            if (formState.method === option.value) {
                                                return;
                                            }
                                            resetRandomAssignments();
                                            setManualEntryMode(false);
                                            setManualScores(createManualScoreState());
                                            setFormState((prev) => ({
                                                ...prev,
                                                method: option.value,
                                                abilityScores: { ...DEFAULT_ABILITY_SCORES },
                                            }));
                                            setStep(0);
                                        }}
                                        className={`rounded-2xl border px-4 py-4 text-left transition ${formState.method === option.value
                                            ? "border-rose-300 bg-rose-300/10"
                                            : "border-white/15 bg-black/30 hover:border-white/30"
                                            }`}
                                    >
                                        <p className="text-sm font-semibold text-white">{option.label}</p>
                                        <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                    </button>
                                ))}
                            </div>
                            {isPointBuy && (
                                <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Point buy pool</p>
                                            <p className={`text-xl font-semibold ${pointsRemaining >= 0 ? "text-white" : "text-rose-300"}`}>
                                                {pointsRemaining} pts remaining
                                            </p>
                                        </div>
                                        <p className="text-xs text-white/60">
                                            Scores stay between {MIN_ABILITY_SCORE} and {MAX_ABILITY_SCORE} following the PHB cost curve.
                                        </p>
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {ABILITY_KEYS.map((ability) => {
                                            const score = formState.abilityScores[ability];
                                            const incrementCost = getIncrementalPointCost(score);
                                            const canDecrease = score > MIN_ABILITY_SCORE;
                                            const canIncrease = incrementCost !== Infinity && incrementCost <= pointsRemaining;

                                            return (
                                                <div key={ability} className="rounded-2xl border border-white/15 bg-black/50 p-4">
                                                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
                                                        {abilityMeta[ability].label}
                                                    </p>
                                                    <p className="text-xs text-white/50">{abilityMeta[ability].summary}</p>
                                                    <div className="mt-4 flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustAbilityScore(ability, -1)}
                                                            disabled={!canDecrease}
                                                            className="rounded-full border border-white/20 px-2 py-1 text-sm text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                                                            aria-label={`Decrease ${abilityMeta[ability].label}`}
                                                        >
                                                            -
                                                        </button>
                                                        <div className="flex flex-col items-center text-white">
                                                            <span className="text-3xl font-semibold">{score}</span>
                                                            {incrementCost !== Infinity && (
                                                                <span className="text-[0.6rem] uppercase tracking-[0.3em] text-white/50">
                                                                    +{incrementCost} pts
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => adjustAbilityScore(ability, 1)}
                                                            disabled={!canIncrease}
                                                            className="rounded-full border border-white/20 px-2 py-1 text-sm text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                                                            aria-label={`Increase ${abilityMeta[ability].label}`}
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep.id === "random-abilities" && (
                        <div className="mt-6 space-y-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="rounded-2xl border border-white/15 bg-black/30 p-5 text-sm text-white/70">
                                    <p>
                                        Six pools of 4d6 roll at once when you advance from Core Details. Each pool shows four dice with the
                                        lowest die automatically faded and removed from the total.
                                    </p>
                                    <p className="mt-2 text-xs text-white/60">
                                        Drag any total onto the stat cards below to lock it in or switch to manual entry if you already have your
                                        rolls.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleManualEntryMode}
                                    className="rounded-full border border-white/20 px-5 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-rose-300 hover:text-rose-200"
                                >
                                    {manualEntryMode ? "Use generated pools" : "I will roll them myself"}
                                </button>
                            </div>

                            {manualEntryMode ? (
                                <div className="rounded-2xl border border-white/15 bg-black/40 p-6">
                                    <div className="flex flex-col gap-2 text-sm text-white/70">
                                        <p>Type each ability result you rolled. We will keep everything between {RANDOM_MIN_ABILITY_SCORE} and {RANDOM_MAX_ABILITY_SCORE}.</p>
                                        {!manualEntryValid && (
                                            <p className="text-xs text-rose-200">
                                                Enter six totals between {RANDOM_MIN_ABILITY_SCORE} and {RANDOM_MAX_ABILITY_SCORE} to continue.
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {ABILITY_KEYS.map((ability) => {
                                            const value = manualScores[ability] ?? "";
                                            const trimmed = value.trim();
                                            const numericValue = trimmed === "" ? NaN : Number(trimmed);
                                            const hasError =
                                                trimmed !== "" &&
                                                (!Number.isFinite(numericValue) ||
                                                    numericValue < RANDOM_MIN_ABILITY_SCORE ||
                                                    numericValue > RANDOM_MAX_ABILITY_SCORE);
                                            return (
                                                <label key={ability} className={`flex flex-col rounded-2xl border px-4 py-4 ${hasError ? "border-rose-400 bg-rose-400/10" : "border-white/15 bg-black/40"}`}>
                                                    <span className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
                                                        {abilityMeta[ability].label}
                                                    </span>
                                                    <span className="text-xs text-white/50">{abilityMeta[ability].summary}</span>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={value}
                                                        onChange={(event) => handleManualScoreChange(ability, event.target.value)}
                                                        placeholder="--"
                                                        className="mt-3 rounded-2xl border border-white/20 bg-black/50 px-4 py-3 text-center text-2xl font-semibold text-white placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                                                    />
                                                    <span className="mt-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/50">
                                                        {RANDOM_MIN_ABILITY_SCORE}-{RANDOM_MAX_ABILITY_SCORE}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : rolledSets.length === 0 ? (
                                <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center text-sm text-white/70">
                                    Click Next on the previous step to roll your dice pools.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6 lg:flex-row">
                                    <div className="lg:w-5/12">
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                            {rolledSets.map((roll, index) => {
                                                const assignedAbility = rollAssignments[roll.id];
                                                return (
                                                    <div
                                                        key={roll.id}
                                                        className={`group rounded-2xl border px-4 py-4 transition ${assignedAbility ? "border-rose-300 bg-rose-300/5" : "border-white/15 bg-black/40"}`}
                                                        draggable
                                                        onDragStart={(event) => handleRollDragStart(event, roll.id)}
                                                        onDragEnd={() => setDraggedRollId(null)}
                                                    >
                                                        <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
                                                            <span>Pool {String(index + 1).padStart(2, "0")}</span>
                                                            <span>{assignedAbility ? abilityMeta[assignedAbility].label : "Unassigned"}</span>
                                                        </div>
                                                        <div className="mt-3 flex gap-2">
                                                            {roll.dice.map((dieValue, dieIndex) => (
                                                                <div
                                                                    key={`${roll.id}-die-${dieIndex}`}
                                                                    className={`flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-semibold text-white ${dieIndex === roll.droppedIndex
                                                                        ? "border-dashed border-white/30 bg-black/10 text-white/30"
                                                                        : "border-white/30 bg-white/10"
                                                                        }`}
                                                                >
                                                                    {dieValue}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <p className="mt-3 text-sm text-white/80">
                                                            <span className="text-2xl font-semibold text-white">{roll.keptTotal}</span> total after drop-lowest
                                                        </p>
                                                        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-white/50">Drag onto a stat</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex-1 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        {ABILITY_KEYS.map((ability) => {
                                            const assignedRollId = rollByAbility[ability];
                                            const assignedRoll = assignedRollId ? rollLookup.get(assignedRollId) : undefined;
                                            const isActiveDrop = Boolean(draggedRollId) && !assignedRoll;

                                            return (
                                                <div
                                                    key={ability}
                                                    onDragOver={handleAbilityDragOver}
                                                    onDrop={(event) => handleAbilityDrop(event, ability)}
                                                    className={`rounded-2xl border p-4 transition ${assignedRoll
                                                        ? "border-rose-300 bg-rose-300/10"
                                                        : isActiveDrop
                                                            ? "border-white/40 bg-white/10"
                                                            : "border-white/15 bg-black/40"
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">
                                                                {abilityMeta[ability].label}
                                                            </p>
                                                            <p className="text-xs text-white/50">{abilityMeta[ability].summary}</p>
                                                        </div>
                                                        {assignedRoll && (
                                                            <button
                                                                type="button"
                                                                onClick={() => clearAbilitySlot(ability)}
                                                                className="rounded-full border border-white/20 px-3 py-1 text-[0.55rem] uppercase tracking-[0.3em] text-white/70 transition hover:border-white/40"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="mt-4 text-center text-4xl font-semibold text-white">
                                                        {assignedRoll ? assignedRoll.keptTotal : "--"}
                                                    </div>
                                                    <p className="mt-1 text-center text-xs text-white/60">
                                                        {assignedRoll ? "Locked from pool" : "Drop a roll here"}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {currentStep.id === "ancestry" && (
                        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                            <div className="grid flex-1 gap-3 md:grid-cols-2">
                                {ancestryOptions.map((option) => {
                                    const active = formState.ancestry === option.value;
                                    return (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => setFormState((prev) => ({ ...prev, ancestry: option.value }))}
                                            onMouseEnter={() => setHoveredAncestry(option.value)}
                                            onMouseLeave={() => setHoveredAncestry(null)}
                                            onFocus={() => setHoveredAncestry(option.value)}
                                            className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-white">{option.label}</p>
                                            <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="lg:w-1/3">
                                {(() => {
                                    const insight = ancestryOptions.find((option) => option.value === (hoveredAncestry ?? formState.ancestry)) ?? ancestryOptions[0];
                                    return (
                                        <div className="rounded-2xl border border-white/15 bg-black/30 p-5">
                                            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Lore Focus</p>
                                            <p className="mt-2 text-lg font-semibold text-white">{insight.label}</p>
                                            <p className="mt-2 text-sm text-white/70">{insight.detail}</p>
                                            <p className="mt-3 text-xs text-white/50">Hover or focus a race to update.</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {currentStep.id === "background" && (
                        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                            <div className="grid flex-1 gap-3 md:grid-cols-2">
                                {backgroundOptions.map((option) => {
                                    const active = formState.background === option.value;
                                    return (
                                        <button
                                            type="button"
                                            key={option.value}
                                            onClick={() => setFormState((prev) => ({ ...prev, background: option.value }))}
                                            onMouseEnter={() => setHoveredBackground(option.value)}
                                            onMouseLeave={() => setHoveredBackground(null)}
                                            onFocus={() => setHoveredBackground(option.value)}
                                            className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                                }`}
                                        >
                                            <p className="text-sm font-semibold text-white">{option.label}</p>
                                            <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="lg:w-1/3">
                                {(() => {
                                    const insight =
                                        backgroundOptions.find((option) => option.value === (hoveredBackground ?? formState.background)) ??
                                        backgroundOptions[0];
                                    return (
                                        <div className="rounded-2xl border border-white/15 bg-black/30 p-5">
                                            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/60">Origin Spotlight</p>
                                            <p className="mt-2 text-lg font-semibold text-white">{insight.label}</p>
                                            <p className="mt-2 text-sm text-white/70">{insight.detail}</p>
                                            <p className="mt-3 text-xs text-white/50">Hover or focus a background to update.</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {currentStep.id === "class" && (
                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            {classOptions.map((option) => {
                                const active = formState.charClass === option.value;
                                return (
                                    <button
                                        type="button"
                                        key={option.value}
                                        onClick={() => setFormState((prev) => ({ ...prev, charClass: option.value }))}
                                        className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                            }`}
                                    >
                                        <p className="text-sm font-semibold text-white">{option.label}</p>
                                        <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {currentStep.id === "alignment" && (
                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            {alignmentOptions.map((option) => {
                                const active = formState.alignment === option.value;
                                return (
                                    <button
                                        type="button"
                                        key={option.value}
                                        onClick={() => setFormState((prev) => ({ ...prev, alignment: option.value }))}
                                        className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-rose-300 bg-rose-300/10" : "border-white/15 bg-black/30 hover:border-white/30"
                                            }`}
                                    >
                                        <p className="text-sm font-semibold text-white">{option.label}</p>
                                        <p className="mt-1 text-xs text-white/70">{option.description}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex w-full flex-1 gap-3">
                            <button
                                type="button"
                                onClick={handleBack}
                                disabled={step === 0}
                                className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Back
                            </button>
                            {step < activeSteps.length - 1 && (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={!canAdvance}
                                    className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            )}
                        </div>
                        {step === activeSteps.length - 1 && <SubmitButton disabled={!canSubmit} />}
                    </div>
                </section>
            </div>
        </form>
    );
}
