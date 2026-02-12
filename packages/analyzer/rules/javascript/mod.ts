import type { AstGrepRule } from "../../astgrep/client.ts";
import { JAVASCRIPT_FILESYSTEM_RULES } from "./filesystem.ts";
import { JAVASCRIPT_INJECTION_RULES } from "./injection.ts";
import { JAVASCRIPT_NETWORK_RULES } from "./network.ts";
import { JAVASCRIPT_SECRET_DETECTION_RULES } from "./secret-detection.ts";
import { JAVASCRIPT_SUBPROCESS_RULES } from "./subprocess.ts";

export const JAVASCRIPT_RULES: AstGrepRule[] = [
    ...JAVASCRIPT_NETWORK_RULES,
    ...JAVASCRIPT_FILESYSTEM_RULES,
    ...JAVASCRIPT_INJECTION_RULES,
    ...JAVASCRIPT_SUBPROCESS_RULES,
    ...JAVASCRIPT_SECRET_DETECTION_RULES,
];
