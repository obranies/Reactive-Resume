import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";

/**
 * Guards the layout wiring that keeps a role's period pinned to the right edge when the position
 * title is long enough to wrap.
 *
 * Assertions read the effective style off the rendered host nodes, i.e. the last-wins merge of
 * every style layer react-pdf will see, rather than comparing against the style constants, which
 * would only restate the implementation.
 *
 * Note the ceiling on what this can prove. Geometry is unreachable: container.document exposes
 * empty boxes even after a forced render, because react-pdf lays out on an internal tree. So these
 * assertions establish that a rule reaches the renderer, never that it has an effect, and a
 * mutation probe inherits that ceiling — removing a rule turns a test red because the assertion
 * stops matching, which an inert rule satisfies just as well as a working one.
 *
 * That is not hypothetical. Two rules in earlier versions of this fix passed exactly such a probe
 * while doing nothing: flexShrink: 0 on the period, undone by safeTextStyle, and flexWrap: "nowrap"
 * on the row, redundant once the title has flex: 1. Both were caught only by rendering PDFs and
 * looking at them. So the evidence that flex: 1 is what pins the date is the render comparison, not
 * anything below: with nowrap but without flex: 1 the date is drawn on top of the title, and with
 * neither it drops to its own line, left-aligned.
 */

const LONG_POSITION = "Senior Principal Staff Software Engineer, Platform Infrastructure and Developer Experience";
const PERIOD = "2020 - 2024";

type HostNode = {
	type: string;
	value?: string;
	style?: Record<string, unknown> | Record<string, unknown>[];
	props?: { wrap?: boolean };
	children?: HostNode[];
};

const nodeText = (node: HostNode): string =>
	node.value ?? (node.children ?? []).map((child) => nodeText(child)).join("");

/** react-pdf resolves a style array last-wins, so this is what the renderer effectively sees. */
const effectiveStyle = (node: HostNode): Record<string, unknown> =>
	Object.assign({}, ...(Array.isArray(node.style) ? node.style : node.style ? [node.style] : []));

const find = (node: HostNode, match: (node: HostNode) => boolean): HostNode | undefined => {
	if (match(node)) return node;

	for (const child of node.children ?? []) {
		const found = find(child, match);
		if (found) return found;
	}
};

const require_ = (node: HostNode | undefined, what: string): HostNode => {
	if (!node) throw new Error(`no host node for ${what}`);

	return node;
};

const buildData = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.sections.experience.items = [
		{
			id: "item-1",
			hidden: false,
			keepTogether: false,
			company: "Acme Corp",
			position: "Staff Engineer",
			location: "Berlin",
			period: "2018 - 2024",
			website: { url: "", label: "", inlineLink: false },
			description: "",
			roles: [
				{
					id: "role-1",
					position: LONG_POSITION,
					period: PERIOD,
					description: "<p>Led the platform group.</p>",
					keepTogether: false,
				},
			],
		},
	];
	data.metadata.layout.pages = [{ fullWidth: true, main: ["experience"], sidebar: [] }];

	return data;
};

const renderRoleHeader = async () => {
	const element = createElement(ResumeDocument, {
		data: buildData(),
		template: "rhyhorn",
	}) as unknown as Parameters<typeof pdf>[0];
	const instance = pdf(element);
	await expect.poll(() => instance.container.document).not.toBeNull();
	const root = instance.container.document as unknown as HostNode;

	const title = require_(
		find(root, (node) => node.type === "TEXT" && nodeText(node) === LONG_POSITION),
		"the role position",
	);
	const period = require_(
		find(root, (node) => node.type === "TEXT" && nodeText(node) === PERIOD),
		"the role period",
	);
	// The row is the closest node holding both, i.e. the split row the two texts share.
	const row = require_(
		find(root, (node) => (node.children ?? []).includes(title) && (node.children ?? []).includes(period)),
		"the role split row",
	);

	return { row, title, period };
};

describe("role header alignment", () => {
	it("leaves the shared split row untouched", async () => {
		const style = effectiveStyle((await renderRoleHeader()).row);

		expect(style.justifyContent).toBe("space-between");
		// Deliberately still "wrap", the shared token's value. Overriding it to "nowrap" is the
		// obvious-looking fix and the wrong one: it cannot help once the title has flex: 1, and on
		// its own it makes the date overlap the title instead of moving below it.
		expect(style.flexWrap).toBe("wrap");
	});

	it("lets the title absorb the free width and wrap its own text", async () => {
		const { title } = await renderRoleHeader();
		const style = effectiveStyle(title);

		expect(style.flex).toBe(1);
		expect(style.minWidth).toBe(0);
	});

	it("keeps the period right-aligned", async () => {
		const { period } = await renderRoleHeader();

		expect(effectiveStyle(period).textAlign).toBe("right");
	});
});
