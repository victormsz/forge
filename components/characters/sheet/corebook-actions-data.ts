export type ActionItem = {
    name: string;
    detail: string;
    /** If defined, only these classes see this action. Undefined = universal. */
    classes?: string[];
};

export type ActionGroup = {
    title: string;
    hint: string;
    items: ActionItem[];
};

export const CASTER_CLASSES = ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard", "Paladin", "Ranger"];

export const ALL_COREBOOK_ACTION_GROUPS: ActionGroup[] = [
    {
        title: "Actions",
        hint: "Choose one action on your turn.",
        items: [
            { name: "Attack", detail: "Make a weapon or unarmed strike. You can also grapple or shove." },
            { name: "Cast a Spell", detail: "Cast a spell with a casting time of 1 action.", classes: CASTER_CLASSES },
            { name: "Dash", detail: "Gain extra movement equal to your speed." },
            { name: "Disengage", detail: "Your movement does not provoke opportunity attacks this turn." },
            { name: "Dodge", detail: "Attackers have disadvantage; you gain advantage on Dex saves." },
            { name: "Help", detail: "Give an ally advantage on a task or attack." },
            { name: "Hide", detail: "Attempt to hide if you have cover or are obscured." },
            { name: "Ready", detail: "Prepare a trigger and response using your reaction." },
            { name: "Search", detail: "Look for something; uses an ability check." },
        ],
    },
    {
        title: "Bonus Actions",
        hint: "Extra abilities that can happen on a turn.",
        items: [
            { name: "Off-hand Attack", detail: "Light weapon attack after an Attack action." },
            { name: "Second Wind", detail: "Fighters regain hit points as a bonus action.", classes: ["Fighter"] },
            { name: "Bardic Inspiration", detail: "Inspire an ally within 60 feet.", classes: ["Bard"] },
            { name: "Rage", detail: "Barbarians enter a furious state of battle.", classes: ["Barbarian"] },
            { name: "Cunning Action", detail: "Dash, Disengage, or Hide as a bonus action.", classes: ["Rogue"] },
            { name: "Flurry of Blows", detail: "Spend 1 ki to make two unarmed strikes.", classes: ["Monk"] },
            { name: "Wild Shape", detail: "Transform into a beast as a bonus action.", classes: ["Druid"] },
            { name: "Healing Word", detail: "Quick healing spell as a bonus action.", classes: ["Bard", "Cleric", "Druid"] },
            { name: "Hex / Hunter's Mark", detail: "Concentration spell extended as a bonus action.", classes: ["Warlock", "Ranger"] },
            { name: "Divine Smite", detail: "Expend a spell slot to add radiant damage.", classes: ["Paladin"] },
        ],
    },
    {
        title: "Reactions",
        hint: "One reaction between turns.",
        items: [
            { name: "Opportunity Attack", detail: "Strike a foe that leaves your reach." },
            { name: "Shield", detail: "Boost AC for a round with a spell.", classes: ["Wizard", "Sorcerer"] },
            { name: "Counterspell", detail: "Interrupt a spell cast within 60 feet.", classes: ["Bard", "Sorcerer", "Warlock", "Wizard"] },
            { name: "Uncanny Dodge", detail: "Halve damage from an attacker you can see.", classes: ["Rogue"] },
            { name: "Absorb Elements", detail: "Soak and convert elemental damage.", classes: ["Druid", "Ranger", "Sorcerer", "Wizard"] },
            { name: "Parry", detail: "Reduce melee damage using your reaction.", classes: ["Fighter", "Paladin"] },
            { name: "Sneak Attack (reaction)", detail: "Opportunity attack may trigger Sneak Attack.", classes: ["Rogue"] },
        ],
    },
    {
        title: "Movement",
        hint: "Movement is separate from your action.",
        items: [
            { name: "Move", detail: "Up to your speed; split before and after actions." },
            { name: "Jump", detail: "Long or high jump based on Strength and movement." },
            { name: "Climb / Swim / Crawl", detail: "Movement modes that can cost extra speed." },
            { name: "Stand Up", detail: "Spend movement to rise from prone." },
            { name: "Interact with Object", detail: "Draw a weapon, open a door, etc." },
        ],
    },
];

export function getActionsForClass(charClass: string | null): ActionGroup[] {
    return ALL_COREBOOK_ACTION_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => {
            if (!item.classes) return true;
            if (!charClass) return false;
            return item.classes.includes(charClass);
        }),
    })).filter((group) => group.items.length > 0);
}
