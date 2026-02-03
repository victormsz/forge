import { NextResponse } from "next/server";

import { getCurrentActor } from "@/lib/current-actor";
import { generateCharacterSheetPdf } from "@/lib/export";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "character";
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const actor = await getCurrentActor();

    if (!actor) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const character = await prisma.character.findFirst({
        where: {
            id: params.id,
            userId: actor.userId,
        },
    });

    if (!character) {
        return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const abilityScores = (character.abilityScores as Record<string, number>) ?? {};

    try {
        const pdfBytes = await generateCharacterSheetPdf({
            name: character.name,
            level: character.level,
            charClass: character.charClass,
            background: character.background,
            alignment: character.alignment,
            walkingSpeed: null,
            abilityScores,
        });

        return new NextResponse(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${slugify(character.name)}.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        console.error("Failed to generate sheet", error);
        return NextResponse.json({ error: "Failed to build PDF" }, { status: 500 });
    }
}
