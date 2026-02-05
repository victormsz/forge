"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

type UploadResponse = {
    url: string;
    name: string;
    size: number;
    mimeType: string;
};

type PartyChatComposerProps = {
    partyId: string;
};

type MessagePayload = {
    type: "text" | "item" | "image" | "video";
    text?: string;
    itemName?: string;
    itemNotes?: string;
    attachment?: UploadResponse;
};

export function PartyChatComposer({ partyId }: PartyChatComposerProps) {
    const router = useRouter();
    const [text, setText] = useState("");
    const [itemName, setItemName] = useState("");
    const [itemNotes, setItemNotes] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    async function sendMessage(payload: MessagePayload) {
        const response = await fetch(`/api/parties/${partyId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.error || "Unable to send message.");
        }
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setStatus(null);

        if (!text.trim() && !itemName.trim() && !file) {
            setStatus("Add a message, shared item, or upload.");
            return;
        }

        setIsSending(true);

        try {
            if (file) {
                const formData = new FormData();
                formData.append("partyId", partyId);
                formData.append("file", file);

                const uploadResponse = await fetch("/api/uploads", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadResponse.ok) {
                    const error = await uploadResponse.json().catch(() => null);
                    throw new Error(error?.error || "Upload failed.");
                }

                const upload = (await uploadResponse.json()) as UploadResponse;
                const isVideo = upload.mimeType.startsWith("video/");

                await sendMessage({
                    type: isVideo ? "video" : "image",
                    text: text.trim() ? text.trim() : undefined,
                    attachment: upload,
                });
            } else if (itemName.trim()) {
                await sendMessage({
                    type: "item",
                    text: text.trim() ? text.trim() : undefined,
                    itemName: itemName.trim(),
                    itemNotes: itemNotes.trim() ? itemNotes.trim() : undefined,
                });
            } else {
                await sendMessage({
                    type: "text",
                    text: text.trim(),
                });
            }

            setText("");
            setItemName("");
            setItemNotes("");
            setFile(null);
            router.refresh();
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Unable to send message.");
        } finally {
            setIsSending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                <div className="space-y-3">
                    <textarea
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Write a message to the party..."
                        rows={3}
                        className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-rose-300/40"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <input
                            value={itemName}
                            onChange={(event) => setItemName(event.target.value)}
                            placeholder="Share an item (name)"
                            className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                        />
                        <input
                            value={itemNotes}
                            onChange={(event) => setItemNotes(event.target.value)}
                            placeholder="Item notes (optional)"
                            className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300/40"
                        />
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Upload</label>
                    <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-rose-400 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black"
                    />
                    <p className="text-xs text-white/50">Attach an image or video to share.</p>
                </div>
            </div>

            {status && <p className="mt-3 text-sm text-amber-200">{status}</p>}

            <div className="mt-4 flex justify-end">
                <button
                    type="submit"
                    disabled={isSending}
                    className="rounded-xl bg-rose-400 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
                >
                    {isSending ? "Sending..." : "Send"}
                </button>
            </div>
        </form>
    );
}
