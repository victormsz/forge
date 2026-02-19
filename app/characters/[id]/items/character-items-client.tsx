"use client";

import { useState } from "react";
import Link from "next/link";

import { deleteItem, equipItem, updateItemStats } from "@/app/characters/actions";
import { ItemLibraryForm } from "@/components/items/item-library-form";
import { EditItemDialog } from "@/components/items/edit-item-dialog";
import type { ItemCategoryOption, ItemReference } from "@/lib/items/reference";
import type { EquipmentSlot } from "@/lib/characters/types";
import type { ItemCustomStats } from "@/lib/items/custom-stats";

type Item = {
    id: string;
    name: string;
    category: string | null;
    cost: string | null;
    weight: number | null;
    quantity: number;
    description: string | null;
    notes: string | null;
    referenceId: string | null;
    equippedSlot: EquipmentSlot | null;
    isWeapon: boolean;
    isArmor: boolean;
    isShield: boolean;
    isCustom: boolean;
    customStats: ItemCustomStats | null;
    updatedAt: Date;
};

type ActiveTab = "inventory" | "add";

function getMagicalBonusLabel(item: Item): string | null {
    if (!item.customStats) return null;
    const parts: string[] = [];
    if (item.customStats.attackBonus) parts.push(`+${item.customStats.attackBonus} ATK`);
    if (item.customStats.damageBonus) parts.push(`+${item.customStats.damageBonus} DMG`);
    if (item.customStats.acBonus) parts.push(`+${item.customStats.acBonus} AC`);
    if (item.customStats.rarity) parts.push(item.customStats.rarity);
    return parts.length > 0 ? parts.join(" · ") : null;
}

function getDefaultSlot(item: Item): EquipmentSlot | null {
    if (item.isShield) return "SHIELD";
    if (item.isArmor) return "ARMOR";
    if (item.isWeapon) return "MAIN_HAND";
    return null;
}

export function CharacterItemsPageClient({
    character,
    dominantCategories,
    formattedWeight,
    referenceItems,
    categoryOptions,
    addItemAction,
}: {
    character: {
        id: string;
        name: string;
        level: number;
        charClass: string | null;
        items: Item[];
    };
    dominantCategories: [string, number][];
    formattedWeight: string;
    referenceItems: ItemReference[];
    categoryOptions: ItemCategoryOption[];
    addItemAction: (formData: FormData) => Promise<void>;
}) {
    const [activeTab, setActiveTab] = useState<ActiveTab>("inventory");
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [editingItem, setEditingItem] = useState<Item | null>(null);

    const equippedCount = character.items.filter((i) => i.equippedSlot !== null).length;
    const classLine = character.charClass
        ? `Level ${character.level} ${character.charClass}`
        : `Level ${character.level}`;

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(134,200,255,0.12),_transparent_55%),_#02050b] text-white">
            {/* ── Sticky header ─────────────────────────────────────────── */}
            <header className="sticky top-0 z-20 border-b border-white/10 bg-[#02050b]/80 backdrop-blur-md">
                <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                    <div className="min-w-0">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-sky-300">Inventory Forge</p>
                        <p className="truncate text-base font-bold leading-tight text-white sm:text-lg">{character.name}</p>
                        <p className="text-xs text-white/50">{classLine}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Link
                            href={`/characters/${character.id}`}
                            className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-sky-300/50 hover:bg-white/10"
                        >
                            Sheet
                        </Link>
                        <Link
                            href="/characters"
                            className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10"
                        >
                            Roster
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
                {/* ── Stats strip ───────────────────────────────────────── */}
                <div className="mb-6 flex flex-wrap gap-2">
                    {(
                        [
                            { label: "Items", value: character.items.length, color: "sky" },
                            { label: "Weight", value: formattedWeight, color: "white" },
                            { label: "Equipped", value: equippedCount, color: "emerald" },
                        ] as const
                    ).map(({ label, value, color }) => (
                        <div
                            key={label}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 ${color === "sky"
                                    ? "border-sky-400/40 bg-sky-400/10"
                                    : color === "emerald"
                                        ? "border-emerald-400/40 bg-emerald-400/10"
                                        : "border-white/15 bg-white/5"
                                }`}
                        >
                            <span
                                className={`text-sm font-bold ${color === "sky"
                                        ? "text-sky-200"
                                        : color === "emerald"
                                            ? "text-emerald-200"
                                            : "text-white"
                                    }`}
                            >
                                {value}
                            </span>
                            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-white/50">{label}</span>
                        </div>
                    ))}
                </div>

                {/* ── Mobile tab bar ────────────────────────────────────── */}
                <div className="mb-6 flex rounded-2xl border border-white/10 bg-white/5 p-1 lg:hidden">
                    {(["inventory", "add"] as ActiveTab[]).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-[0.2em] transition ${activeTab === tab
                                    ? "border border-sky-400/30 bg-sky-500/20 text-sky-200 shadow-sm"
                                    : "text-white/50 hover:text-white/80"
                                }`}
                        >
                            {tab === "inventory" ? `Inventory (${character.items.length})` : "Add Item"}
                        </button>
                    ))}
                </div>

                {/* ── Content grid ──────────────────────────────────────── */}
                <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                    {/* Inventory panel */}
                    <div className={activeTab === "inventory" ? "block" : "hidden lg:block"}>
                        {/* Pack overview */}
                        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-white/50">Pack Overview</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-3">
                                    <p className="text-[0.6rem] uppercase tracking-[0.3em] text-sky-300/80">Total Weight</p>
                                    <p className="mt-1 text-2xl font-bold text-white">{formattedWeight}</p>
                                    <p className="mt-0.5 text-[0.6rem] text-white/50">qty × weight per entry</p>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-3">
                                    <p className="mb-2 text-[0.6rem] uppercase tracking-[0.3em] text-white/50">Top Categories</p>
                                    {dominantCategories.length === 0 ? (
                                        <p className="text-xs text-white/40">Nothing packed yet.</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {dominantCategories.map(([label, count]) => (
                                                <div key={label} className="flex items-center justify-between text-xs">
                                                    <span className="truncate text-white/70">{label}</span>
                                                    <span className="ml-2 shrink-0 font-bold text-white/60">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Item list */}
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm font-bold text-white">
                                    Inventory
                                    <span className="ml-2 text-xs font-normal text-white/40">
                                        {character.items.length} entries
                                    </span>
                                </p>
                            </div>

                            {character.items.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-10 text-center">
                                    <p className="text-sm text-white/50">Nothing packed yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("add")}
                                        className="mt-3 text-xs font-semibold text-sky-300 transition hover:text-sky-100 lg:hidden"
                                    >
                                        Add your first item
                                    </button>
                                    <p className="mt-3 hidden text-xs text-white/40 lg:block">
                                        Use the panel on the right to add gear.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {character.items.map((item) => (
                                        <ItemCard
                                            key={item.id}
                                            item={item}
                                            characterId={character.id}
                                            onViewDetail={() => setSelectedItem(item)}
                                            onEditStats={() => setEditingItem(item)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add equipment panel */}
                    <div
                        className={`${activeTab === "add" ? "block" : "hidden lg:block"} lg:sticky lg:top-[4.5rem] lg:self-start`}
                    >
                        <ItemLibraryForm
                            characterId={character.id}
                            references={referenceItems}
                            categoryOptions={categoryOptions}
                            action={addItemAction}
                        />
                    </div>
                </div>
            </main>

            {/* ── Item detail – bottom sheet on mobile, centered on desktop ── */}
            {selectedItem && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/20 bg-gradient-to-b from-neutral-900 to-neutral-950 p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle (mobile) */}
                        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[0.6rem] uppercase tracking-[0.35em] text-white/40">
                                    {selectedItem.category ?? "Misc gear"}
                                </p>
                                <h3 className="text-xl font-bold text-white">{selectedItem.name}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedItem(null)}
                                className="shrink-0 rounded-full border border-white/20 p-1.5 text-white/50 transition hover:border-white/40 hover:text-white"
                                aria-label="Close"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {[
                                { label: "Qty", value: selectedItem.quantity },
                                typeof selectedItem.weight === "number" && {
                                    label: "Weight",
                                    value: `${selectedItem.weight} lb`,
                                },
                                selectedItem.cost && { label: "Cost", value: selectedItem.cost },
                                { label: "Source", value: selectedItem.isCustom ? "Custom" : "SRD" },
                            ]
                                .filter(Boolean)
                                .map((entry) => {
                                    const stat = entry as { label: string; value: string | number };
                                    return (
                                        <div key={stat.label} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
                                            <p className="text-[0.55rem] uppercase tracking-[0.3em] text-white/40">{stat.label}</p>
                                            <p className="mt-0.5 text-base font-bold text-white">{stat.value}</p>
                                        </div>
                                    );
                                })}
                        </div>

                        {typeof selectedItem.weight === "number" && selectedItem.quantity > 1 && (
                            <div className="mb-5 rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3">
                                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-sky-300/80">Total Weight</p>
                                <p className="mt-0.5 text-xl font-bold text-white">
                                    {(selectedItem.weight * selectedItem.quantity).toFixed(1)} lb
                                </p>
                                <p className="text-xs text-white/50">
                                    {selectedItem.quantity} × {selectedItem.weight} lb
                                </p>
                            </div>
                        )}

                        {selectedItem.description && (
                            <div className="mb-5">
                                <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/50">
                                    Description
                                </p>
                                <p className="text-sm leading-relaxed text-white/80">{selectedItem.description}</p>
                            </div>
                        )}

                        {selectedItem.notes && (
                            <div className="mb-5">
                                <p className="mb-1.5 text-[0.6rem] font-bold uppercase tracking-[0.3em] text-white/50">Notes</p>
                                <p className="text-sm leading-relaxed text-sky-200">{selectedItem.notes}</p>
                            </div>
                        )}

                        {selectedItem.equippedSlot && (
                            <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5">
                                <p className="text-xs font-semibold text-emerald-200">
                                    Equipped in{" "}
                                    <span className="text-white">
                                        {selectedItem.equippedSlot.replace(/_/g, " ")}
                                    </span>
                                </p>
                            </div>
                        )}

                        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-white/30">
                            Updated {selectedItem.updatedAt.toLocaleDateString()}
                        </p>
                    </div>
                </div>
            )}

            {editingItem && (
                <EditItemDialog
                    item={editingItem}
                    characterId={character.id}
                    onClose={() => setEditingItem(null)}
                    onSave={async (itemId, customStats) => {
                        await updateItemStats(itemId, customStats);
                    }}
                />
            )}
        </div>
    );
}

// ── Item Card component ────────────────────────────────────────────────────

function ItemCard({
    item,
    characterId,
    onViewDetail,
    onEditStats,
}: {
    item: Item;
    characterId: string;
    onViewDetail: () => void;
    onEditStats: () => void;
}) {
    const defaultSlot = getDefaultSlot(item);
    const magicLabel = getMagicalBonusLabel(item);
    const isEquipped = item.equippedSlot !== null;

    return (
        <article className="rounded-2xl border border-white/10 bg-black/30 transition-colors hover:border-white/20">
            {/* Top row: qty badge + name + info icon */}
            <div className="flex items-start gap-3 p-3 sm:p-4">
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border border-white/15 bg-white/5">
                    <span className="text-base font-bold leading-none text-white">{item.quantity}</span>
                    <span className="text-[0.5rem] uppercase tracking-wider text-white/40">qty</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.6rem] uppercase tracking-[0.3em] text-white/40">
                        {item.category ?? "Misc gear"}
                    </p>
                    <h3 className="truncate text-base font-bold text-white sm:text-lg">{item.name}</h3>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    {isEquipped && (
                        <span className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-emerald-300">
                            Eqp
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onViewDetail}
                        className="rounded-lg border border-white/15 bg-white/5 p-1.5 text-white/50 transition hover:border-white/30 hover:text-white"
                        title="View details"
                    >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 px-3 pb-2 sm:px-4">
                {typeof item.weight === "number" && (
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] text-white/60">
                        {(item.weight * item.quantity).toFixed(1)} lb
                    </span>
                )}
                {item.cost && (
                    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] text-white/60">
                        {item.cost}
                    </span>
                )}
                {magicLabel && (
                    <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[0.6rem] text-amber-200">
                        ✦ {magicLabel}
                    </span>
                )}
                <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] text-white/40">
                    {item.isCustom ? "Custom" : "SRD"}
                </span>
            </div>

            {/* Description / notes preview */}
            {(item.description || item.notes) && (
                <div className="px-3 pb-3 sm:px-4">
                    {item.description && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-white/50">{item.description}</p>
                    )}
                    {item.notes && (
                        <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-sky-300/80">{item.notes}</p>
                    )}
                </div>
            )}

            {/* Action bar */}
            <div
                className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-3 py-2.5 sm:px-4"
                onClick={(e) => e.stopPropagation()}
            >
                {defaultSlot && !isEquipped && (
                    <form action={equipItem}>
                        <input type="hidden" name="characterId" value={characterId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="slot" value={defaultSlot} />
                        <button
                            type="submit"
                            className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-400/20"
                        >
                            Equip
                        </button>
                    </form>
                )}
                {item.isWeapon && item.equippedSlot !== "OFF_HAND" && (
                    <form action={equipItem}>
                        <input type="hidden" name="characterId" value={characterId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="slot" value="OFF_HAND" />
                        <button
                            type="submit"
                            className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-300/80 transition hover:bg-emerald-400/15"
                        >
                            Off-hand
                        </button>
                    </form>
                )}
                {isEquipped && (
                    <form action={equipItem}>
                        <input type="hidden" name="characterId" value={characterId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="slot" value="" />
                        <button
                            type="submit"
                            className="rounded-lg border border-white/15 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/50 transition hover:border-white/30 hover:text-white"
                        >
                            Unequip
                        </button>
                    </form>
                )}
                <button
                    type="button"
                    onClick={onEditStats}
                    className="rounded-lg border border-sky-400/30 bg-sky-400/5 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-sky-300 transition hover:bg-sky-400/15"
                >
                    Stats
                </button>

                <div className="flex-1" />

                <form action={deleteItem}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="characterId" value={characterId} />
                    <button
                        type="submit"
                        className="rounded-lg border border-white/10 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/40 transition hover:border-rose-400/40 hover:text-rose-300"
                    >
                        Remove
                    </button>
                </form>
            </div>
        </article>
    );
}
