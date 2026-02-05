import { NextResponse } from "next/server";

import { getCurrentActor } from "@/lib/current-actor";
import { requirePartyMember } from "@/lib/parties/access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MessagePayload = {
    type?: "text" | "item" | "image" | "video";
    text?: string;
    itemName?: string;
    itemNotes?: string;
    attachment?: {
        url: string;
        name?: string;
        size?: number;
        mimeType?: string;
    };
};

function normalizeText(value?: string) {
    return value?.trim() ? value.trim() : null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
    const actor = await getCurrentActor();

    if (!actor) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const payload = (await request.json()) as MessagePayload;
    const type = payload.type;

    if (!type || !["text", "item", "image", "video"].includes(type)) {
        return NextResponse.json({ error: "Message type missing" }, { status: 400 });
    }

    let party: Awaited<ReturnType<typeof requirePartyMember>>;

    try {
        party = await requirePartyMember(params.id, actor.userId);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Party access denied.";
        return NextResponse.json({ error: message }, { status: 403 });
    }

    if (!party.chat?.id) {
        return NextResponse.json({ error: "Party chat not found" }, { status: 404 });
    }

    const text = normalizeText(payload.text);

    if (type === "text" && !text) {
        return NextResponse.json({ error: "Message text missing" }, { status: 400 });
    }

    if (type === "item" && !payload.itemName?.trim()) {
        return NextResponse.json({ error: "Item name missing" }, { status: 400 });
    }

    if ((type === "image" || type === "video") && !payload.attachment?.url) {
        return NextResponse.json({ error: "Attachment missing" }, { status: 400 });
    }

    const message = await prisma.partyMessage.create({
        data: {
            chatId: party.chat.id,
            senderId: actor.userId,
            type,
            text,
            itemSnapshot: type === "item"
                ? { name: payload.itemName?.trim(), notes: normalizeText(payload.itemNotes) }
                : undefined,
            attachments: payload.attachment
                ? {
                    create: {
                        type: type === "video" ? "video" : "image",
                        url: payload.attachment.url,
                        name: payload.attachment.name,
                        size: payload.attachment.size,
                        mimeType: payload.attachment.mimeType,
                    },
                }
                : undefined,
        },
        include: { attachments: true },
    });

    return NextResponse.json({ message });
}
