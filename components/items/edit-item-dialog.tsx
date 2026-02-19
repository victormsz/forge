"use client";

import { useState } from "react";
import { ItemStatsEditor } from "@/components/items/item-stats-editor";
import type { ItemCustomStats } from "@/lib/items/custom-stats";

interface EditItemDialogProps {
    item: {
        id: string;
        name: string;
        category: string | null;
        customStats: ItemCustomStats | null;
    };
    characterId: string;
    onClose: () => void;
    onSave: (itemId: string, customStats: ItemCustomStats | null) => Promise<void>;
}

/**
 * Edit Item Dialog Component
 * 
 * Single Responsibility: Provides UI for editing item custom stats
 * Clean separation between presentation and business logic
 */
export function EditItemDialog({ item, characterId, onClose, onSave }: EditItemDialogProps) {
    const [customStats, setCustomStats] = useState<ItemCustomStats | null>(item.customStats);
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        setIsSaving(true);
        try {
            await onSave(item.id, customStats);
            onClose();
        } catch (error) {
            console.error("Failed to save item stats:", error);
            alert("Failed to save item stats. Please try again.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={onClose}
        >
            <div
                className="max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-neutral-900 to-neutral-950 p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{item.name}</h2>
                        <p className="text-sm text-white/60 mt-1">Edit custom stats and magical properties</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <ItemStatsEditor
                    itemName={item.name}
                    category={item.category}
                    currentStats={customStats}
                    onStatsChange={setCustomStats}
                />

                <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white/80 transition hover:border-white/40 hover:text-white disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-sky-400 to-teal-300 px-6 py-3 text-sm font-semibold uppercase tracking-wider text-black transition hover:opacity-90 disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
