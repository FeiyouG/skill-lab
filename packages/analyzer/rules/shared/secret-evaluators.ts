import type { DynamicRuleRiskMapping } from "skill-lab/shared";
import { isSecretLikeName, normalizeKeyCandidate } from "../../utils/secret-validator.ts";

export const DETECT_SECRET_NAME_RISK: DynamicRuleRiskMapping = ({ finding }) => {
    const key = normalizeKeyCandidate(finding.extracted.key ?? finding.extracted.var);
    if (!isSecretLikeName(key)) return null;

    return {
        code: "SECRETS:secret_access",
        severity: "warning",
        message: `Potential secret or credential access: ${key}`,
    };
};
