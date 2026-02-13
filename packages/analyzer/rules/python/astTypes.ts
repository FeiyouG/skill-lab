/** ast-grep node types for Python. */
export const PYTHON_NODE = {
    IMPORT_STATEMENT: "import_statement",
    IMPORT_FROM_STATEMENT: "import_from_statement",
    CALL: "call",
    STRING: "string",
    STRING_CONTENT: "string_content",
    DOTTED_NAME: "dotted_name",
} as const;
