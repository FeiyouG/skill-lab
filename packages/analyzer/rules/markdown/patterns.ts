// Markdown/text reference extraction patterns.
export const MARKDOWN_REFERENCE_PATTERNS = {
    markdownLink: /\[[^\]]+\]\(([^)]+)\)/g,
    inlineCode: /`([^`\n]+)`/g,
    relativePath: /(?:\.\.?\/)?[\w./-]+\.[\w-]+/g,
    localPathStart: /^\.?\.?\//,
    urlStart: /^https?:\/\//i,
};

export const KNOWN_REFERENCE_EXTENSIONS = new Set([
    "md",
    "txt",
    "json",
    "yaml",
    "yml",
    "ts",
    "js",
    "py",
    "sh",
    "bash",
    "toml",
    "ini",
    "sql",
    "csv",
    "xml",
]);
