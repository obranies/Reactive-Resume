/**
 * Creates a URL object with a url and label.
 * Returns empty strings if no URL is provided.
 */
export function createUrl(url?: string, label?: string): { url: string; label: string } {
	if (!url) return { url: "", label: "" };
	return { url, label: label || url };
}

/**
 * Checks whether a redirect target is a same-app relative path, safe to hand to a client-side
 * router without risking an open redirect. Rejects protocol-relative paths (`//evil.com`) and the
 * backslash variant some browsers normalize to the same thing (`/\evil.com`), including with a
 * tab/newline spliced between the slashes to defeat a naive `//` check.
 */
export function isSafeRelativeRedirectPath(path: unknown): path is string {
	if (typeof path !== "string" || path.length === 0) return false;
	const normalized = path.replaceAll(/[\t\n\r]/g, "");
	if (!normalized.startsWith("/")) return false;
	return normalized[1] !== "/" && normalized[1] !== "\\";
}
