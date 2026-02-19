import { Card } from "@/components/ui/card";
import { AttackRoller } from "@/components/characters/attack-roller";
import { SpellRoller } from "@/components/characters/spell-roller";
import { getActionsForClass } from "./corebook-actions-data";
import type { EquipmentBonuses } from "@/lib/characters/equipment-types";

type WeaponBonuses = NonNullable<EquipmentBonuses["mainHand"]>;

type Spell = {
    id: string;
    name: string;
    level: number;
    school: string | null;
    affinity: string;
    shape: string;
    range: string | null;
    damage: string | null;
    description: string | null;
    isPrepared: boolean;
};

type Props = {
    charClass: string | null;
    mainHand: WeaponBonuses | null;
    offHand: WeaponBonuses | null;
    mainHandAttackBonus: number;
    mainHandDamage: string | null;
    offHandAttackBonus: number;
    offHandDamage: string | null;
    spells?: Spell[];
    spellSaveDC?: number;
    spellAttackBonus?: number;
};

const LEVEL_ORDINALS = ["Cantrips", "1st-Level", "2nd-Level", "3rd-Level", "4th-Level", "5th-Level", "6th-Level", "7th-Level", "8th-Level", "9th-Level"];

export function CoreActionsCard({
    charClass,
    mainHand,
    offHand,
    mainHandAttackBonus,
    mainHandDamage,
    offHandAttackBonus,
    offHandDamage,
    spells = [],
    spellSaveDC,
    spellAttackBonus,
}: Props) {
    const actionGroups = getActionsForClass(charClass);

    // Group spells by level
    const spellsByLevel = spells.reduce<Map<number, Spell[]>>((map, spell) => {
        const group = map.get(spell.level) ?? [];
        group.push(spell);
        map.set(spell.level, group);
        return map;
    }, new Map());
    const spellLevels = Array.from(spellsByLevel.keys()).sort((a, b) => a - b);

    return (
        <Card
            collapsible
            title="Core Actions"
            titleAs="h2"
            titleClassName="text-sm font-bold uppercase tracking-wider text-white/60"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <p className="mb-4 text-sm text-white/60">
                Corebook actions for{" "}
                <span className="text-white font-semibold">{charClass ?? "your class"}</span>. Attack rolls use your
                equipped weapon, proficiency, and the correct ability modifier from D&amp;D 5e.
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4 lg:col-span-2">
                    <AttackRoller
                        attackBonus={mainHandAttackBonus}
                        damage={mainHandDamage}
                        weaponName={mainHand?.name ?? "Unarmed Strike"}
                        proficiencyApplied={mainHand?.proficient ?? true}
                        unarmedFallbackDamage={mainHand?.damage ?? "1 bludgeoning"}
                    />
                    {offHand && (
                        <div className="mt-3">
                            <AttackRoller
                                attackBonus={offHandAttackBonus}
                                damage={offHandDamage}
                                weaponName={offHand.name}
                                proficiencyApplied={offHand.proficient}
                                unarmedFallbackDamage={offHand.damage}
                            />
                        </div>
                    )}
                </Card>
                {actionGroups.map((group) => (
                    <Card
                        key={group.title}
                        className="rounded-2xl border border-white/15 bg-gradient-to-br from-black/40 to-black/20 p-4"
                    >
                        <div className="mb-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/70">{group.title}</h3>
                            <p className="text-xs text-white/50">{group.hint}</p>
                        </div>
                        <ul className="space-y-2">
                            {group.items.map((item) => (
                                <li key={item.name} className="text-sm text-white/80">
                                    <span className="font-semibold text-white">{item.name}</span>
                                    <span className="text-white/60">: {item.detail}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                ))}

                {/* ── Spells ────────────────────────────────────────────── */}
                {spellLevels.length > 0 && (
                    <div className="lg:col-span-2 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/10" />
                            <p className="text-[0.6rem] font-bold uppercase tracking-[0.3em] text-blue-300/80">Spells</p>
                            <div className="h-px flex-1 bg-white/10" />
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            {spellLevels.map((level) => {
                                const levelSpells = spellsByLevel.get(level)!;
                                const levelLabel = LEVEL_ORDINALS[level] ?? `Level ${level}`;
                                return (
                                    <Card
                                        key={level}
                                        className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-950/40 to-black/30 p-4"
                                    >
                                        <div className="mb-3">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-blue-300/80">{levelLabel}</h3>
                                            <p className="text-xs text-white/40">{levelSpells.length} {levelSpells.length === 1 ? "spell" : "spells"}</p>
                                        </div>
                                        <ul className="space-y-2">
                                            {levelSpells.map((spell) => (
                                                <SpellRoller
                                                    key={spell.id}
                                                    spell={spell}
                                                    spellSaveDC={spellSaveDC}
                                                    spellAttackBonus={spellAttackBonus}
                                                />
                                            ))}
                                        </ul>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
