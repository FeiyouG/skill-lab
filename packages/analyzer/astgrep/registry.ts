import * as bashRegistration from "@ast-grep/lang-bash";
import * as javascriptRegistration from "@ast-grep/lang-javascript";
import * as markdownRegistration from "@ast-grep/lang-markdown";
import * as pythonRegistration from "@ast-grep/lang-python";
import * as typescriptRegistration from "@ast-grep/lang-typescript";
import { join } from "jsr:@std/path@^1.1.4";

export type AstGrepGrammar = "javascript" | "typescript" | "python" | "bash" | "markdown";

export type DynamicLangRegistration = {
    libraryPath: string;
    extensions: string[];
    languageSymbol?: string;
    metaVarChar?: string;
    expandoChar?: string;
};

type AstGrepLanguageSpec = {
    parserFileName: string;
    parserTarballUrl: string;
    developmentRegistration: DynamicLangRegistration;
};

export const AST_GREP_LANGUAGE_SPECS: Record<AstGrepGrammar, AstGrepLanguageSpec> = {
    bash: {
        parserFileName: "bash-parser.so",
        parserTarballUrl: "https://registry.npmjs.org/@ast-grep/lang-bash/-/lang-bash-0.0.7.tgz",
        developmentRegistration: bashRegistration.default as unknown as DynamicLangRegistration,
    },
    javascript: {
        parserFileName: "javascript-parser.so",
        parserTarballUrl:
            "https://registry.npmjs.org/@ast-grep/lang-javascript/-/lang-javascript-0.0.6.tgz",
        developmentRegistration: javascriptRegistration
            .default as unknown as DynamicLangRegistration,
    },
    markdown: {
        parserFileName: "markdown-parser.so",
        parserTarballUrl:
            "https://registry.npmjs.org/@ast-grep/lang-markdown/-/lang-markdown-0.0.5.tgz",
        developmentRegistration: markdownRegistration.default as unknown as DynamicLangRegistration,
    },
    python: {
        parserFileName: "python-parser.so",
        parserTarballUrl:
            "https://registry.npmjs.org/@ast-grep/lang-python/-/lang-python-0.0.5.tgz",
        developmentRegistration: pythonRegistration.default as unknown as DynamicLangRegistration,
    },
    typescript: {
        parserFileName: "typescript-parser.so",
        parserTarballUrl:
            "https://registry.npmjs.org/@ast-grep/lang-typescript/-/lang-typescript-0.0.6.tgz",
        developmentRegistration: typescriptRegistration
            .default as unknown as DynamicLangRegistration,
    },
};

export function buildDevRegistrations(): Record<AstGrepGrammar, DynamicLangRegistration> {
    const registrations = {} as Record<AstGrepGrammar, DynamicLangRegistration>;
    for (const grammar of Object.keys(AST_GREP_LANGUAGE_SPECS) as AstGrepGrammar[]) {
        registrations[grammar] = AST_GREP_LANGUAGE_SPECS[grammar].developmentRegistration;
    }
    return registrations;
}

export function buildBundledRegistrations(
    resourceDir: string,
): Record<AstGrepGrammar, DynamicLangRegistration> {
    const registrations = {} as Record<AstGrepGrammar, DynamicLangRegistration>;

    for (const grammar of Object.keys(AST_GREP_LANGUAGE_SPECS) as AstGrepGrammar[]) {
        const spec = AST_GREP_LANGUAGE_SPECS[grammar];
        const devRegistration = spec.developmentRegistration;
        const libraryPath = join(resourceDir, spec.parserFileName);

        if (!fileExists(libraryPath)) {
            throw new Error(
                `Missing ast-grep parser for ${grammar}: ${libraryPath}. Reinstall the CLI release artifact for your platform.`,
            );
        }

        registrations[grammar] = {
            libraryPath,
            extensions: [...devRegistration.extensions],
            languageSymbol: devRegistration.languageSymbol,
            expandoChar: devRegistration.expandoChar,
            metaVarChar: devRegistration.metaVarChar,
        };
    }

    return registrations;
}

function fileExists(path: string): boolean {
    try {
        const stat = Deno.statSync(path);
        return stat.isFile;
    } catch {
        return false;
    }
}
