"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCreateCharacterFormData, parseLevelUpFormData } from "@/lib/characters/form-parsers";
import { CharacterService } from "@/lib/characters/services/character-service";
import { getCurrentActor } from "@/lib/current-actor";

function ensureActor(actor: Awaited<ReturnType<typeof getCurrentActor>> | null, message: string) {
    if (!actor) {
        throw new Error(message);
    }
    return actor;
}

function readId(value: FormDataEntryValue | null) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error("Character id missing.");
    }
    return value.trim();
}

export async function createCharacter(formData: FormData) {
    const actor = ensureActor(await getCurrentActor(), "Authentication required to create characters.");
    const service = new CharacterService(actor);
    const input = parseCreateCharacterFormData(formData);

    await service.createCharacter(input);
    revalidatePath("/characters");
    redirect("/characters");
}

export async function deleteCharacter(formData: FormData) {
    const actor = ensureActor(await getCurrentActor(), "Authentication required to delete characters.");
    const service = new CharacterService(actor);
    const characterId = readId(formData.get("characterId"));

    await service.deleteCharacter(characterId);
    revalidatePath("/characters");
}

export async function levelUpCharacter(formData: FormData) {
    const actor = ensureActor(await getCurrentActor(), "Authentication required to level up characters.");
    const service = new CharacterService(actor);
    const input = parseLevelUpFormData(formData);

    await service.levelUp(input);
    revalidatePath("/characters");
    revalidatePath("/dashboard");
    redirect("/characters");
}
