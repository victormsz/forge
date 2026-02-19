import { useState } from "react";
import { validateCustomSubclassJson, parseCustomSubclassJson, type CustomSubclass } from "@/lib/classes/custom-subclass";

interface CustomSubclassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (customSubclass: CustomSubclass) => void;
    parentClassName: string;
    parentClassIndex: string;
}

export function CustomSubclassModal({
    isOpen,
    onClose,
    onSubmit,
    parentClassName,
    parentClassIndex,
}: CustomSubclassModalProps) {
    const [jsonInput, setJsonInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        setError(null);

        const validation = validateCustomSubclassJson(jsonInput);
        if (validation) {
            setError(validation);
            return;
        }

        const parsed = parseCustomSubclassJson(jsonInput);
        if (!parsed) {
            setError("Failed to parse JSON. Please check the format and try again.");
            return;
        }

        setIsSubmitting(true);
        // Validate that the subclass belongs to the expected class
        if (parsed.class.index.toLowerCase() !== parentClassIndex.toLowerCase()) {
            setError(`This subclass belongs to ${parsed.class.name}, not ${parentClassName}`);
            setIsSubmitting(false);
            return;
        }

        onSubmit(parsed);
        setIsSubmitting(false);

        // Reset form
        setJsonInput("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#02050b] p-6">
                <h2 className="text-xl font-bold text-white">Add Custom Subclass</h2>
                <p className="mt-1 text-sm text-white/60">Paste D&D 5e API JSON for {parentClassName}</p>

                {error && (
                    <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                        <p className="text-sm text-rose-200">{error}</p>
                    </div>
                )}

                <div className="mt-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                            Subclass JSON
                        </label>
                        <p className="mt-1 text-xs text-white/40">
                            Paste a D&D 5e API subclass JSON with: index, name, class (index, name), subclass_flavor, and desc array
                        </p>
                        <textarea
                            placeholder={`{
  "index": "oath-of-devotion",
  "name": "Oath of Devotion",
  "class": {
    "index": "paladin",
    "name": "Paladin"
  },
  "subclass_flavor": "Sacred Oath",
  "desc": ["Your oath of devotion..."]
}`}
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none"
                            rows={12}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/10 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || jsonInput.trim().length === 0}
                        className="flex-1 rounded-lg border border-sky-400/50 bg-sky-400/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-300 hover:bg-sky-400/20 disabled:opacity-50"
                    >
                        {isSubmitting ? "Adding..." : "Add Subclass"}
                    </button>
                </div>
            </div>
        </div>
    );
}
