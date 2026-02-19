import { defineConfig } from "vitepress";

export default defineConfig({
    title: "Skill Lab",
    description: "Documentation for the slab CLI, analyzer, and skillreader libraries",
    cleanUrls: true,
    themeConfig: {
        sidebar: {
            "/": [
                {
                    items: [
                        { text: "Getting Started", link: "/guide/getting-started" },
                        { text: "Configurations", link: "/guide/configurations" },
                    ],
                },
                {
                    text: "CLI",
                    items: [
                        { text: "Overview", link: "/cli/overview" },
                        { text: "Installation", link: "/cli/installation" },
                        { text: "config", link: "/cli/config" },
                        {
                            text: "Commands",
                            items: [
                                { text: "analyze", link: "/cli/commands/analyze" },
                            ],
                        },
                    ],
                },
                {
                    text: "API Usage",
                    items: [
                        {
                            text: "Analyzer",
                            items: [
                                { text: "Overview", link: "/analyzer/overview" },
                                { text: "Quickstart", link: "/analyzer/quickstart" },
                                { text: "API Reference", link: "/analyzer/api-reference" },
                                { text: "Risk Levels", link: "/analyzer/risk-levels" },
                                { text: "Rules Overview", link: "/analyzer/rules-overview" },
                            ],
                        },
                    ],
                },
                {
                    text: "Examples",
                    items: [{ text: "Historical Git Ref", link: "/examples/coming-soon" }],
                },
                {
                    text: "Development",
                    collapsed: true,
                    items: [
                        { text: "Architecture", link: "/development/architecture" },
                        { text: "wasm build", link: "/development/wasm-build" },
                    ],
                },
            ],
        },
        socialLinks: [{ icon: "github", link: "https://github.com/FeiyouG/skill-lab" }],
        search: {
            provider: "local",
        },
    },
});
