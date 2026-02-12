import { getConfig } from "../config/config.ts";
import type { Analysis, Skill, SkillListResponse } from "@FeiyouG/skill-lab-shared";

class ApiClient {
    private baseUrl: string | null = null;

    private async getBaseUrl(): Promise<string> {
        if (!this.baseUrl) {
            const config = await getConfig();
            this.baseUrl = config.api_url;
        }
        return this.baseUrl;
    }

    private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
        const baseUrl = await this.getBaseUrl();
        const url = `${baseUrl}${path}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    async searchSkills(
        query: string,
        page = 1,
        limit = 20,
    ): Promise<SkillListResponse> {
        const params = new URLSearchParams({
            q: query,
            page: page.toString(),
            limit: limit.toString(),
        });
        return await this.fetch<SkillListResponse>(`/skills?${params}`);
    }

    async getSkill(idOrName: string, version?: string): Promise<Skill> {
        const versionParam = version ? `?version=${encodeURIComponent(version)}` : "";
        return await this.fetch<Skill>(`/skills/${encodeURIComponent(idOrName)}${versionParam}`);
    }

    async getSkillAnalysis(idOrName: string): Promise<Analysis | null> {
        try {
            return await this.fetch<Analysis>(`/skills/${encodeURIComponent(idOrName)}/analysis`);
        } catch {
            return null;
        }
    }

    async downloadSkill(idOrName: string, version?: string): Promise<string> {
        const skill = await this.getSkill(idOrName, version);
        const downloadUrl = skill.downloadUrl;
        if (!downloadUrl) {
            throw new Error("Skill downloadUrl not available");
        }

        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Failed to download skill: ${response.statusText}`);
        }

        return response.text();
    }
}

export const apiClient = new ApiClient();
