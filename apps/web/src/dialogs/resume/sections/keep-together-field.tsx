import { Trans } from "@lingui/react/macro";
import { FormControl, FormDescription, FormItem, FormLabel } from "@reactive-resume/ui/components/form";
import { Switch } from "@reactive-resume/ui/components/switch";

type KeepTogetherFieldProps = {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	/** "item" labels a whole section entry, "role" a single role-progression entry. */
	variant: "item" | "role";
	/**
	 * Set on an experience item that has roles. The PDF renderer deliberately ignores the item
	 * flag in that case and honours the per-role switches instead, so the control would otherwise
	 * look live while doing nothing.
	 */
	supersededByRoles?: boolean;
};

/**
 * Shared switch for the per-item / per-role `keepTogether` flag.
 *
 * Lives next to the section dialogs rather than in `packages/ui` because the copy is specific to
 * this workflow: it has to warn about the react-pdf ceiling, where an entry taller than a page is
 * not broken and not truncated but squashed into overlapping lines.
 */
export function KeepTogetherField({
	checked,
	onCheckedChange,
	variant,
	supersededByRoles = false,
}: KeepTogetherFieldProps) {
	return (
		<FormItem className="sm:col-span-full">
			<div className="flex items-center gap-x-2">
				<FormControl
					render={<Switch checked={checked} disabled={supersededByRoles} onCheckedChange={onCheckedChange} />}
				/>
				<FormLabel className="mb-0!">
					{variant === "role" ? (
						<Trans comment="Switch that prevents a single role-progression entry from splitting across pages">
							Keep this role together on one page
						</Trans>
					) : (
						<Trans comment="Switch that prevents a single section entry from splitting across pages">
							Keep this entry together on one page
						</Trans>
					)}
				</FormLabel>
			</div>

			<FormDescription>
				{supersededByRoles ? (
					<Trans comment="Explains why the entry-level keep-together switch is disabled once roles exist">
						Not used while this entry has roles — a company block that long would be squashed rather than broken. Use
						the switch on each role instead.
					</Trans>
				) : variant === "role" ? (
					<Trans comment="Warns about the react-pdf limitation of the role-level keep-together switch">
						Only works if the role fits on a single page. A longer one is squashed into overlapping lines instead of
						breaking.
					</Trans>
				) : (
					<Trans comment="Warns about the react-pdf limitation of the entry-level keep-together switch">
						Only works if the entry fits on a single page. A longer one is squashed into overlapping lines instead of
						breaking.
					</Trans>
				)}
			</FormDescription>
		</FormItem>
	);
}
