"use client";

import { useState } from "react";
import type { ItemCustomStats } from "@/lib/items/custom-stats";

interface ItemStatsEditorProps {
    itemName: string;
    category: string | null;
    currentStats: ItemCustomStats | null;
    onStatsChange: (stats: ItemCustomStats | null) => void;
}

const WEAPON_PROPERTIES = [
    "Finesse",
    "Versatile",
    "Two-Handed",
    "Light",
    "Heavy",
    "Reach",
    "Thrown",
    "Ammunition",
    "Loading",
];

const RARITY_OPTIONS = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];

/**
 * Item Stats Editor Component
 * 
 * Single Responsibility: Manages UI for editing custom item stats
 * Follows controlled component pattern for React best practices
 */
export function ItemStatsEditor({ itemName, category, currentStats, onStatsChange }: ItemStatsEditorProps) {
    const [localStats, setLocalStats] = useState<ItemCustomStats>(currentStats ?? {});
    const [showAdvanced, setShowAdvanced] = useState(false);

    const isWeapon = category?.toLowerCase().includes("weapon") ?? false;
    const isArmor = category?.toLowerCase().includes("armor") ?? false;
    const isShield = category?.toLowerCase().includes("shield") ?? false;

    function updateField<K extends keyof ItemCustomStats>(key: K, value: ItemCustomStats[K]) {
        const updated = { ...localStats, [key]: value };

        // Remove undefined/null/empty values
        Object.keys(updated).forEach((k) => {
            const val = updated[k as keyof ItemCustomStats];
            if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
                delete updated[k as keyof ItemCustomStats];
            }
        });

        setLocalStats(updated);
        onStatsChange(Object.keys(updated).length > 0 ? updated : null);
    }

    function updateArmorClass(field: "base" | "dexBonus" | "maxDexBonus", value: number | boolean | null) {
        const currentAC = localStats.armorClass ?? { base: 10, dexBonus: true, maxDexBonus: null };
        const updated = { ...currentAC, [field]: value };

        if (field === "maxDexBonus" && value === -1) {
            updated.maxDexBonus = null;
        }

        updateField("armorClass", updated);
    }

    function toggleProperty(property: string) {
        const current = localStats.properties ?? [];
        const updated = current.includes(property)
            ? current.filter((p) => p !== property)
            : [...current, property];
        updateField("properties", updated.length > 0 ? updated : undefined);
    }

    function clearCustomStats() {
        setLocalStats({});
        onStatsChange(null);
    }

    const hasCustomStats = Object.keys(localStats).length > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">
                        Custom Stats
                    </h3>
                    <p className="text-xs text-white/60">Override or enhance base item properties</p>
                </div>
                <div className="flex gap-2">
                    {hasCustomStats && (
                        <button
                            type="button"
                            onClick={clearCustomStats}
                            className="text-xs uppercase tracking-wider text-rose-300 hover:text-rose-200 transition"
                        >
                            Clear All
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-xs uppercase tracking-wider text-sky-300 hover:text-sky-200 transition"
                    >
                        {showAdvanced ? "Hide Advanced" : "Show Advanced"}
                    </button>
                </div>
            </div>

            {/* Magical Bonuses (Most Common) */}
            <div className="rounded-2xl border border-sky-400/30 bg-sky-400/5 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-200 mb-3">Magical Bonuses</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                    {(isWeapon || isShield || isArmor) && (
                        <label className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-wider text-white/60">
                                {isWeapon ? "Attack Bonus" : "AC Bonus"}
                            </span>
                            <input
                                type="number"
                                min="-5"
                                max="5"
                                value={isWeapon ? (localStats.attackBonus ?? "") : (localStats.acBonus ?? "")}
                                onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                                    updateField(isWeapon ? "attackBonus" : "acBonus", val);
                                }}
                                placeholder="0"
                                className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                            />
                        </label>
                    )}
                    {isWeapon && (
                        <label className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-wider text-white/60">Damage Bonus</span>
                            <input
                                type="number"
                                min="-5"
                                max="5"
                                value={localStats.damageBonus ?? ""}
                                onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                                    updateField("damageBonus", val);
                                }}
                                placeholder="0"
                                className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                            />
                        </label>
                    )}
                </div>
            </div>

            {/* Weapon-Specific Stats */}
            {isWeapon && (
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">Weapon Stats</h4>

                    <label className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wider text-white/60">
                            Custom Damage
                        </span>
                        <input
                            type="text"
                            value={localStats.damage ?? ""}
                            onChange={(e) => updateField("damage", e.target.value || undefined)}
                            placeholder="1d8+1d6 slashing/fire"
                            className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white font-mono text-sm"
                        />
                        <p className="text-xs text-white/50">
                            Examples: "1d8 slashing", "1d8+1d6 fire", "2d6+1 radiant"
                        </p>
                    </label>

                    <label className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wider text-white/60">Range</span>
                        <input
                            type="text"
                            value={localStats.range ?? ""}
                            onChange={(e) => updateField("range", e.target.value || undefined)}
                            placeholder="30/120 ft"
                            className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                        />
                    </label>

                    {showAdvanced && (
                        <>
                            <div>
                                <span className="text-xs uppercase tracking-wider text-white/60 block mb-2">
                                    Properties
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {WEAPON_PROPERTIES.map((prop) => (
                                        <button
                                            key={prop}
                                            type="button"
                                            onClick={() => toggleProperty(prop)}
                                            className={`rounded-full px-3 py-1 text-xs transition ${localStats.properties?.includes(prop)
                                                ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-200"
                                                : "border-white/20 bg-white/5 text-white/70 hover:border-white/40"
                                                } border`}
                                        >
                                            {prop}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="flex flex-col gap-2">
                                <span className="text-xs uppercase tracking-wider text-white/60">Mastery</span>
                                <input
                                    type="text"
                                    value={localStats.mastery ?? ""}
                                    onChange={(e) => updateField("mastery", e.target.value || undefined)}
                                    placeholder="Sap, Cleave, etc."
                                    className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                                />
                            </label>
                        </>
                    )}
                </div>
            )}

            {/* Armor-Specific Stats */}
            {isArmor && showAdvanced && (
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">Armor Stats</h4>

                    <label className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wider text-white/60">Base AC</span>
                        <input
                            type="number"
                            min="10"
                            max="25"
                            value={localStats.armorClass?.base ?? ""}
                            onChange={(e) => {
                                const val = e.target.value === "" ? 10 : Number(e.target.value);
                                updateArmorClass("base", val);
                            }}
                            placeholder="10"
                            className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                        />
                    </label>

                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={localStats.armorClass?.dexBonus ?? true}
                            onChange={(e) => updateArmorClass("dexBonus", e.target.checked)}
                            className="h-4 w-4"
                        />
                        <span className="text-sm text-white/80">Add DEX modifier to AC</span>
                    </label>

                    {localStats.armorClass?.dexBonus && (
                        <label className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-wider text-white/60">Max DEX Bonus</span>
                            <select
                                value={localStats.armorClass?.maxDexBonus ?? -1}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    updateArmorClass("maxDexBonus", val === -1 ? null : val);
                                }}
                                className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                            >
                                <option value={-1}>Unlimited</option>
                                <option value={0}>+0</option>
                                <option value={1}>+1</option>
                                <option value={2}>+2</option>
                                <option value={3}>+3</option>
                                <option value={4}>+4</option>
                                <option value={5}>+5</option>
                            </select>
                        </label>
                    )}
                </div>
            )}

            {/* General Properties */}
            {showAdvanced && (
                <div className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">General Properties</h4>

                    <label className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wider text-white/60">Rarity</span>
                        <select
                            value={localStats.rarity ?? ""}
                            onChange={(e) => updateField("rarity", e.target.value || undefined)}
                            className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
                        >
                            <option value="">None</option>
                            {RARITY_OPTIONS.map((rarity) => (
                                <option key={rarity} value={rarity}>
                                    {rarity}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={localStats.requiresAttunement ?? false}
                            onChange={(e) => updateField("requiresAttunement", e.target.checked || undefined)}
                            className="h-4 w-4"
                        />
                        <span className="text-sm text-white/80">Requires Attunement</span>
                    </label>
                </div>
            )}

            {hasCustomStats && (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-3">
                    <p className="text-xs text-amber-200">
                        ✨ Custom stats will override base item properties in calculations
                    </p>
                </div>
            )}
        </div>
    );
}
