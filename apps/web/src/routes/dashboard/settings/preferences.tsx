import { t } from "@lingui/core/macro";
import { GearSixIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { Separator } from "@reactive-resume/ui/components/separator";
import { PreferencesSettingsPage } from "@/features/settings/pages/preferences";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/settings/preferences")({
	component: RouteComponent,
});

function RouteComponent() {
	const { flags } = Route.useRouteContext();

	return (
		<div className="space-y-4">
			<DashboardHeader icon={GearSixIcon} title={t`Preferences`} />

			<Separator />

			<PreferencesSettingsPage buildSha={flags.buildSha} buildTime={flags.buildTime} />
		</div>
	);
}
