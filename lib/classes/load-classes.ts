import classesData from "@/db/2014/5e-SRD-Classes.json";
import subclassesData from "@/db/2014/5e-SRD-Subclasses.json";
import { getSubclassLevel } from "@/lib/characters/leveling/level-data";

export interface ProficiencyChoiceOptionItem {
    option_type: string;
    item?: {
        index: string;
        name: string;
        url: string;
    };
}

export interface ProficiencyChoice {
    desc: string;
    choose: number;
    type: string;
    from: {
        option_set_type: string;
        options: ProficiencyChoiceOptionItem[];
    };
}

export interface Proficiency {
    index: string;
    name: string;
    url: string;
}

export interface EquipmentEntity {
    index: string;
    name: string;
    url: string;
}

export interface EquipmentReference {
    equipment: EquipmentEntity;
    quantity: number;
}

export interface CountedReferenceOption {
    option_type: "counted_reference";
    count?: number;
    of?: EquipmentEntity;
}

export interface EquipmentNestedChoice {
    option_type: "choice";
    choice?: {
        desc?: string;
        choose?: number;
        type?: string;
        from?: {
            option_set_type: string;
            options?: EquipmentOptionChoice[];
        };
    };
}

export type EquipmentOptionChoice =
    | CountedReferenceOption
    | EquipmentNestedChoice
    | {
        option_type: string;
        [key: string]: unknown;
    };

export interface EquipmentOptionSource {
    option_set_type: string;
    options?: EquipmentOptionChoice[];
    equipment_category?: {
        index: string;
        name: string;
        url: string;
    };
}

export interface EquipmentOption {
    desc: string;
    choose: number;
    type: string;
    from: EquipmentOptionSource;
}

export interface ClassData {
    index: string;
    name: string;
    hit_die: number;
    proficiency_choices: ProficiencyChoice[];
    proficiencies: Proficiency[];
    saving_throws: Array<{
        index: string;
        name: string;
        url: string;
    }>;
    starting_equipment: EquipmentReference[];
    starting_equipment_options: EquipmentOption[];
    subclasses?: Array<{ index: string; name: string; url: string }>;
}

export interface Subclass {
    index: string;
    name: string;
    desc: string[];
    subclass_flavor: string;
}

export interface SubclassOption {
    index: string;
    name: string;
    description: string;
    flavorText: string;
}

export interface ClassOption {
    label: string;
    value: string;
    description: string;
    detail: string;
    hitDie: number;
    proficiencies: {
        armor: string[];
        weapons: string[];
        tools: string[];
        skills: {
            fixed: string[];
            choices?: {
                count: number;
                options: string[];
            };
        };
    };
    savingThrows: string[];
    subclasses?: SubclassOption[];
    startingEquipment: EquipmentReference[];
    startingEquipmentOptions: EquipmentOption[];
}

const classDescriptions: Record<string, string> = {
    barbarian: "Rage-fueled frontline bruiser.",
    bard: "Versatile support with spellcraft and song.",
    cleric: "Divine caster anchoring any party.",
    druid: "Shapeshifter commanding primal magic.",
    fighter: "Weapon master with unmatched flexibility.",
    monk: "Martial artist channeling ki.",
    paladin: "Oath-bound warrior with radiant smites.",
    ranger: "Skilled scout with nature magic.",
    rogue: "Stealth expert and crit fisher.",
    sorcerer: "Innate arcane talent, metamagic tricks.",
    warlock: "Pact mage with eldritch invocations.",
    wizard: "Prepared arcane scholar with vast spellbooks.",
};

const classDetails: Record<string, string> = {
    barbarian: "Tap into primal fury to shrug off wounds and deal devastating blows in the thick of combat.",
    bard: "Master of inspiration and versatility, weaving magic through music to support allies and control the battlefield.",
    cleric: "Channel divine power to heal, protect, and smite enemies while serving your deity's will.",
    druid: "Commune with nature to cast powerful spells and transform into beasts, adapting to any challenge.",
    fighter: "Unrivaled combat prowess with mastery of weapons, armor, and tactics for any situation.",
    monk: "Harness ki energy to strike with supernatural speed, deflect missiles, and perform incredible feats.",
    paladin: "Combine martial skill with divine magic, smiting evil and defending allies with unwavering conviction.",
    ranger: "Expert tracker and archer who blends martial skill with nature magic to protect the wild.",
    rogue: "Master of stealth, deception, and precision strikes that exploit enemy weaknesses.",
    sorcerer: "Wield innate magical power, bending spells to your will with metamagic and raw charisma.",
    warlock: "Draw power from otherworldly patrons, wielding eldritch magic and mysterious invocations.",
    wizard: "Study the arcane arts to master a vast array of spells and bend reality to your intellect.",
};

function extractSkillName(proficiencyName: string): string {
    // "Skill: Animal Handling" -> "Animal Handling"
    return proficiencyName.replace(/^Skill:\s*/i, "").trim();
}

function categorizeProficiency(prof: Proficiency): { category: "armor" | "weapons" | "tools" | null; name: string } {
    const name = prof.name.toLowerCase();

    if (name.includes("armor") || name === "shields") {
        return { category: "armor", name: prof.name };
    }

    if (name.includes("weapon")) {
        return { category: "weapons", name: prof.name };
    }

    // Tools would include things like thieves' tools, musical instruments, etc.
    if (name.includes("tools") || name.includes("kit") || prof.index.includes("tool")) {
        return { category: "tools", name: prof.name };
    }

    // Skills and saving throws are handled separately
    return { category: null, name: prof.name };
}

export function getClassOptions(): ClassOption[] {
    // First, create a lookup map of detailed subclass info from Subclasses.json
    const subclassDetailsMap = new Map<string, Subclass>();
    (subclassesData as Subclass[]).forEach((subclass) => {
        subclassDetailsMap.set(subclass.index, subclass);
    });

    return (classesData as ClassData[]).map((classData) => {
        const armorProfs: string[] = [];
        const weaponProfs: string[] = [];
        const toolProfs: string[] = [];
        const fixedSkills: string[] = [];
        let skillChoices: { count: number; options: string[] } | undefined;

        // Process fixed proficiencies
        classData.proficiencies.forEach((prof) => {
            const { category, name } = categorizeProficiency(prof);

            if (category === "armor") {
                armorProfs.push(name);
            } else if (category === "weapons") {
                weaponProfs.push(name);
            } else if (category === "tools") {
                toolProfs.push(name);
            } else if (prof.name.startsWith("Skill:")) {
                fixedSkills.push(extractSkillName(prof.name));
            }
        });

        // Process proficiency choices (skills selection)
        classData.proficiency_choices?.forEach((choice) => {
            if (choice.type === "proficiencies" && choice.desc.toLowerCase().includes("skill")) {
                const skillOptions = choice.from.options
                    .filter((opt) => opt.item?.name.startsWith("Skill:"))
                    .map((opt) => extractSkillName(opt.item!.name));

                if (skillOptions.length > 0) {
                    skillChoices = {
                        count: choice.choose,
                        options: skillOptions,
                    };
                }
            }
        });

        // Extract saving throw names
        const savingThrows = classData.saving_throws.map((st) => st.name);

        // Get subclasses from the class data and enrich with details from Subclasses.json
        // Only include subclasses if they are available at level 1 (for character creation)
        const subclassLevel = getSubclassLevel(classData.name);
        const subclasses: SubclassOption[] | undefined =
            subclassLevel === 1
                ? classData.subclasses?.map((subclassRef) => {
                    const details = subclassDetailsMap.get(subclassRef.index);
                    return {
                        index: subclassRef.index,
                        name: subclassRef.name,
                        description: details?.desc?.[0] || `The ${subclassRef.name} subclass.`,
                        flavorText: details?.subclass_flavor || "Subclass",
                    };
                })
                : undefined;
        return {
            label: classData.name,
            value: classData.name,
            description: classDescriptions[classData.index] || `${classData.name} class.`,
            detail: classDetails[classData.index] || `A powerful ${classData.name.toLowerCase()} ready for adventure.`,
            hitDie: classData.hit_die,
            proficiencies: {
                armor: armorProfs,
                weapons: weaponProfs,
                tools: toolProfs,
                skills: {
                    fixed: fixedSkills,
                    choices: skillChoices,
                },
            },
            savingThrows,
            subclasses,
            startingEquipment: classData.starting_equipment || [],
            startingEquipmentOptions: classData.starting_equipment_options || [],
        };
    });
}
