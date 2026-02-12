const SECRET_KEYWORDS = [
    "token",
    "key",
    "secret",
    "password",
    "pwd",
    "pass",
    "credential",
    "cred",
    "auth",
    "api",
    "apikey",
    "bearer",
    "oauth",
    "jwt",
    "session",
    "private",
];

export function isSecretLikeName(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const normalized = value.toLowerCase();
    return SECRET_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
