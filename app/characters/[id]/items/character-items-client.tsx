"use client";

import { useState } from "react";
import Link from "next/link";

import { deleteItem } from "@/app/characters/actions";
import { ItemLibraryForm } from "@/components/items/item-library-form";

type Item = {
    id: string;
    name: string;
    category: string | null;
    cost: string | null;
    weight: number | null;
    quantity: number;
    description: string | null;
    notes: string | null;
    isCustom: boolean;
    updatedAt: Date;
};

export function CharacterItemsPageClient({ 
    character, 
    dominantCategories, 
    formattedWeight,
    referenceItems,
    categoryOptions,
    addItemAction
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
    referenceItems: any;
    categoryOptions: any;
    addItemAction: any;
}) {
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(134,200,255,0.12),_transparent_55%),_#02050b] text-white">
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200">Inventory forge</p>
                        <h1 className="text-3xl font-semibold text-white sm:text-4xl">{character.name}</h1>
                        <p className="text-sm text-white/70">
                            {character.charClass ? `Level ${character.level} ${character.charClass}` : `Level ${character.level}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            href={`/characters/${character.id}`}
                            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-sky-200"
                        >
                            Back to sheet
                        </Link>
                        <Link
                            href="/characters"
                            className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-sky-200"
                        >
                            Back to roster
                        </Link>
                    </div>
                </div>

                <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="space-y-8">
                        <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Pack overview</h2>
                                    <p className="text-sm text-white/70">Quick look at mass, categories, and kit size.</p>
                                </div>
                                <span className="text-xs uppercase tracking-[0.3em] text-white/60">{character.items.length} entries</span>
                            </div>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-sky-400/40 bg-sky-400/10 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Total weight</p>
                                    <p className="mt-2 text-3xl font-semibold text-white">{formattedWeight}</p>
                                    <p className="text-xs text-white/70">Auto-calculated from entries (quantity × weight).</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Top categories</p>
                                    {dominantCategories.length === 0 ? (
                                        <p className="mt-2 text-sm text-white/60">Add items to populate category stats.</p>
                                    ) : (
                                        <div className="mt-3 space-y-2 text-sm text-white/80">
                                            {dominantCategories.map(([label, count]) => (
                                                <div key={label} className="flex items-center justify-between">
                                                    <span>{label}</span>
                                                    <span className="text-white/60">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </article>

                        <article className="rounded-3xl border border-white/10 bg-white/5 p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Inventory</h2>
                                    <p className="text-sm text-white/70">Everything packed, stowed, or attuned.</p>
                                </div>
                                <span className="text-xs uppercase tracking-[0.3em] text-white/60">{character.items.length} cataloged</span>
                            </div>

                            {character.items.length === 0 ? (
                                <p className="mt-6 rounded-2xl border border-dashed border-white/12 bg-black/30 p-6 text-sm text-white/60">
                                    No items yet. Use the library on the right to add SRD gear or custom loot.
                                </p>
                            ) : (
                                <div className="mt-6 space-y-4">
                                    {character.items.map((item) => (
                                        <article 
                                            key={item.id} 
                                            className="rounded-2xl border border-white/10 bg-black/30 p-4 transition-all hover:border-white/30 hover:bg-black/40 cursor-pointer"
                                            onClick={() => setSelectedItem(item)}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.35em] text-white/50">{item.category ?? "Misc gear"}</p>
                                                        <h3 className="text-xl font-semibold text-white">{item.name}</h3>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedItem(item);
                                                        }}
                                                        className="text-white/50 hover:text-white transition-colors"
                                                        title="View details"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                                                    <span className="rounded-full border border-white/15 px-3 py-1">Qty {item.quantity}</span>
                                                    {typeof item.weight === "number" && (
                                                        <span className="rounded-full border border-white/15 px-3 py-1">{(item.weight * item.quantity).toFixed(1)} lb</span>
                                                    )}
                                                    {item.cost && (
                                                        <span className="rounded-full border border-white/15 px-3 py-1">{item.cost}</span>
                                                    )}
                                                    <span className="rounded-full border border-white/15 px-3 py-1">
                                                        {item.isCustom ? "Custom" : "SRD"}
                                                    </span>
                                                </div>
                                            </div>
                                            {item.description && (
                                                <p className="mt-3 text-sm text-white/70">{item.description}</p>
                                            )}
                                            {item.notes && (
                                                <p className="mt-3 text-sm text-sky-200">{item.notes}</p>
                                            )}
                                            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/50">Updated {item.updatedAt.toLocaleDateString()}</p>
                                            <form 
                                                action={deleteItem} 
                                                className="mt-4 flex items-center justify-end gap-3"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input type="hidden" name="itemId" value={item.id} />
                                                <input type="hidden" name="characterId" value={character.id} />
                                                <button
                                                    type="submit"
                                                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-rose-300 hover:text-white"
                                                >
                                                    Delete
                                                </button>
                                            </form>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </article>
                    </div>

                    <ItemLibraryForm
                        characterId={character.id}
                        references={referenceItems}
                        categoryOptions={categoryOptions}
                        action={addItemAction}
                    />
                </section>
            </main>

            {/* Item Detail Modal */}
            {selectedItem && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setSelectedItem(null)}
                >
                    <div 
                        className="max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.35em] text-white/50 mb-2">
                                    {selectedItem.category ?? "Misc gear"}
                                </p>
                                <h3 className="text-2xl font-bold text-white">{selectedItem.name}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedItem(null)}
                                className="text-white/60 hover:text-white transition-colors"
                                title="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Item Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Quantity</p>
                                <p className="text-lg font-semibold text-white mt-1">{selectedItem.quantity}</p>
                            </div>
                            {typeof selectedItem.weight === "number" && (
                                <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Weight</p>
                                    <p className="text-lg font-semibold text-white mt-1">{selectedItem.weight} lb</p>
                                </div>
                            )}
                            {selectedItem.cost && (
                                <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">Cost</p>
                                    <p className="text-lg font-semibold text-white mt-1">{selectedItem.cost}</p>
                                </div>
                            )}
                            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Source</p>
                                <p className="text-lg font-semibold text-white mt-1">{selectedItem.isCustom ? "Custom" : "SRD"}</p>
                            </div>
                        </div>

                        {/* Total Weight */}
                        {typeof selectedItem.weight === "number" && selectedItem.quantity > 1 && (
                            <div className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-3 mb-6">
                                <p className="text-xs uppercase tracking-[0.3em] text-sky-200">Total Weight</p>
                                <p className="text-xl font-semibold text-white mt-1">
                                    {(selectedItem.weight * selectedItem.quantity).toFixed(1)} lb
                                </p>
                                <p className="text-xs text-white/70 mt-1">
                                    {selectedItem.quantity} × {selectedItem.weight} lb
                                </p>
                            </div>
                        )}

                        {/* Description */}
                        {selectedItem.description && (
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70 mb-2">Description</h4>
                                <p className="text-sm text-white/90 leading-relaxed">{selectedItem.description}</p>
                            </div>
                        )}

                        {/* Notes */}
                        {selectedItem.notes && (
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70 mb-2">Notes</h4>
                                <p className="text-sm text-sky-200 leading-relaxed">{selectedItem.notes}</p>
                            </div>
                        )}

                        {/* Meta Info */}
                        <div className="border-t border-white/10 pt-4 mt-6">
                            <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                                Last updated: {selectedItem.updatedAt.toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
