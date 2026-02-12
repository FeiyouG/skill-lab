import type { AstGrepRule } from "../../astgrep/client.ts";
import { PYTHON_NETWORK_RULES } from "./network.ts";
import { PYTHON_SECRET_DETECTION_RULES } from "./secret-detection.ts";

export const PYTHON_RULES: AstGrepRule[] = [
    ...PYTHON_NETWORK_RULES,
    ...PYTHON_SECRET_DETECTION_RULES,
];
