export function parseUrlFromUnknown(
    input: string,
): { host: string; protocol: string; raw: string } | null {
    if (!input) return null;
    const cleaned = input.trim().replace(/^['"`]|['"`]$/g, "");
    const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

    try {
        const url = new URL(withProtocol);
        return {
            host: url.hostname,
            protocol: url.protocol.replace(":", ""),
            raw: cleaned,
        };
    } catch {
        return null;
    }
}

export function classifyDestination(host: string): "loopback" | "internal" | "external" {
    if (["localhost", "127.0.0.1", "::1"].includes(host)) return "loopback";
    if (host.endsWith(".local")) return "internal";
    if (/^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) return "internal";
    return "external";
}
