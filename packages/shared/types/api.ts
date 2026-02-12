/**
 * API response types for the goskilla registry.
 */

import type { Skill, SkillVersion } from "./skill.ts";
import type { Analysis } from "./analysis.ts";

/**
 * Pagination metadata.
 */
export interface Pagination {
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    totalPages: number;
}

/**
 * Response for skill list endpoint.
 */
export interface SkillListResponse {
    /** List of skills */
    skills: Skill[];
    /** Pagination info */
    pagination: Pagination;
    /** Search query (if applicable) */
    query?: string;
}

/**
 * Response for skill detail endpoint.
 */
export interface SkillDetailResponse {
    /** Skill data */
    skill: Skill;
    /** All versions */
    versions: SkillVersion[];
    /** Latest analysis */
    latestAnalysis?: Analysis;
}

/**
 * Generic error response.
 */
export interface ErrorResponse {
    /** Error code */
    error: string;
    /** Human-readable message */
    message: string;
    /** Additional details */
    details?: Record<string, unknown>;
}

/**
 * Health check response.
 */
export interface HealthResponse {
    /** Status ("ok" or "error") */
    status: "ok" | "error";
    /** Timestamp */
    timestamp: string;
    /** Service version */
    version?: string;
}

/**
 * API info response (root endpoint).
 */
export interface ApiInfoResponse {
    /** API name */
    name: string;
    /** API version */
    version: string;
    /** Description */
    description: string;
}
