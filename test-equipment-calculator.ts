/**
 * Equipment Calculator Test
 * Run this to verify the equipment calculator logic works correctly
 */

import { EquipmentCalculator } from "./lib/characters/equipment-calculator";
import type { EquippedItem } from "./lib/characters/equipment-types";

// Mock data for testing
const testAbilityModifiers = {
    str: 3,   // 16 STR
    dex: 2,   // 14 DEX
    con: 1,   // 12 CON
    int: 0,   // 10 INT
    wis: 1,   // 12 WIS
    cha: -1,  // 8 CHA
};

const testProficiencies = {
    armor: ["Light Armor", "Medium Armor"],
    weapons: ["Simple Weapons", "Martial Weapons"],
    tools: [],
    skills: [],
    languages: [],
};

// Test 1: Unarmored character (10 + DEX)
console.log("Test 1: Unarmored");
const test1 = new EquipmentCalculator({
    equippedItems: [],
    abilityModifiers: testAbilityModifiers,
    proficiencyBonus: 2,
    proficiencies: testProficiencies,
});
const result1 = test1.calculateBonuses();
console.log("AC:", result1.armorClass.total, "- Expected: 12 (10 + 2 DEX)");
console.log("Main Hand:", result1.mainHand);
console.log("---");

// Test 2: Longsword equipped (1d8 + STR, proficient)
const longswordRef = {
    name: "Longsword",
    damageLabel: "1d8 slashing",
    properties: ["Versatile"],
    categories: ["Weapon", "Martial Weapons", "Melee Weapons"],
    armorClass: null,
    rangeLabel: null,
    detailTags: [],
    description: "A versatile martial weapon",
};

const longswordItem: EquippedItem = {
    id: "item1",
    name: "Longsword",
    slot: "MAIN_HAND",
    referenceId: "longsword",
    reference: longswordRef as any,
};

console.log("Test 2: Longsword equipped");
const test2 = new EquipmentCalculator({
    equippedItems: [longswordItem],
    abilityModifiers: testAbilityModifiers,
    proficiencyBonus: 2,
    proficiencies: testProficiencies,
});
const result2 = test2.calculateBonuses();
console.log("Main Hand Attack:", result2.mainHand?.attackBonus, "- Expected: +5 (3 STR + 2 prof)");
console.log("Main Hand Damage:", result2.mainHand?.damage, "- Expected: 1d8 + 3 slashing");
console.log("Proficient:", result2.mainHand?.proficient, "- Expected: true");
console.log("---");

// Test 3: Chain Mail equipped (base 16, no DEX)
const chainMailRef = {
    name: "Chain Mail",
    armorClass: {
        base: 16,
        dexBonus: false,
        maxBonus: null,
    },
    categories: ["Armor", "Heavy Armor"],
    damageLabel: null,
    properties: [],
    rangeLabel: null,
    detailTags: [],
    description: "Heavy armor",
};

const chainMailItem: EquippedItem = {
    id: "item2",
    name: "Chain Mail",
    slot: "ARMOR",
    referenceId: "chainmail",
    reference: chainMailRef as any,
};

console.log("Test 3: Chain Mail equipped");
const test3 = new EquipmentCalculator({
    equippedItems: [chainMailItem],
    abilityModifiers: testAbilityModifiers,
    proficiencyBonus: 2,
    proficiencies: testProficiencies,
});
const result3 = test3.calculateBonuses();
console.log("AC:", result3.armorClass.total, "- Expected: 16 (no DEX bonus)");
console.log("Breakdown:", result3.armorClass.breakdown);
console.log("---");

// Test 4: Studded Leather + Shield
const studdedLeatherRef = {
    name: "Studded Leather",
    armorClass: {
        base: 12,
        dexBonus: true,
        maxBonus: null,
    },
    categories: ["Armor", "Light Armor"],
    damageLabel: null,
    properties: [],
    rangeLabel: null,
    detailTags: [],
    description: "Light armor",
};

const shieldRef = {
    name: "Shield",
    armorClass: {
        base: 2,
        dexBonus: false,
        maxBonus: null,
    },
    categories: ["Armor", "Shield"],
    damageLabel: null,
    properties: [],
    rangeLabel: null,
    detailTags: [],
    description: "Shield",
};

const studdedLeatherItem: EquippedItem = {
    id: "item3",
    name: "Studded Leather",
    slot: "ARMOR",
    referenceId: "studdedleather",
    reference: studdedLeatherRef as any,
};

const shieldItem: EquippedItem = {
    id: "item4",
    name: "Shield",
    slot: "SHIELD",
    referenceId: "shield",
    reference: shieldRef as any,
};

console.log("Test 4: Studded Leather + Shield");
const test4 = new EquipmentCalculator({
    equippedItems: [studdedLeatherItem, shieldItem],
    abilityModifiers: testAbilityModifiers,
    proficiencyBonus: 2,
    proficiencies: testProficiencies,
});
const result4 = test4.calculateBonuses();
console.log("AC:", result4.armorClass.total, "- Expected: 16 (12 base + 2 DEX + 2 shield)");
console.log("Breakdown:", result4.armorClass.breakdown);
console.log("---");

console.log("All tests completed!");
