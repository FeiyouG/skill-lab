import type { Permission, Risk } from "skill-lab/shared";
import { scoreState } from "./steps/003-risks/scoring.ts";
import type { AnalyzerState, ScanConfig } from "./types.ts";

const INDENT = "  ";
const SUB_INDENT = "    ";

// ---------------------------------------------------------------------------
// SARIF types (minimal — only what we emit)
// ---------------------------------------------------------------------------

type SarifArtifactLocation = {
    uri: string;
    uriBaseId?: string;
};

type SarifRegion = {
    startLine: number;
    endLine?: number;
};

type SarifLocation = {
    physicalLocation: {
        artifactLocation: SarifArtifactLocation;
        region: SarifRegion;
    };
};

type SarifResult = {
    ruleId: string;
    level: "error" | "warning" | "note";
    message: { text: string };
    locations: SarifLocation[];
    fingerprints?: Record<string, string>;
};

type SarifRule = {
    id: string;
    shortDescription: { text: string };
    help: { text: string };
    properties?: { tags: string[] };
};

type SarifLog = {
    $schema: string;
    version: "2.1.0";
    runs: Array<{
        tool: {
            driver: {
                name: string;
                version: string;
                informationUri: string;
                rules: SarifRule[];
            };
        };
        results: SarifResult[];
        artifacts: Array<{ location: SarifArtifactLocation }>;
    }>;
};

// ---------------------------------------------------------------------------
// SkillAnalyzerResult class
// ---------------------------------------------------------------------------

export class SkillAnalyzerResult {
    readonly analyzedAt: string;

    private _score: number | undefined;
    private _riskLevel: "safe" | "caution" | "attention" | "risky" | "avoid" | undefined;
    private _summary: string | undefined;

    constructor(private readonly state: AnalyzerState) {
        this.analyzedAt = new Date().toISOString();
    }

    get skillId(): string {
        return this.state.skillId;
    }

    get skillVersionId(): string {
        return this.state.skillVersionId;
    }

    get permissions(): Permission[] {
        return this.state.permissions;
    }

    get risks(): Risk[] {
        return this.state.risks;
    }

    get warnings(): string[] {
        return this.state.warnings;
    }

    get metadata(): {
        scannedFiles: string[];
        skippedFiles: Array<{ path: string; reason: string }>;
        rulesUsed: string[];
        frontmatterRangeEnd?: number;
        config: ScanConfig;
    } {
        return this.state.metadata;
    }

    get score(): number {
        return this._ensureScored().score;
    }

    get riskLevel(): "safe" | "caution" | "attention" | "risky" | "avoid" {
        return this._ensureScored().riskLevel;
    }

    get summary(): string {
        return this._ensureScored().summary;
    }

    private _ensureScored() {
        if (this._score === undefined) {
            const scored = scoreState(this.state);
            this._score = scored.score;
            this._riskLevel = scored.riskLevel;
            this._summary = scored.summary;
        }
        return {
            score: this._score!,
            riskLevel: this._riskLevel!,
            summary: this._summary!,
        };
    }

    // -----------------------------------------------------------------------
    // toString() — human-readable terminal output
    // -----------------------------------------------------------------------

    toString(): string {
        const lines: string[] = [];
        const hr = "=".repeat(60);

        lines.push(hr);
        lines.push("Analysis Results");
        lines.push(hr);
        lines.push(`${INDENT}Skill: ${this.skillId}@${this.skillVersionId}`);

        lines.push("");
        lines.push(`${INDENT}Permissions (${this.permissions.length})`);
        if (this.permissions.length === 0) {
            lines.push(`${SUB_INDENT}- none`);
        } else {
            for (const p of this.permissions) {
                lines.push(`${SUB_INDENT}- ${p.tool}.${p.permission} [${p.scope}]`);
                if (p.args && p.args.length > 0) {
                    lines.push(`${SUB_INDENT}${INDENT}args: ${p.args.join(", ")}`);
                }
                lines.push(`${SUB_INDENT}${INDENT}source: ${p.source}`);
                if (p.references.length > 0) {
                    lines.push(
                        `${SUB_INDENT}${INDENT}ref: ${_formatRef(p.references[0])}`,
                    );
                }
            }
        }

        lines.push("");
        lines.push(`${INDENT}Risks (${this.risks.length})`);
        if (this.risks.length === 0) {
            lines.push(`${SUB_INDENT}- none`);
        } else {
            for (const r of this.risks) {
                lines.push(`${SUB_INDENT}- ${r.severity} ${r.type}`);
                lines.push(`${SUB_INDENT}${INDENT}message: ${r.message}`);
                lines.push(`${SUB_INDENT}${INDENT}ref: ${_formatRef(r.reference)}`);
                if (r.permissions.length > 0) {
                    lines.push(
                        `${SUB_INDENT}${INDENT}permissions: ${r.permissions.join(", ")}`,
                    );
                }
            }
        }

        lines.push("");
        lines.push(`${INDENT}Warnings (${this.warnings.length})`);
        if (this.warnings.length === 0) {
            lines.push(`${SUB_INDENT}- none`);
        } else {
            for (const w of this.warnings) {
                lines.push(`${SUB_INDENT}- ${w}`);
            }
        }

        lines.push("");
        lines.push(`${INDENT}Risk Level: ${this.riskLevel}`);
        lines.push(`${INDENT}Score: ${this.score}`);
        lines.push(`${INDENT}Summary: ${this.summary}`);

        return lines.join("\n");
    }

    // -----------------------------------------------------------------------
    // toJson() — plain JSON matching legacy AnalyzerResult shape
    // -----------------------------------------------------------------------

    toJson(): string {
        return JSON.stringify(
            {
                analyzedAt: this.analyzedAt,
                skillId: this.skillId,
                skillVersionId: this.skillVersionId,
                permissions: this.permissions,
                risks: this.risks,
                score: this.score,
                riskLevel: this.riskLevel,
                summary: this.summary,
                warnings: this.warnings,
                metadata: this.metadata,
            },
            null,
            2,
        );
    }

    // -----------------------------------------------------------------------
    // toSarif() — SARIF 2.1.0 for GitHub Code Scanning
    // -----------------------------------------------------------------------

    async toSarif(toolVersion: string): Promise<string> {
        // --- rules ---
        const rules: SarifRule[] = [];
        const seenRiskTypes = new Set<string>();

        for (const r of this.risks) {
            if (!seenRiskTypes.has(r.type)) {
                seenRiskTypes.add(r.type);
                rules.push({
                    id: r.type,
                    shortDescription: { text: r.type },
                    help: { text: r.message },
                    properties: { tags: ["security"] },
                });
            }
        }

        if (this.warnings.length > 0) {
            rules.push({
                id: "slab/warning",
                shortDescription: { text: "Analysis warning" },
                help: { text: "Warnings produced during skill analysis." },
                properties: { tags: ["maintainability"] },
            });
        }

        for (const p of this.permissions) {
            rules.push({
                id: p.id,
                shortDescription: { text: `${p.tool}.${p.permission} [${p.scope}]` },
                help: {
                    text: p.comment ??
                        `Permission detected: ${p.tool} ${p.permission} (${p.scope})`,
                },
                properties: { tags: ["permissions"] },
            });
        }

        // --- results ---
        const results: SarifResult[] = [];

        for (const r of this.risks) {
            const fp = await _fingerprint(`${r.type}:${r.reference.file}:${r.reference.line}`);
            results.push({
                ruleId: r.type,
                level: _sarifLevel(r.severity),
                message: { text: r.message },
                locations: [
                    _sarifLocation(r.reference.file, r.reference.line, r.reference.lineEnd),
                ],
                fingerprints: { "slab/v1": fp },
            });
        }

        for (const w of this.warnings) {
            results.push({
                ruleId: "slab/warning",
                level: "note",
                message: { text: w },
                locations: [_sarifLocation("SKILL.md", 1)],
            });
        }

        // --- artifacts ---
        const artifacts = this.metadata.scannedFiles.map((f) => ({
            location: { uri: f, uriBaseId: "%SRCROOT%" },
        }));

        const log: SarifLog = {
            $schema: "https://json.schemastore.org/sarif-2.1.0.json",
            version: "2.1.0",
            runs: [
                {
                    tool: {
                        driver: {
                            name: "slab",
                            version: toolVersion,
                            informationUri: "https://github.com/FeiyouG/skill-lab",
                            rules,
                        },
                    },
                    results,
                    artifacts,
                },
            ],
        };

        return JSON.stringify(log, null, 2);
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _formatRef(ref: { file: string; line: number; lineEnd?: number; type: string }): string {
    if (ref.lineEnd !== undefined && ref.lineEnd !== ref.line) {
        return `${ref.file}:${ref.line}-${ref.lineEnd} (${ref.type})`;
    }
    return `${ref.file}:${ref.line} (${ref.type})`;
}

function _sarifLevel(severity: string): "error" | "warning" | "note" {
    if (severity === "critical") return "error";
    if (severity === "warning") return "warning";
    return "note";
}

function _sarifLocation(file: string, startLine: number, endLine?: number): SarifLocation {
    const region: SarifRegion = { startLine };
    if (endLine !== undefined && endLine !== startLine) {
        region.endLine = endLine;
    }
    return {
        physicalLocation: {
            artifactLocation: { uri: file, uriBaseId: "%SRCROOT%" },
            region,
        },
    };
}

async function _fingerprint(input: string): Promise<string> {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
