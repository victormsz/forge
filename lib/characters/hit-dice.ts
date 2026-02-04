const CLASS_HIT_DICE_MAP: Record<string, number> = {
    barbarian: 12,
    fighter: 10,
    paladin: 10,
    ranger: 10,
    bloodhunter: 10,
    artificer: 8,
    bard: 8,
    cleric: 8,
    druid: 8,
    monk: 8,
    rogue: 8,
    warlock: 8,
    sorcerer: 6,
    wizard: 6,
};

export function getHitDieValue(charClass: string | null | undefined): number {
    if (!charClass) {
        return 8;
    }
    const normalized = charClass.replace(/[^a-z]/gi, "").toLowerCase();
    return CLASS_HIT_DICE_MAP[normalized] ?? 8;
}

export function calculateMaxHp(level: number, hitDie: number, conModifier: number) {
    if (level <= 0) {
        return 0;
    }
    const firstLevel = hitDie + conModifier;
    const extraLevels = Math.max(0, level - 1);
    const averageRoll = Math.floor(hitDie / 2) + 1;
    const additional = extraLevels * (averageRoll + conModifier);
    const total = firstLevel + additional;
    return Math.max(level, total);
}

export function isValidHitDiceRoll(value: unknown, hitDieValue: number): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= hitDieValue;
}
