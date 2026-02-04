"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import type { SpellReference } from "@/lib/spells/reference";

const MAX_REFERENCE_RESULTS = 25;

type SelectOption = {
    value: string;
    label: string;
};

interface SpellLibraryFormProps {
    characterId: string;
    characterClass: string | null;
    references: SpellReference[];
    shapeOptions: SelectOption[];
    affinityOptions: SelectOption[];
    action: (formData: FormData) => Promise<void>;
}

interface FormValues {
    name: string;
    level: number;
    range: string;
    school: string;
    description: string;
    damage: string;
    shape: string;
    affinity: string;
    isCustom: boolean;
}

const LOCKED_FIELDS: ReadonlyArray<keyof FormValues> = ["name", "level", "range", "school", "description"];

function createDefaults(shapeOptions: SelectOption[], affinityOptions: SelectOption[]): FormValues {
    return {
        name: "",
        level: 0,
        range: "Self",
        school: "",
        description: "",
        damage: "",
        shape: shapeOptions[0]?.value ?? "SINGLE",
        affinity: affinityOptions[0]?.value ?? "HOSTILE",
        isCustom: false,
    };
}

export function SpellLibraryForm({ characterId, characterClass, references, shapeOptions, affinityOptions, action }: SpellLibraryFormProps) {
    const [query, setQuery] = useState("");
    const [levelFilter, setLevelFilter] = useState("all");
    const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<FormValues>(() => createDefaults(shapeOptions, affinityOptions));
    const [shouldResetAfterSubmit, setShouldResetAfterSubmit] = useState(false);

    const filteredReferences = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return references
            .filter((spell) => {
                const matchesQuery = normalizedQuery.length === 0 || spell.name.toLowerCase().includes(normalizedQuery);
                const matchesLevel = levelFilter === "all" || spell.level.toString() === levelFilter;
                return matchesQuery && matchesLevel;
            })
            .slice(0, MAX_REFERENCE_RESULTS);
    }, [references, query, levelFilter]);

    const levelOptions = useMemo(() => ["all", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], []);

    function handleReferenceSelect(spell: SpellReference) {
        setFormValues((current) => ({
            ...current,
            name: spell.name,
            level: spell.level,
            range: spell.range ?? "Self",
            school: spell.school ?? "",
            description: spell.description ?? "",
            damage: current.damage,
            isCustom: false,
        }));
        setSelectedSpellId(spell.id);
        setQuery(spell.name);
    }

    function handleFieldChange<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
        setFormValues((current) => {
            if (!current.isCustom && LOCKED_FIELDS.includes(key)) {
                return current;
            }
            return { ...current, [key]: value };
        });
    }

    function resetForm() {
        setFormValues(createDefaults(shapeOptions, affinityOptions));
        setSelectedSpellId(null);
        setQuery("");
        setLevelFilter("all");
    }

    function activateCustomMode() {
        setFormValues((current) => ({ ...current, isCustom: true }));
        setSelectedSpellId(null);
    }

    function restoreLibraryMode() {
        setFormValues((current) => ({ ...current, isCustom: false }));
    }

    const canSubmit = formValues.isCustom || Boolean(selectedSpellId);

    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">Add spells</h2>
                    <p className="text-sm text-white/70">Search the SRD library, load the details, then choose targeting rules.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
                    <span className={`rounded-full border px-3 py-1 text-[0.65rem] ${formValues.isCustom ? "border-amber-300/60 text-amber-200" : selectedSpellId ? "border-emerald-300/60 text-emerald-200" : "border-white/20 text-white/70"}`}>
                        {formValues.isCustom ? "Custom entry" : selectedSpellId ? "SRD spell" : "Pick from SRD"}
                    </span>
                    <button type="button" onClick={resetForm} className="transition hover:text-white">
                        Reset form
                    </button>
                    {formValues.isCustom ? (
                        <button type="button" onClick={restoreLibraryMode} className="transition hover:text-white">
                            Use SRD entry
                        </button>
                    ) : (
                        <button type="button" onClick={activateCustomMode} className="transition hover:text-white">
                            Make custom spell
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Search</span>
                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Fireball, Healing Word..."
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                        <div className="flex flex-col justify-end text-xs uppercase tracking-[0.3em] text-white/60">
                            <span className="text-[0.65rem] text-white/50">
                                {characterClass ? `${characterClass} spell list` : "All SRD spells"}
                            </span>
                        </div>
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Level</span>
                            <select
                                value={levelFilter}
                                onChange={(event) => setLevelFilter(event.target.value)}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                            >
                                {levelOptions.map((value) => (
                                    <option key={value} value={value}>
                                        {value === "all" ? "All levels" : `Level ${value}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="space-y-3">
                        {filteredReferences.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-6 text-sm text-white/60">
                                {references.length === 0
                                    ? characterClass
                                        ? `${characterClass} doesn't have SRD spells in this dataset. Switch to custom mode to add exceptions.`
                                        : "No SRD spells available. Switch to custom mode to add entries."
                                    : "No spells match the current search or level filter."}
                            </p>
                        ) : (
                            filteredReferences.map((spell) => (
                                <button
                                    type="button"
                                    key={spell.id}
                                    onClick={() => handleReferenceSelect(spell)}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedSpellId === spell.id ? "border-rose-300/70 bg-rose-400/10" : "border-white/10 bg-black/30 hover:border-white/30"}`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                                        <span>Level {spell.level}</span>
                                        <span>{spell.classes.join(", ") || "All"}</span>
                                    </div>
                                    <p className="mt-1 text-lg font-semibold text-white">{spell.name}</p>
                                    {spell.description && (
                                        <p className="mt-2 line-clamp-2 text-sm text-white/70">{spell.description}</p>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <form
                    action={action}
                    className="space-y-4"
                    onSubmit={() => {
                        setShouldResetAfterSubmit(true);
                    }}
                >
                    <input type="hidden" name="characterId" value={characterId} />
                    <input type="hidden" name="isCustom" value={formValues.isCustom ? "true" : "false"} />
                    <input type="hidden" name="referenceId" value={selectedSpellId ?? ""} />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Name</span>
                            <input
                                required
                                name="name"
                                type="text"
                                value={formValues.name}
                                onChange={(event) => handleFieldChange("name", event.target.value)}
                                readOnly={!formValues.isCustom}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Level</span>
                            <input
                                name="level"
                                type="number"
                                min={0}
                                max={9}
                                value={formValues.level}
                                onChange={(event) => handleFieldChange("level", Number(event.target.value))}
                                readOnly={!formValues.isCustom}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Range</span>
                            <input
                                name="range"
                                type="text"
                                value={formValues.range}
                                onChange={(event) => handleFieldChange("range", event.target.value)}
                                readOnly={!formValues.isCustom}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>School</span>
                            <input
                                name="school"
                                type="text"
                                value={formValues.school}
                                onChange={(event) => handleFieldChange("school", event.target.value)}
                                readOnly={!formValues.isCustom}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Target shape</span>
                            <select
                                name="shape"
                                value={formValues.shape}
                                onChange={(event) => handleFieldChange("shape", event.target.value)}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                            >
                                {shapeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Affinity</span>
                            <select
                                name="affinity"
                                value={formValues.affinity}
                                onChange={(event) => handleFieldChange("affinity", event.target.value)}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                            >
                                {affinityOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                        <span>Damage / save text</span>
                        <input
                            name="damage"
                            type="text"
                            value={formValues.damage}
                            onChange={(event) => handleFieldChange("damage", event.target.value)}
                            placeholder="8d6 fire, Dex save half"
                            className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                        <span>Description</span>
                        <textarea
                            name="description"
                            value={formValues.description}
                            onChange={(event) => handleFieldChange("description", event.target.value)}
                            rows={6}
                            readOnly={!formValues.isCustom}
                            className="rounded-3xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white"
                        />
                    </label>

                    {!canSubmit && (
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                            Select an SRD spell or switch to custom mode to proceed.
                        </p>
                    )}

                    <FormResetObserver
                        shouldReset={shouldResetAfterSubmit}
                        onReset={() => {
                            resetForm();
                            setShouldResetAfterSubmit(false);
                        }}
                    />

                    <SubmitButton disabled={!canSubmit} />
                </form>
            </div>
        </div>
    );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    const isDisabled = pending || disabled;
    return (
        <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-400 to-amber-300 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? "Saving..." : "Add spell"}
        </button>
    );
}

function FormResetObserver({ shouldReset, onReset }: { shouldReset: boolean; onReset: () => void }) {
    const { pending } = useFormStatus();
    const wasPendingRef = useRef(pending);

    useEffect(() => {
        if (shouldReset && wasPendingRef.current && !pending) {
            onReset();
        }
        wasPendingRef.current = pending;
    }, [pending, shouldReset, onReset]);

    useEffect(() => {
        if (!shouldReset) {
            wasPendingRef.current = pending;
        }
    }, [shouldReset, pending]);

    return null;
}
