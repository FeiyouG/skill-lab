import type { AstGrepRule } from "../../../astgrep/client.ts";
import { BD_RULES } from "./bd.ts";
import { CRON_RULES } from "./cron.ts";
import { DOCKER_RULES } from "./docker.ts";
import { EVAL_RULES } from "./eval.ts";
import { GENERIC_SHELL_RULES } from "./generic.ts";
import { GH_RULES } from "./gh.ts";
import { GIT_RULES } from "./git.ts";
import { NODE_ECOSYSTEM_RULES } from "./node.ts";
import { OPENSPEC_RULES } from "./openspec.ts";
import { SUDO_RULES } from "./sudo.ts";

export * from "./bd.ts";
export * from "./cron.ts";
export * from "./docker.ts";
export * from "./eval.ts";
export * from "./generic.ts";
export * from "./gh.ts";
export * from "./git.ts";
export * from "./node.ts";
export * from "./openspec.ts";
export * from "./sudo.ts";

export const BASH_COMMAND_RULES: AstGrepRule[] = [
    ...GIT_RULES,
    ...GH_RULES,
    ...NODE_ECOSYSTEM_RULES,
    ...DOCKER_RULES,
    ...BD_RULES,
    ...SUDO_RULES,
    ...EVAL_RULES,
    ...OPENSPEC_RULES,
    ...CRON_RULES,
    ...GENERIC_SHELL_RULES,
];
