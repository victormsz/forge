import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PartyChatComposer } from "@/components/parties/party-chat-composer";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "ForgeSheet | Party Chat",
    description: "Chat with your party, share items, and upload images or video clips.",
};

type PartyChatPageProps = {
    params: Promise<{ id: string }>;
};

export default async function PartyChatPage({ params }: PartyChatPageProps) {
    const { id } = await params;
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const party = await prisma.party.findFirst({
        where: {
            id,
            OR: [
                { ownerId: actor.userId },
                { members: { some: { userId: actor.userId } } },
            ],
        },
        include: {
            chat: { select: { id: true } },
        },
    });

    if (!party || !party.chat) {
        notFound();
    }

    const messages = await prisma.partyMessage.findMany({
        where: { chatId: party.chat.id },
        include: {
            sender: { select: { id: true, name: true, email: true } },
            attachments: true,
        },
        orderBy: { createdAt: "asc" },
        take: 100,
    });

    return (
        <div className="min-h-screen bg-forge text-white">
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Party Chat</p>
                        <h1 className="mt-2 text-3xl font-semibold">{party.name}</h1>
                    </div>
                    <Link
                        href={`/parties/${party.id}`}
                        className="rounded-xl border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/50"
                    >
                        Back to party
                    </Link>
                </header>

                <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <div className="space-y-4">
                        {messages.length === 0 ? (
                            <p className="text-sm text-white/60">No messages yet. Say hello!</p>
                        ) : (
                            messages.map((message) => (
                                <div key={message.id} className="rounded-xl border border-white/15 bg-black/30 p-4">
                                    <div className="flex items-center justify-between text-xs text-white/50">
                                        <span>{message.sender.name ?? message.sender.email ?? "Party member"}</span>
                                        <span>{message.createdAt.toLocaleString()}</span>
                                    </div>
                                    {message.text && (
                                        <p className="mt-2 text-sm text-white/80">{message.text}</p>
                                    )}
                                    {message.type === "item" && message.itemSnapshot && (
                                        <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                                            <p className="font-semibold">{(message.itemSnapshot as { name?: string }).name ?? "Shared item"}</p>
                                            {(message.itemSnapshot as { notes?: string }).notes && (
                                                <p className="mt-1 text-xs text-amber-100/80">{(message.itemSnapshot as { notes?: string }).notes}</p>
                                            )}
                                        </div>
                                    )}
                                    {message.attachments.length > 0 && (
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                            {message.attachments.map((attachment) => (
                                                <a
                                                    key={attachment.id}
                                                    href={attachment.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white/70 hover:border-rose-200/60"
                                                >
                                                    <p className="text-white">{attachment.name ?? "Attachment"}</p>
                                                    <p className="mt-1 text-white/50">{attachment.mimeType ?? attachment.type}</p>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <PartyChatComposer partyId={party.id} />
            </main>
        </div>
    );
}
