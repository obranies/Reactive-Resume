// @vitest-environment happy-dom

import type { ExperienceItem } from "@reactive-resume/schema/resume/data";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Dialog } from "@reactive-resume/ui/components/dialog";
import { useDialogStore } from "@/dialogs/store";

const updateResumeData = vi.hoisted(() => vi.fn((mutate: (draft: unknown) => void) => mutate({})));
const createSectionItem = vi.hoisted(() => vi.fn());
const updateSectionItem = vi.hoisted(() => vi.fn());

vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentResume: () => ({ data: {} }),
	useUpdateResumeData: () => updateResumeData,
}));

vi.mock("@/libs/resume/section-actions", () => ({ createSectionItem, updateSectionItem }));

// useFormBlocker needs a ConfirmDialogProvider; the unsaved-changes guard is not under test here.
vi.mock("@/hooks/use-form-blocker", () => ({ useFormBlocker: () => ({ requestClose: vi.fn() }) }));

// RichInput pulls in the full TipTap editor, which is far more than this test needs.
vi.mock("@/components/input/rich-input", () => ({
	RichInput: ({ value }: { value: string }) => <div data-slot="rich-input">{value}</div>,
}));

const { CreateExperienceDialog, UpdateExperienceDialog } = await import("./experience");
const { CreateEducationDialog } = await import("./education");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

afterEach(() => {
	updateResumeData.mockClear();
	createSectionItem.mockReset();
	updateSectionItem.mockReset();
	useDialogStore.setState({ open: false, activeDialog: null, onBeforeClose: null });
});

const renderDialog = (ui: React.ReactNode) =>
	render(
		<I18nProvider i18n={i18n}>
			<Dialog open>{ui}</Dialog>
		</I18nProvider>,
	);

const submit = () => fireEvent.click(screen.getByRole("button", { name: /create|save changes/i }));

const experienceItem = (over: Partial<ExperienceItem> = {}): ExperienceItem => ({
	id: "exp-1",
	hidden: false,
	keepTogether: false,
	company: "Amazon",
	position: "Engineer",
	location: "Berlin",
	period: "2020 - 2024",
	website: { url: "", label: "", inlineLink: false },
	description: "",
	roles: [],
	...over,
});

describe("KeepTogetherField wiring", () => {
	it("an experience item without roles writes keepTogether: true on submit", async () => {
		renderDialog(<CreateExperienceDialog data={undefined as never} />);

		const toggle = screen.getByRole("switch", { name: "Keep this entry together on one page" });
		expect(toggle).not.toHaveAttribute("aria-disabled", "true");

		// company is the only required field on the schema
		fireEvent.change(screen.getByLabelText("Company"), { target: { value: "Amazon" } });
		fireEvent.click(toggle);
		submit();

		await waitFor(() => expect(createSectionItem).toHaveBeenCalled());
		expect(createSectionItem.mock.calls[0]?.[2]).toMatchObject({ keepTogether: true });
	});

	it("warns that the flag only works for entries that fit on a page", () => {
		renderDialog(<CreateExperienceDialog data={undefined as never} />);
		expect(screen.getByText(/squashed into overlapping lines instead of breaking/)).toBeInTheDocument();
	});

	it("disables the entry-level switch once the item has roles, and explains why", () => {
		const item = experienceItem({
			roles: [{ id: "r1", position: "SDE I", period: "2020", description: "", keepTogether: false }],
		});
		renderDialog(<UpdateExperienceDialog data={{ item } as never} />);

		// base-ui renders a <span role="switch">, not a native control, so assert the ARIA state
		// and that clicking really is inert rather than trusting toBeDisabled().
		const toggle = screen.getByRole("switch", { name: "Keep this entry together on one page" });
		expect(toggle).toHaveAttribute("aria-disabled", "true");

		fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-checked", "false");
		expect(screen.getByText(/Use the switch on each role instead/)).toBeInTheDocument();
	});

	it("a role switch writes roles[i].keepTogether without touching its siblings", async () => {
		const item = experienceItem({
			roles: [
				{ id: "r1", position: "SDE I", period: "2020", description: "", keepTogether: false },
				{ id: "r2", position: "SDE II", period: "2022", description: "", keepTogether: false },
			],
		});
		renderDialog(<UpdateExperienceDialog data={{ item } as never} />);

		const roleToggles = screen.getAllByRole("switch", { name: "Keep this role together on one page" });
		expect(roleToggles).toHaveLength(2);

		fireEvent.click(roleToggles[1] as HTMLElement);
		submit();

		await waitFor(() => expect(updateSectionItem).toHaveBeenCalled());
		expect(updateSectionItem.mock.calls[0]?.[2]).toMatchObject({
			keepTogether: false,
			roles: [
				{ id: "r1", keepTogether: false },
				{ id: "r2", keepTogether: true },
			],
		});
	});

	it("is wired in the other section dialogs too (education)", async () => {
		renderDialog(<CreateEducationDialog data={undefined as never} />);

		fireEvent.click(screen.getByRole("switch", { name: "Keep this entry together on one page" }));
		fireEvent.change(screen.getByLabelText("School"), { target: { value: "TU Berlin" } });
		submit();

		await waitFor(() => expect(createSectionItem).toHaveBeenCalled());
		expect(createSectionItem.mock.calls[0]?.[2]).toMatchObject({ keepTogether: true });
	});
});
