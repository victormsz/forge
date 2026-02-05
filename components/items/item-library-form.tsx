"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui/card";
import type { ItemCategoryOption, ItemReference } from "@/lib/items/reference";

interface ItemLibraryFormProps {
    characterId: string;
    references: ItemReference[];
    categoryOptions: ItemCategoryOption[];
    action: (formData: FormData) => Promise<void>;
}

interface FormValues {
    name: string;
    category: string;
    cost: string;
    weight: string;
    quantity: number;
    description: string;
    notes: string;
    isCustom: boolean;
}

const MAX_RESULTS = 30;
const LOCKED_FIELDS: ReadonlyArray<keyof FormValues> = ["name", "category", "cost", "weight", "description"];

function createDefaults(): FormValues {
    return {
        name: "",
        category: "",
        cost: "",
        weight: "",
        quantity: 1,
        description: "",
        notes: "",
        isCustom: false,
    };
}

export function ItemLibraryForm({ characterId, references, categoryOptions, action }: ItemLibraryFormProps) {
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<FormValues>(() => createDefaults());
    const [shouldResetAfterSubmit, setShouldResetAfterSubmit] = useState(false);

    const filteredReferences = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return references
            .filter((item) => {
                const matchesQuery = normalizedQuery.length === 0 || item.name.toLowerCase().includes(normalizedQuery);
                const matchesCategory = categoryFilter === "all" || item.categoryIds.includes(categoryFilter);
                return matchesQuery && matchesCategory;
            })
            .slice(0, MAX_RESULTS);
    }, [references, query, categoryFilter]);

    function handleReferenceSelect(reference: ItemReference) {
        setFormValues((current) => ({
            ...current,
            name: reference.name,
            category: reference.categories[0] ?? "",
            cost: reference.costLabel ?? "",
            weight: typeof reference.weight === "number" ? reference.weight.toString() : "",
            description: reference.description ?? "",
            isCustom: false,
        }));
        setSelectedItemId(reference.id);
        setQuery(reference.name);
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
        setFormValues(createDefaults());
        setSelectedItemId(null);
        setQuery("");
        setCategoryFilter("all");
    }

    function activateCustomMode() {
        setFormValues((current) => ({ ...current, isCustom: true }));
        setSelectedItemId(null);
    }

    function restoreLibraryMode() {
        setFormValues((current) => ({ ...current, isCustom: false }));
    }

    const canSubmit = formValues.isCustom || Boolean(selectedItemId);
    const emptyReferenceMessage = references.length === 0
        ? "No SRD equipment available. Switch to custom mode to add entries."
        : "No items match the current search or category filter.";

    return (
        <Card className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-white">Add equipment</h2>
                    <p className="text-sm text-white/70">Load D&D 5.5e SRD items or craft bespoke inventory entries.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/60">
                    <span className={`rounded-full border px-3 py-1 text-[0.65rem] ${formValues.isCustom ? "border-amber-300/60 text-amber-200" : selectedItemId ? "border-emerald-300/60 text-emerald-200" : "border-white/20 text-white/70"}`}>
                        {formValues.isCustom ? "Custom entry" : selectedItemId ? "SRD item" : "Pick from SRD"}
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
                            Make custom item
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Search</span>
                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Battleaxe, Rope, Toolkit..."
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Category</span>
                            <select
                                value={categoryFilter}
                                onChange={(event) => setCategoryFilter(event.target.value)}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                            >
                                <option value="all">All categories</option>
                                {categoryOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label} ({option.count})
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="space-y-3">
                        {filteredReferences.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-6 text-sm text-white/60">
                                {emptyReferenceMessage}
                            </p>
                        ) : (
                            filteredReferences.map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => handleReferenceSelect(item)}
                                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selectedItemId === item.id ? "border-sky-300/70 bg-sky-400/10" : "border-white/10 bg-black/30 hover:border-white/30"}`}
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                                        <span>{item.categories[0] ?? "Misc gear"}</span>
                                        {item.costLabel && <span>{item.costLabel}</span>}
                                    </div>
                                    <p className="mt-1 text-lg font-semibold text-white">{item.name}</p>
                                    {item.detailTags.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2 text-[0.65rem] text-white/60">
                                            {item.detailTags.slice(0, 3).map((tag) => (
                                                <span key={`${item.id}-${tag}`} className="rounded-full border border-white/10 px-2 py-0.5">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {item.description && (
                                        <p className="mt-2 line-clamp-2 text-sm text-white/70">{item.description}</p>
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
                    <input type="hidden" name="referenceId" value={selectedItemId ?? ""} />
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
                            <span>Category</span>
                            <input
                                name="category"
                                type="text"
                                value={formValues.category}
                                onChange={(event) => handleFieldChange("category", event.target.value)}
                                readOnly={!formValues.isCustom}
                                placeholder="Adventuring Gear"
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Cost</span>
                            <input
                                name="cost"
                                type="text"
                                value={formValues.cost}
                                onChange={(event) => handleFieldChange("cost", event.target.value)}
                                readOnly={!formValues.isCustom}
                                placeholder="25 gp"
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Weight (lb)</span>
                            <input
                                name="weight"
                                type="number"
                                min="0"
                                step="0.1"
                                value={formValues.weight}
                                onChange={(event) => handleFieldChange("weight", event.target.value)}
                                readOnly={!formValues.isCustom}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                            <span>Quantity</span>
                            <input
                                required
                                name="quantity"
                                type="number"
                                min="1"
                                max="999"
                                value={formValues.quantity}
                                onChange={(event) => handleFieldChange("quantity", Math.max(1, Number(event.target.value) || 1))}
                                className="rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-base text-white"
                            />
                        </label>
                    </div>

                    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                        <span>Description</span>
                        <textarea
                            name="description"
                            value={formValues.description}
                            onChange={(event) => handleFieldChange("description", event.target.value)}
                            rows={5}
                            readOnly={!formValues.isCustom}
                            className="rounded-3xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white"
                        />
                    </label>

                    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/60">
                        <span>Notes</span>
                        <textarea
                            name="notes"
                            value={formValues.notes}
                            onChange={(event) => handleFieldChange("notes", event.target.value)}
                            rows={3}
                            placeholder="Attunement, owner, loadout slot..."
                            className="rounded-3xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white"
                        />
                    </label>

                    {!canSubmit && (
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
                            Select an SRD item or switch to custom mode to proceed.
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
        </Card>
    );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    const isDisabled = pending || disabled;
    return (
        <button
            type="submit"
            disabled={isDisabled}
            className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-teal-300 px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? "Saving..." : "Add item"}
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
