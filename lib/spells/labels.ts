import type { SpellTargetAffinity, SpellTargetShape } from "@prisma/client";

export const SPELL_SHAPE_LABELS: Record<SpellTargetShape, string> = {
    SINGLE: "Single Target",
    AOE_CIRCLE: "Area · Circle",
    CONE: "Cone",
    LINE: "Line",
    SQUARE: "Square",
};

export const SPELL_AFFINITY_LABELS: Record<SpellTargetAffinity, string> = {
    FRIENDLY: "Friendly",
    HOSTILE: "Hostile",
    ALL: "All Creatures",
    ENVIRONMENT: "Environment",
};
