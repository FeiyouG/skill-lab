import { join } from "jsr:@std/path@^1.0.0";

// Config file location
export const CONFIG_DIR = join(Deno.env.get("HOME") || "~", ".config", "slab");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");
export const INSTALLED_PATH = join(CONFIG_DIR, "installed.json");

// Default configuration
const DEFAULT_CONFIG: Config = {
    api_url: "https://api.goskilla.com",
    default_install_location: "local",
};

export interface Config {
    api_url: string;
    default_install_location: "local" | "global";
    [key: string]: unknown;
}

export interface InstalledSkill {
    name: string;
    version: string;
    path: string;
    global: boolean;
    installedAt: string;
}

// Get current config
export async function getConfig(): Promise<Config> {
    try {
        const text = await Deno.readTextFile(CONFIG_PATH);
        return { ...DEFAULT_CONFIG, ...JSON.parse(text) };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

// Set a config value
export async function setConfig(key: string, value: string): Promise<void> {
    const config = await getConfig();
    config[key] = value;
    await Deno.mkdir(CONFIG_DIR, { recursive: true });
    await Deno.writeTextFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Reset config to defaults
export async function resetConfig(): Promise<void> {
    await Deno.mkdir(CONFIG_DIR, { recursive: true });
    await Deno.writeTextFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

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
