// Shared regular expressions used across multiple file-type rule sets.
export const SHARED_PATTERNS = {
    httpUrl: /https?:\/\/[\w.-]+(?::\d+)?(?:\/[^\s)\]"']*)?/gi,
    tokenLike: /(token|api[_-]?key|authorization|bearer|secret)/i,
};
