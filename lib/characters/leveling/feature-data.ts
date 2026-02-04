import features from "@/db/2014/5e-SRD-Features.json";
import type { ClassFeature } from "./level-data";

interface FeatureReference {
    index: string;
    name: string;
    desc?: string[];
    class?: {
        index: string;
        name: string;
        url: string;
    };
    subclass?: {
        index: string;
        name: string;
        url: string;
    };
}

const featureIndex = new Map<string, FeatureReference>();
const typedFeatures = features as FeatureReference[];

for (const feature of typedFeatures) {
    if (feature?.index) {
        featureIndex.set(feature.index, feature);
    }
}

export interface FeatureWithDescription extends ClassFeature {
    desc: string[];
}

export function getFeatureDetail(index: string): FeatureReference | null {
    return featureIndex.get(index) ?? null;
}

export function withFeatureDescriptions(featuresList: ClassFeature[]): FeatureWithDescription[] {
    return featuresList.map((feature) => {
        const detail = getFeatureDetail(feature.index);
        return {
            ...feature,
            name: detail?.name ?? feature.name,
            desc: detail?.desc ?? [],
        };
    });
}
