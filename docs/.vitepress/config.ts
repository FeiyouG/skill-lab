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
                        { text: "Architecture", link: "/guide/architecture" },
                    ],
                },
                {
                    text: "CLI",
                    items: [
                        { text: "Overview", link: "/cli/overview" },
                        { text: "Installation", link: "/cli/installation" },
                        {
                            text: "Commands",
                            collapsed: true,
                            items: [
                                { text: "search", link: "/cli/commands/search" },
                                { text: "info", link: "/cli/commands/info" },
                                { text: "install", link: "/cli/commands/install" },
                                { text: "list", link: "/cli/commands/list" },
                                { text: "update", link: "/cli/commands/update" },
                                { text: "uninstall", link: "/cli/commands/uninstall" },
                                { text: "config", link: "/cli/commands/config" },
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
                        {
                            text: "SkillReader",
                            items: [
                                { text: "Overview", link: "/skillreader/overview" },
                                { text: "Quickstart", link: "/skillreader/quickstart" },
                                { text: "API Reference", link: "/skillreader/api-reference" },
                            ],
                        },
                    ],
                },
                // {
                //     text: "Examples",
                //     collapsed: true,
                //     items: [{ text: "Coming Soon", link: "/examples/coming-soon" }],
                // },
            ],
        },
        socialLinks: [{ icon: "github", link: "https://github.com/FeiyouG/skill-lab" }],
        search: {
            provider: "local",
        },
    },
});
