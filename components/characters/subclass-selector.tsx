"use client";

import { useState } from "react";
import type { SelectOption, SubclassInfo } from "@/lib/characters/level-up-options";

interface SubclassSelectorProps {
    subclassOptions: SelectOption[];
    subclassDescriptions: Record<string, SubclassInfo>;
}

export function SubclassSelector({ subclassOptions, subclassDescriptions }: SubclassSelectorProps) {
    const [selectedSubclass, setSelectedSubclass] = useState<string>("");
    const subclassInfo = selectedSubclass ? subclassDescriptions[selectedSubclass] : null;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label htmlFor="subclass" className="text-sm font-semibold">
                    Subclass
                </label>
                <span className="text-xs text-white/60">Required at this level</span>
            </div>
            {subclassOptions.length > 0 ? (
                <>
                    <select
                        id="subclass"
                        name="subclass"
                        value={selectedSubclass}
                        onChange={(e) => setSelectedSubclass(e.target.value)}
                        className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white focus:border-rose-300 focus:outline-none"
                    >
                        <option value="">Select a subclass</option>
                        {subclassOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {subclassInfo && (
                        <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-amber-200">{subclassInfo.name}</h3>
                                <span className="text-xs uppercase tracking-wider text-amber-300/70">
                                    {subclassInfo.subclass_flavor}
                                </span>
                            </div>
                            <div className="space-y-2 text-sm text-amber-100/90">
                                {subclassInfo.desc.map((paragraph, index) => (
                                    <p key={index}>{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <input
                    id="subclass"
                    name="subclass"
                    type="text"
                    placeholder="Enter the subclass name"
                    className="w-full rounded-2xl border border-dashed border-white/30 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-rose-300 focus:outline-none"
                />
            )}
        </div>
    );
}
