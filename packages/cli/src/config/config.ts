import { join } from "jsr:@std/path@^1.0.0";

const GRAMMAR_KEYS = new Set([
    "bash",
    "javascript",
    "python",
    "typescript",
    "tsx",
    "markdown",
    "markdown-inline",
]);

// Config file location
export function resolveConfigDir(): string {
    const explicit = Deno.env.get("SKILL_LAB_CONFIG_DIR");
    if (explicit) return explicit;

    const xdgDir = Deno.env.get("XDG_CONFIG_DIR");
    if (xdgDir) return join(xdgDir, "skill-lab");

    if (Deno.build.os === "windows") {
        const appData = Deno.env.get("APPDATA") ?? Deno.env.get("LOCALAPPDATA");
        if (appData) return join(appData, "skill-lab");
        const userProfile = Deno.env.get("USERPROFILE") ?? "~";
        return join(userProfile, "AppData", "Roaming", "skill-lab");
    }

    const home = Deno.env.get("HOME") ?? "~";
    return join(home, ".config", "skill-lab");
}

export const CONFIG_DIR = resolveConfigDir();
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");
export const INSTALLED_PATH = join(CONFIG_DIR, "installed.json");

export type ConfigFile = Record<string, unknown>;

export interface InstalledSkill {
    name: string;
    version: string;
    path: string;
    global: boolean;
    installedAt: string;
}

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Invalid ${label}: expected object`);
    }
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        throw new Error(`Invalid ${label}: expected array of strings`);
    }
}

function validateLanguagePolicies(value: unknown, label: string): void {
    if (value === undefined) return;
    assertObject(value, label);
    for (const [key, entry] of Object.entries(value)) {
        if (!GRAMMAR_KEYS.has(key)) {
            throw new Error(`Invalid ${label}: unknown language key '${key}'`);
        }
        if (entry === undefined) continue;
        assertObject(entry, `${label}.${key}`);
        if ("imports" in entry) {
            assertStringArray(entry.imports, `${label}.${key}.imports`);
        }
    }
}

function validateNetworkPolicy(value: unknown, label: string): void {
    if (value === undefined) return;
    assertObject(value, label);
    if ("domains" in value) {
        assertStringArray(value.domains, `${label}.domains`);
    }
}

type AnalyzerConfigInput = {
    scan?: {
        maxFileSize?: number;
        maxFileCount?: number;
        maxScanDepth?: number;
    };
    allowlist?: {
        languages?: Record<string, { imports?: string[] }>;
        network?: { domains?: string[] };
    };
    denylist?: {
        languages?: Record<string, { imports?: string[] }>;
        network?: { domains?: string[] };
    };
};

export function validateAnalyzerConfig(input: unknown): AnalyzerConfigInput {
    if (input === undefined || input === null) return {};
    assertObject(input, "config");

    if ("scan" in input && input.scan !== undefined) {
        assertObject(input.scan, "config.scan");
        for (const key of ["maxFileSize", "maxFileCount", "maxScanDepth"] as const) {
            const value = input.scan[key];
            if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
                throw new Error(`Invalid config.scan.${key}: expected number`);
            }
        }
    }

    if ("allowlist" in input && input.allowlist !== undefined) {
        assertObject(input.allowlist, "config.allowlist");
        validateLanguagePolicies(input.allowlist.languages, "config.allowlist.languages");
        validateNetworkPolicy(input.allowlist.network, "config.allowlist.network");
    }

    if ("denylist" in input && input.denylist !== undefined) {
        assertObject(input.denylist, "config.denylist");
        validateLanguagePolicies(input.denylist.languages, "config.denylist.languages");
        validateNetworkPolicy(input.denylist.network, "config.denylist.network");
    }

    return input as AnalyzerConfigInput;
}

export async function loadAnalyzerConfig(): Promise<AnalyzerConfigInput> {
    try {
        const text = await Deno.readTextFile(CONFIG_PATH);
        const parsed = JSON.parse(text);
        const validated = validateAnalyzerConfig(parsed);
        return validated;
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return {};
        }
        throw error;
    }
}

// Get current config
export async function getConfig(): Promise<ConfigFile> {
    try {
        const text = await Deno.readTextFile(CONFIG_PATH);
        return JSON.parse(text) as ConfigFile;
    } catch {
        return {};
    }
}

export function getConfigValue(config: ConfigFile, path?: string): unknown {
    if (!path) return config;
    const segments = path.split(".").filter(Boolean);
    let current: unknown = config;
    for (const segment of segments) {
        if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
        const record = current as Record<string, unknown>;
        if (!(segment in record)) return undefined;
        current = record[segment];
    }
    return current;
}

// Set a config value
// Get installed skills
export async function getInstalledSkills(options?: {
    global?: boolean;
    local?: boolean;
}): Promise<InstalledSkill[]> {
    try {
        const text = await Deno.readTextFile(INSTALLED_PATH);
        let skills: InstalledSkill[] = JSON.parse(text);

        if (options?.global) {
            skills = skills.filter((s) => s.global);
        } else if (options?.local) {
            skills = skills.filter((s) => !s.global);
        }

        return skills;
    } catch {
        return [];
    }
}

// Track a new installation
export async function trackInstallation(skill: InstalledSkill): Promise<void> {
    const skills = await getInstalledSkills();
    const existing = skills.findIndex((s) => s.name === skill.name && s.global === skill.global);

    if (existing >= 0) {
        skills[existing] = skill;
    } else {
        skills.push(skill);
    }

    await Deno.mkdir(CONFIG_DIR, { recursive: true });
    await Deno.writeTextFile(INSTALLED_PATH, JSON.stringify(skills, null, 2));
}

// Remove an installation from tracking
export async function removeInstallation(name: string): Promise<void> {
    const skills = await getInstalledSkills();
    const filtered = skills.filter((s) => s.name !== name);
    await Deno.mkdir(CONFIG_DIR, { recursive: true });
    await Deno.writeTextFile(INSTALLED_PATH, JSON.stringify(filtered, null, 2));
}
