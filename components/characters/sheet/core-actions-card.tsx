import { Card } from "@/components/ui/card";
import { AttackRoller } from "@/components/characters/attack-roller";
import { getActionsForClass } from "./corebook-actions-data";
import type { EquipmentBonuses } from "@/lib/characters/equipment-types";

type WeaponBonuses = NonNullable<EquipmentBonuses["mainHand"]>;

type Props = {
    charClass: string | null;
    mainHand: WeaponBonuses | null;
    offHand: WeaponBonuses | null;
    mainHandAttackBonus: number;
    mainHandDamage: string | null;
    offHandAttackBonus: number;
    offHandDamage: string | null;
};

export function CoreActionsCard({
    charClass,
    mainHand,
    offHand,
    mainHandAttackBonus,
    mainHandDamage,
    offHandAttackBonus,
    offHandDamage,
}: Props) {
    const actionGroups = getActionsForClass(charClass);

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
            </div>
        </Card>
    );
}
