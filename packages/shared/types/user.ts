/**
 * User-related types for the goskilla registry.
 * Users are managed by Supabase Auth, with extended profile data.
 */

/**
 * User profile (extends Supabase Auth user).
 */
export interface Profile {
    /** User ID (UUID, matches auth.users.id) */
    id: string;
    /** GitHub username */
    githubUsername: string;
    /** Display name */
    displayName?: string;
    /** Avatar URL */
    avatarUrl?: string;
    /** Profile creation timestamp */
    createdAt: string;
    /** Last update timestamp */
    updatedAt: string;
}

/**
 * Supabase Auth user (from auth.users table).
 * This is what Supabase Auth returns.
 */
export interface AuthUser {
    /** User ID (UUID) */
    id: string;
    /** Email address */
    email?: string;
    /** User metadata from OAuth provider */
    userMetadata?: {
        /** GitHub username */
        user_name?: string;
        /** Full name */
        full_name?: string;
        /** Avatar URL */
        avatar_url?: string;
    };
    /** App metadata */
    appMetadata?: {
        provider?: string;
    };
    /** Created at */
    createdAt?: string;
}

/**
 * Authentication session from Supabase.
 */
export interface AuthSession {
    /** Access token (JWT) */
    accessToken: string;
    /** Refresh token */
    refreshToken: string;
    /** Token expiration timestamp */
    expiresAt: number;
    /** Token type */
    tokenType: "bearer";
    /** Authenticated user */
    user: AuthUser;
}

/**
 * Authentication response for API.
 */
export interface AuthResponse {
    /** Session data */
    session: AuthSession;
    /** User profile */
    profile: Profile;
}
