import type { ExperienceItem, ResumeData, RoleItem } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

/**
 * Guards the per-item / per-role keepTogether wiring by rendering a real document and reading the
 * `wrap` prop off the resulting react-pdf host nodes, which is where pagination actually decides.
 *
 * This is deliberately a wiring test: the interesting failure mode is not "the helper computes the
 * wrong boolean" but "the prop stopped being passed down at all". A rebase onto upstream flattened
 * exactly that once already — silently, with a green typecheck.
 *
 * Assertions count wrap={false} ancestors of an anchor text rather than indexing into a fixed tree
 * depth. The semantic-node refactor moved the item body into ExperienceItemContent and added
 * provider levels; a test pinned to a nesting depth is one that breaks on the next refactor without
 * the behaviour having changed.
 */

type HostNode = {
	type: string;
	value?: string;
	props?: { wrap?: boolean };
	children?: HostNode[];
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

/** How many nodes on the path from the document root down to the TEXT node for `text` carry wrap={false}. */
const noBreakAncestors = (root: HostNode, text: string): number => {
	const walk = (node: HostNode, seen: number): number | undefined => {
		const total = seen + (node.props?.wrap === false ? 1 : 0);
		if (node.type === "TEXT" && nodeText(node) === text) return total;

		for (const child of node.children ?? []) {
			const found = walk(child, total);
			if (found !== undefined) return found;
		}
	};

	const found = walk(root, 0);
	if (found === undefined) throw new Error(`no host node renders the text "${text}"`);

	return found;
};

const role = (id: string, position: string, keepTogether: boolean): RoleItem => ({
	id,
	position,
	period: "2020 - 2024",
	description: `<p>${position} description</p>`,
	keepTogether,
});

const experienceItem = (over: Partial<ExperienceItem> = {}): ExperienceItem => ({
	id: "item-1",
	hidden: false,
	keepTogether: false,
	company: "Acme Corp",
	position: "Staff Engineer",
	location: "Berlin",
	period: "2020 - 2024",
	website: { url: "", label: "", inlineLink: false },
	description: "<p>item description</p>",
	roles: [],
	...over,
});

const buildData = (items: ExperienceItem[]): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.sections.experience.items = items;
	// A section-level flag would add its own wrap={false} ancestor and drown out what these
	// assertions count.
	data.sections.experience.keepTogether = false;
	data.sections.experience.startOnNewPage = false;
	data.metadata.layout.pages = [{ fullWidth: true, main: ["experience"], sidebar: [] }];

	return data;
};

/** azurill is the one template with sectionTimeline enabled; rhyhorn exercises the plain branch. */
const renderExperience = async (items: ExperienceItem[], { timeline = false } = {}) => {
	const template: Template = timeline ? "azurill" : "rhyhorn";
	const element = createElement(ResumeDocument, { data: buildData(items), template }) as unknown as Parameters<
		typeof pdf
	>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();

	return instance.container.document as unknown as HostNode;
};

describe("SectionItem keepTogether wiring", () => {
	it("keeps a roleless item together when the flag is on", async () => {
		const root = await renderExperience([experienceItem({ keepTogether: true })]);

		expect(noBreakAncestors(root, "Acme Corp")).toBe(1);
	});

	it("leaves the item breakable when the flag is off", async () => {
		const root = await renderExperience([experienceItem({ keepTogether: false })]);

		expect(noBreakAncestors(root, "Acme Corp")).toBe(0);
	});

	it("also honours the flag in the timeline branch, where the item root is the marker row", async () => {
		const root = await renderExperience([experienceItem({ keepTogether: true })], { timeline: true });

		expect(noBreakAncestors(root, "Acme Corp")).toBe(1);
	});
});

describe("ExperienceSection role progression", () => {
	// An experience item with roles routinely outgrows a page, and an oversized wrap={false} block is
	// squashed into overlapping lines rather than broken, so the item flag must be ignored here.
	it("ignores the item-level flag once the item has roles", async () => {
		const root = await renderExperience([
			experienceItem({
				keepTogether: true,
				roles: [role("r1", "Engineer I", false), role("r2", "Engineer II", false)],
			}),
		]);

		expect(noBreakAncestors(root, "Acme Corp")).toBe(0);
	});

	it("keeps exactly the flagged role together and leaves its siblings alone", async () => {
		const root = await renderExperience([
			experienceItem({
				roles: [role("r1", "Engineer I", false), role("r2", "Engineer II", true), role("r3", "Engineer III", false)],
			}),
		]);

		expect(noBreakAncestors(root, "Engineer II")).toBe(1);
		expect(noBreakAncestors(root, "Engineer I")).toBe(0);
		expect(noBreakAncestors(root, "Engineer III")).toBe(0);
	});

	it("keeps the company block breakable even when a role inside it is flagged", async () => {
		const root = await renderExperience([
			experienceItem({ keepTogether: true, roles: [role("r1", "Engineer I", true)] }),
		]);

		expect(noBreakAncestors(root, "Acme Corp")).toBe(0);
		expect(noBreakAncestors(root, "Engineer I")).toBe(1);
	});
});
