"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseCreateCharacterFormData, parseLevelUpFormData, parseAddSpellFormData, parseDeleteSpellFormData, parseToggleSpellPreparationFormData } from "@/lib/characters/form-parsers";
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
    revalidatePath(`/characters/${input.characterId}`);
    revalidatePath(`/characters/${input.characterId}/spells`);
    revalidatePath(`/characters/${input.characterId}/level-up`);
    revalidatePath("/characters");
    revalidatePath("/dashboard");
    redirect(`/characters/${input.characterId}`);
}

export async function addSpell(formData: FormData) {
    const actor = ensureActor(await getCurrentActor(), "Authentication required to track spells.");
    const service = new CharacterService(actor);
    const input = parseAddSpellFormData(formData);

    const characterId = await service.addSpell(input);
    revalidatePath(`/characters/${characterId}`);
    revalidatePath(`/characters/${characterId}/spells`);
    revalidatePath("/characters");
    revalidatePath("/dashboard");
}

export async function deleteSpell(formData: FormData) {
    const actor = ensureActor(await getCurrentActor(), "Authentication required to modify spells.");
    const service = new CharacterService(actor);
    const { spellId } = parseDeleteSpellFormData(formData);

    const characterId = await service.deleteSpell(spellId);
    revalidatePath(`/characters/${characterId}`);
    revalidatePath(`/characters/${characterId}/spells`);
    revalidatePath("/characters");
    revalidatePath("/dashboard");
}

export async function toggleSpellPreparation(formData: FormData) {
    const actor = ensureActor(await getCurrentActor(), "Authentication required to manage prepared spells.");
    const service = new CharacterService(actor);
    const input = parseToggleSpellPreparationFormData(formData);

    const characterId = await service.toggleSpellPreparation(input);
    revalidatePath(`/characters/${characterId}`);
    revalidatePath(`/characters/${characterId}/spells`);
    revalidatePath("/characters");
    revalidatePath("/dashboard");
}
