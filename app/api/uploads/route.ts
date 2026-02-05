import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getCurrentActor } from "@/lib/current-actor";
import { requirePartyMember } from "@/lib/parties/access";

export const runtime = "nodejs";

function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function POST(request: Request) {
    const actor = await getCurrentActor();

    if (!actor) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const partyId = formData.get("partyId");
    const file = formData.get("file");

    if (typeof partyId !== "string" || partyId.trim().length === 0) {
        return NextResponse.json({ error: "Party id missing" }, { status: 400 });
    }

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "File missing" }, { status: 400 });
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        return NextResponse.json({ error: "Only image or video uploads are allowed." }, { status: 400 });
    }

    try {
        await requirePartyMember(partyId, actor.userId);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Party access denied.";
        return NextResponse.json({ error: message }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const extension = path.extname(file.name) || ".bin";
    const safeBase = sanitizeFileName(file.name.replace(extension, "")) || "upload";
    const fileName = `${safeBase}-${randomBytes(6).toString("hex")}${extension}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "parties", partyId);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), buffer);

    const url = `/uploads/parties/${partyId}/${fileName}`;

    return NextResponse.json({
        url,
        name: file.name,
        size: file.size,
        mimeType: file.type,
    });
}
