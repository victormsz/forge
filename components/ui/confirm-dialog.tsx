"use client";

import { useState, type ReactNode } from "react";

interface ConfirmDialogProps {
    title: string;
    message: string | ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
    trigger: (openDialog: () => void) => ReactNode;
}

export function ConfirmDialog({
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "danger",
    onConfirm,
    trigger,
}: ConfirmDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openDialog = () => setIsOpen(true);
    const closeDialog = () => setIsOpen(false);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm();
            closeDialog();
        } catch (error) {
            console.error("Confirm action failed:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const variantStyles = {
        danger: {
            confirmButton: "bg-rose-500/20 border-rose-400/60 text-rose-300 hover:bg-rose-500/30",
            title: "text-rose-300",
        },
        warning: {
            confirmButton: "bg-amber-500/20 border-amber-400/60 text-amber-300 hover:bg-amber-500/30",
            title: "text-amber-300",
        },
        info: {
            confirmButton: "bg-blue-500/20 border-blue-400/60 text-blue-300 hover:bg-blue-500/30",
            title: "text-blue-300",
        },
    };

    const styles = variantStyles[variant];

    return (
        <>
            {trigger(openDialog)}

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={closeDialog}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className={`mb-4 text-xl font-bold ${styles.title}`}>{title}</h2>
                        <div className="mb-6 text-sm text-white/80">{message}</div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeDialog}
                                disabled={isSubmitting}
                                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isSubmitting}
                                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.confirmButton}`}
                            >
                                {isSubmitting ? "Processing..." : confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
