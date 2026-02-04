import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { addItem } from "@/app/characters/actions";
import { getCurrentActor } from "@/lib/current-actor";
import { prisma } from "@/lib/prisma";
import { findReferenceItemById, getItemCategoryOptions, getReferenceItems } from "@/lib/items/reference";
import type { EquipmentSlot } from "@/lib/characters/types";
import { CharacterItemsPageClient } from "./character-items-client";

export const metadata: Metadata = {
    title: "ForgeSheet | Inventory Forge",
    description: "Attach SRD items or custom kit notes to your character sheet.",
};

const referenceItems = getReferenceItems();
const categoryOptions = getItemCategoryOptions();

interface CharacterItemsPageProps {
    params: Promise<{ id: string }>;
}

type Item = {
    id: string;
    name: string;
    category: string | null;
    cost: string | null;
    weight: number | null;
    quantity: number;
    description: string | null;
    notes: string | null;
    referenceId: string | null;
    equippedSlot: EquipmentSlot | null;
    isCustom: boolean;
    updatedAt: Date;
};

export default async function CharacterItemsPage({ params }: CharacterItemsPageProps) {
    const { id } = await params;
    const actor = await getCurrentActor();

    if (!actor) {
        redirect("/");
    }

    const character = await prisma.character.findFirst({
        where: { id, userId: actor.userId },
        select: {
            id: true,
            name: true,
            level: true,
            charClass: true,
            items: {
                orderBy: [
                    { category: "asc" },
                    { name: "asc" },
                ],
                select: {
                    id: true,
                    name: true,
                    category: true,
                    cost: true,
                    weight: true,
                    quantity: true,
                    description: true,
                    notes: true,
                    referenceId: true,
                    equippedSlot: true,
                    isCustom: true,
                    updatedAt: true,
                },
            },
        },
    });

    if (!character) {
        notFound();
    }

    const totalWeight = character.items.reduce((sum, item) => {
        const weight = typeof item.weight === "number" ? item.weight : 0;
        return sum + weight * item.quantity;
    }, 0);
    const formattedWeight = `${totalWeight.toFixed(1)} lb`;

    const categoryTally = character.items.reduce<Map<string, number>>((map, item) => {
        const key = item.category ?? "Misc";
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
    }, new Map());
    const dominantCategories = Array.from(categoryTally.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const itemsWithEquipment = character.items.map((item) => {
        const reference = item.referenceId ? findReferenceItemById(item.referenceId) : null;
        const categories = reference?.categories ?? [];
        const isWeapon = categories.some((category) => /weapon/i.test(category));
        const isArmor = categories.some((category) => /armor/i.test(category));
        const isShield = categories.some((category) => /shield/i.test(category)) || /shield/i.test(item.name);
        return {
            ...item,
            equippedSlot: item.equippedSlot ?? null,
            isWeapon,
            isArmor,
            isShield,
        };
    });

    return (
        <CharacterItemsPageClient
            character={{ ...character, items: itemsWithEquipment }}
            dominantCategories={dominantCategories}
            formattedWeight={formattedWeight}
            referenceItems={referenceItems}
            categoryOptions={categoryOptions}
            addItemAction={addItem}
        />
    );
}
