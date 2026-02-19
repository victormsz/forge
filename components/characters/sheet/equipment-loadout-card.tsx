import { Card } from "@/components/ui/card";
import type { ItemReference } from "@/lib/items/reference";

type EquippedSlotItem = {
    name: string;
    damage?: string | null;
    acBase?: number | null;
} | null;

type Props = {
    mainHand: EquippedSlotItem;
    offHand: EquippedSlotItem;
    armor: EquippedSlotItem;
    shield: EquippedSlotItem;
};

function SlotRow({ label, item }: { label: string; item: EquippedSlotItem }) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-1">{label}</p>
            <p className="text-white font-semibold">{item?.name ?? "None"}</p>
            {item?.damage && <p className="text-xs text-white/60">{item.damage}</p>}
            {item?.acBase != null && <p className="text-xs text-white/60">AC {item.acBase}</p>}
        </div>
    );
}

export function EquipmentLoadoutCard({ mainHand, offHand, armor, shield }: Props) {
    return (
        <Card
            collapsible
            title="Equipment Loadout"
            titleAs="h2"
            titleClassName="text-sm font-bold uppercase tracking-wider text-white/70"
            headerClassName="flex items-start justify-between gap-3 p-6"
            bodyClassName="px-6 pb-6"
            className="rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
        >
            <div className="space-y-4 text-sm">
                <SlotRow label="Main Hand" item={mainHand} />
                <SlotRow label="Off Hand" item={offHand} />
                <SlotRow label="Armor" item={armor} />
                <SlotRow label="Shield" item={shield} />
            </div>
        </Card>
    );
}
