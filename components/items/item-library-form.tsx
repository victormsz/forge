"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ItemStatsEditor } from "@/components/items/item-stats-editor";
import type { ItemCategoryOption, ItemReference } from "@/lib/items/reference";
import type { ItemCustomStats } from "@/lib/items/custom-stats";

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
    customStats: ItemCustomStats | null;
}

const MAX_RESULTS = 40;
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
        customStats: null,
    };
}

const inputCls =
    "w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none transition";
const inputLockedCls =
    "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/60 cursor-default focus:outline-none";
const labelCls = "flex flex-col gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/50";

export function ItemLibraryForm({ characterId, references, categoryOptions, action }: ItemLibraryFormProps) {
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<FormValues>(() => createDefaults());
    const [shouldResetAfterSubmit, setShouldResetAfterSubmit] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);

    const filteredReferences = useMemo(() => {
        const q = query.trim().toLowerCase();
        return references
            .filter((item) => {
                const matchesQuery = q.length === 0 || item.name.toLowerCase().includes(q);
                const matchesCat = categoryFilter === "all" || item.categoryIds.includes(categoryFilter);
                return matchesQuery && matchesCat;
            })
            .slice(0, MAX_RESULTS);
    }, [references, query, categoryFilter]);

    function handleReferenceSelect(reference: ItemReference) {
        setFormValues((curr) => ({
            ...curr,
            name: reference.name,
            category: reference.categories[0] ?? "",
            cost: reference.costLabel ?? "",
            weight: typeof reference.weight === "number" ? reference.weight.toString() : "",
            description: reference.description ?? "",
            isCustom: false,
            customStats: null, // reset stats when switching items
        }));
        setSelectedItemId(reference.id);
    }

    function handleFieldChange<K extends keyof FormValues>(key: K, value: FormValues[K]) {
        setFormValues((curr) => {
            if (!curr.isCustom && LOCKED_FIELDS.includes(key)) return curr;
            return { ...curr, [key]: value };
        });
    }

    function resetForm() {
        setFormValues(createDefaults());
        setSelectedItemId(null);
        setQuery("");
        setCategoryFilter("all");
    }

    function activateCustomMode() {
        setFormValues((curr) => ({ ...curr, isCustom: true }));
        setSelectedItemId(null);
    }

    function activateSrdMode() {
        setFormValues((curr) => ({ ...curr, isCustom: false }));
    }

    const canSubmit = formValues.isCustom ? Boolean(formValues.name.trim()) : Boolean(selectedItemId);

    const selectedReference = selectedItemId
        ? references.find((r) => r.id === selectedItemId) ?? null
        : null;

    return (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="mb-5">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-sky-300">
                    Inventory Forge
                </p>
                <h2 className="text-base font-bold text-white">Add Equipment</h2>
                <p className="mt-0.5 text-xs text-white/50">
                    Pick from the SRD library or craft a custom entry.
                </p>
            </div>

            {/* ── Mode tabs ───────────────────────────────────────────── */}
            <div className="mb-5 flex rounded-xl border border-white/10 bg-black/30 p-0.5">
                <button
                    type="button"
                    onClick={activateSrdMode}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${!formValues.isCustom
                            ? "bg-sky-500/20 text-sky-200 border border-sky-400/30"
                            : "text-white/40 hover:text-white/70"
                        }`}
                >
                    SRD Library
                </button>
                <button
                    type="button"
                    onClick={activateCustomMode}
                    className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-[0.2em] transition ${formValues.isCustom
                            ? "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                            : "text-white/40 hover:text-white/70"
                        }`}
                >
                    Custom Entry
                </button>
            </div>

            {/* ── SRD picker ──────────────────────────────────────────── */}
            {!formValues.isCustom && (
                <div className="mb-5 space-y-3">
                    {/* Search + filter */}
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search items…"
                            className={inputCls}
                        />
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className={inputCls}
                        >
                            <option value="all">All categories</option>
                            {categoryOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.label} ({opt.count})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Scrollable results */}
                    <div
                        ref={listRef}
                        className="max-h-52 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin"
                    >
                        {filteredReferences.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-3 py-4 text-xs text-white/50 text-center">
                                {references.length === 0
                                    ? "No SRD data available."
                                    : "No results — try a different search or category."}
                            </p>
                        ) : (
                            filteredReferences.map((ref) => (
                                <button
                                    key={ref.id}
                                    type="button"
                                    onClick={() => handleReferenceSelect(ref)}
                                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${selectedItemId === ref.id
                                            ? "border-sky-400/50 bg-sky-400/10"
                                            : "border-white/10 bg-black/20 hover:border-white/30 hover:bg-black/40"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-semibold text-white leading-tight">{ref.name}</p>
                                        {ref.costLabel && (
                                            <span className="shrink-0 text-[0.6rem] text-white/40">{ref.costLabel}</span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {ref.categories[0] && (
                                            <span className="text-[0.55rem] uppercase tracking-wider text-white/40">
                                                {ref.categories[0]}
                                            </span>
                                        )}
                                        {ref.detailTags.slice(0, 2).map((tag) => (
                                            <span
                                                key={`${ref.id}-${tag}`}
                                                className="rounded-md border border-white/10 px-1.5 py-0.5 text-[0.55rem] text-white/50"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Selected item summary */}
                    {selectedReference && (
                        <div className="flex items-center justify-between rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2">
                            <div className="min-w-0">
                                <p className="text-[0.55rem] uppercase tracking-wider text-sky-300/70">Selected</p>
                                <p className="truncate text-sm font-bold text-white">{selectedReference.name}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedItemId(null);
                                    setFormValues(createDefaults());
                                }}
                                className="ml-2 shrink-0 rounded-lg border border-white/20 p-1 text-white/40 transition hover:border-white/40 hover:text-white"
                                title="Deselect item"
                            >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Form ────────────────────────────────────────────────── */}
            <form
                action={action}
                className="space-y-3"
                onSubmit={() => setShouldResetAfterSubmit(true)}
            >
                <input type="hidden" name="characterId" value={characterId} />
                <input type="hidden" name="isCustom" value={formValues.isCustom ? "true" : "false"} />
                <input type="hidden" name="referenceId" value={selectedItemId ?? ""} />

                {/* Name + Category */}
                <div className="grid grid-cols-2 gap-2">
                    <label className={labelCls}>
                        <span>Name</span>
                        <input
                            required
                            name="name"
                            type="text"
                            value={formValues.name}
                            onChange={(e) => handleFieldChange("name", e.target.value)}
                            readOnly={!formValues.isCustom}
                            placeholder={formValues.isCustom ? "Item name" : "Pick from library"}
                            className={formValues.isCustom ? inputCls : inputLockedCls}
                        />
                    </label>
                    <label className={labelCls}>
                        <span>Category</span>
                        <input
                            name="category"
                            type="text"
                            value={formValues.category}
                            onChange={(e) => handleFieldChange("category", e.target.value)}
                            readOnly={!formValues.isCustom}
                            placeholder="Adventuring Gear"
                            className={formValues.isCustom ? inputCls : inputLockedCls}
                        />
                    </label>
                </div>

                {/* Cost + Weight + Quantity */}
                <div className="grid grid-cols-3 gap-2">
                    <label className={labelCls}>
                        <span>Cost</span>
                        <input
                            name="cost"
                            type="text"
                            value={formValues.cost}
                            onChange={(e) => handleFieldChange("cost", e.target.value)}
                            readOnly={!formValues.isCustom}
                            placeholder="25 gp"
                            className={formValues.isCustom ? inputCls : inputLockedCls}
                        />
                    </label>
                    <label className={labelCls}>
                        <span>Weight (lb)</span>
                        <input
                            name="weight"
                            type="number"
                            min="0"
                            step="0.1"
                            value={formValues.weight}
                            onChange={(e) => handleFieldChange("weight", e.target.value)}
                            readOnly={!formValues.isCustom}
                            placeholder="0"
                            className={formValues.isCustom ? inputCls : inputLockedCls}
                        />
                    </label>
                    <label className={labelCls}>
                        <span>Qty</span>
                        <input
                            required
                            name="quantity"
                            type="number"
                            min="1"
                            max="999"
                            value={formValues.quantity}
                            onChange={(e) =>
                                handleFieldChange("quantity", Math.max(1, Number(e.target.value) || 1))
                            }
                            className={inputCls}
                        />
                    </label>
                </div>

                {/* Description */}
                <label className={labelCls}>
                    <span>Description</span>
                    <textarea
                        name="description"
                        value={formValues.description}
                        onChange={(e) => handleFieldChange("description", e.target.value)}
                        rows={3}
                        readOnly={!formValues.isCustom}
                        className={`resize-none ${formValues.isCustom ? inputCls : inputLockedCls}`}
                    />
                </label>

                {/* Notes */}
                <label className={labelCls}>
                    <span>Notes</span>
                    <textarea
                        name="notes"
                        value={formValues.notes}
                        onChange={(e) => handleFieldChange("notes", e.target.value)}
                        rows={2}
                        placeholder="Attunement, owner, loadout note…"
                        className={`resize-none ${inputCls}`}
                    />
                </label>

                {/* Custom stats — key resets editor when item selection changes */}
                <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <ItemStatsEditor
                        key={selectedItemId ?? (formValues.isCustom ? "custom" : "none")}
                        itemName={formValues.name}
                        category={formValues.category}
                        currentStats={formValues.customStats}
                        onStatsChange={(stats) => handleFieldChange("customStats", stats)}
                    />
                </div>

                <input
                    type="hidden"
                    name="customStats"
                    value={formValues.customStats ? JSON.stringify(formValues.customStats) : ""}
                />

                {/* Hint when nothing ready to submit */}
                {!canSubmit && (formValues.name || selectedItemId !== null) === false && (
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-amber-300/80">
                        {formValues.isCustom
                            ? "Enter a name for the custom item."
                            : "Select an item from the library above."}
                    </p>
                )}

                <FormResetObserver
                    shouldReset={shouldResetAfterSubmit}
                    onReset={() => {
                        resetForm();
                        setShouldResetAfterSubmit(false);
                    }}
                />

                {/* Submit + Reset */}
                <div className="flex gap-2 pt-1">
                    <SubmitButton disabled={!canSubmit} />
                    <button
                        type="button"
                        onClick={resetForm}
                        className="rounded-xl border border-white/15 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/50 transition hover:border-white/30 hover:text-white"
                    >
                        Reset
                    </button>
                </div>
            </form>
        </div>
    );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending || disabled}
            className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-teal-400 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
            {pending ? "Saving…" : "Add Item"}
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
