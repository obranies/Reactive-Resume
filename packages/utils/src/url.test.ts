import { describe, expect, it } from "vitest";
import { createUrl, isSafeRelativeRedirectPath } from "./url";

describe("createUrl", () => {
	it("returns empty url and label when no url provided", () => {
		expect(createUrl()).toEqual({ url: "", label: "" });
	});

	it("returns empty pair when url is empty string (falsy)", () => {
		expect(createUrl("")).toEqual({ url: "", label: "" });
	});

	it("uses url as label when no label provided", () => {
		expect(createUrl("https://example.com")).toEqual({
			url: "https://example.com",
			label: "https://example.com",
		});
	});

	it("preserves provided label", () => {
		expect(createUrl("https://example.com", "Example")).toEqual({
			url: "https://example.com",
			label: "Example",
		});
	});

	it("falls back to url when label is empty string", () => {
		expect(createUrl("https://example.com", "")).toEqual({
			url: "https://example.com",
			label: "https://example.com",
		});
	});

	it("does not validate the url format (caller's responsibility)", () => {
		expect(createUrl("not-a-url", "Label")).toEqual({
			url: "not-a-url",
			label: "Label",
		});
	});
});

describe("isSafeRelativeRedirectPath", () => {
	it("accepts a single-leading-slash relative path", () => {
		expect(isSafeRelativeRedirectPath("/dashboard")).toBe(true);
		expect(isSafeRelativeRedirectPath("/api/auth/oauth?client_id=abc")).toBe(true);
	});

	it("rejects non-string values", () => {
		expect(isSafeRelativeRedirectPath(undefined)).toBe(false);
		expect(isSafeRelativeRedirectPath(null)).toBe(false);
		expect(isSafeRelativeRedirectPath(42)).toBe(false);
	});

	it("rejects an empty string", () => {
		expect(isSafeRelativeRedirectPath("")).toBe(false);
	});

	it("rejects a path with no leading slash", () => {
		expect(isSafeRelativeRedirectPath("dashboard")).toBe(false);
	});

	it("rejects a protocol-relative path", () => {
		expect(isSafeRelativeRedirectPath("//evil.com")).toBe(false);
	});

	it("rejects a backslash variant of a protocol-relative path", () => {
		expect(isSafeRelativeRedirectPath("/\\evil.com")).toBe(false);
	});

	it("rejects a protocol-relative path with a spliced tab/newline", () => {
		expect(isSafeRelativeRedirectPath("/\t/evil.com")).toBe(false);
		expect(isSafeRelativeRedirectPath("/\n/evil.com")).toBe(false);
	});

	it("rejects an absolute url with a scheme", () => {
		expect(isSafeRelativeRedirectPath("http://evil.com")).toBe(false);
		expect(isSafeRelativeRedirectPath("https://evil.com")).toBe(false);
	});
});
