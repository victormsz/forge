/**
 * Custom Subclass System
 * Allows users to define and save custom subclasses matching the SRD Subclass model
 */

export interface CustomSubclass {
    index: string; // Unique identifier (e.g., "custom-mysubclass")
    name: string; // Display name (e.g., "Shadow Blade")
    class: {
        index: string; // Parent class index (e.g., "rogue")
        name: string; // Parent class name (e.g., "Rogue")
    };
    subclass_flavor: string; // Flavor text (e.g., "Rogue Archetype")
    desc: string[]; // Array of description paragraphs
}

export interface CustomSubclassInput {
    name: string;
    flavorText: string;
    description: string;
}

export interface CustomSubclassJsonInput {
    index: string;
    name: string;
    class: {
        index: string;
        name: string;
    };
    subclass_flavor: string;
    desc: string[];
}

/**
 * Converts user input into a full CustomSubclass object
 */
export function buildCustomSubclass(
    input: CustomSubclassInput,
    parentClassName: string,
    parentClassIndex: string
): CustomSubclass {
    // Generate a URL-safe index from name
    const index = `custom-${input.name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}`;

    return {
        index,
        name: input.name,
        class: {
            index: parentClassIndex,
            name: parentClassName,
        },
        subclass_flavor: input.flavorText,
        desc: [input.description], // Store as single-element array for consistency
    };
}

/**
 * Validates and parses JSON input from D&D 5e API format
 */
export function parseCustomSubclassJson(jsonString: string): CustomSubclass | null {
    try {
        const data = JSON.parse(jsonString) as CustomSubclassJsonInput;

        // Validate required fields
        if (!data.index || !data.name || !data.class?.index || !data.class?.name || !data.subclass_flavor || !Array.isArray(data.desc)) {
            return null;
        }

        // Convert to custom-prefix if not already
        const index = data.index.startsWith("custom-") ? data.index : `custom-${data.index}`;

        return {
            index,
            name: data.name,
            class: {
                index: data.class.index,
                name: data.class.name,
            },
            subclass_flavor: data.subclass_flavor,
            desc: data.desc,
        };
    } catch {
        return null;
    }
}

/**
 * Validates custom subclass JSON input before submission
 */
export function validateCustomSubclassJson(jsonString: string): string | null {
    if (!jsonString || jsonString.trim().length === 0) {
        return "JSON input is required.";
    }

    const parsed = parseCustomSubclassJson(jsonString);
    if (!parsed) {
        return "Invalid JSON format. Required fields: index, name, class (with index and name), subclass_flavor, desc (array).";
    }

    if (parsed.name.length > 100) {
        return "Subclass name must be 100 characters or less.";
    }
    if (parsed.subclass_flavor.length > 50) {
        return "Subclass flavor text must be 50 characters or less.";
    }
    const combinedDesc = parsed.desc.join(" ");
    if (combinedDesc.length > 2000) {
        return "Description must be 2000 characters or less.";
    }

    return null;
}

/**
 * Validates custom subclass input before submission
 */
export function validateCustomSubclass(input: CustomSubclassInput): string | null {
    if (!input.name || input.name.trim().length === 0) {
        return "Subclass name is required.";
    }
    if (input.name.length > 100) {
        return "Subclass name must be 100 characters or less.";
    }
    if (!input.flavorText || input.flavorText.trim().length === 0) {
        return "Subclass flavor text is required.";
    }
    if (input.flavorText.length > 50) {
        return "Flavor text must be 50 characters or less.";
    }
    if (!input.description || input.description.trim().length === 0) {
        return "Subclass description is required.";
    }
    if (input.description.length > 2000) {
        return "Description must be 2000 characters or less.";
    }
    return null;
}

/**
 * Converts CustomSubclass object to display-friendly SubclassOption format
 */
export function customSubclassToOption(custom: CustomSubclass) {
    return {
        value: custom.index,
        label: custom.name,
    };
}

/**
 * Checks if a subclass value is a custom subclass (by index format)
 */
export function isCustomSubclassIndex(value: string): boolean {
    return value.startsWith("custom-");
}
