import { Reference } from "./references.ts";

export type Finding = {
    ruleId: string;
    reference: Reference;
    extracted: Record<string, unknown>;
};
