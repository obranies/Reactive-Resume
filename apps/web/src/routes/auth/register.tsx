import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";
import { isSafeRelativeRedirectPath } from "@reactive-resume/utils/url";
import { RegisterPage } from "@/features/auth/pages/register";

const searchSchema = z.object({ callbackURL: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/auth/register")({
	component: RouteComponent,
	validateSearch: searchSchema,
	beforeLoad: ({ context, search }) => {
		if (context.session) {
			// Same OAuth bridge handoff as apps/web/src/routes/auth/login.tsx.
			if (isSafeRelativeRedirectPath(search.callbackURL)) {
				throw redirect({ href: search.callbackURL, replace: true, reloadDocument: true });
			}
			throw redirect({ to: "/dashboard", replace: true });
		}
		if (context.flags.disableSignups) throw redirect({ to: "/auth/login", replace: true });
		return { session: null };
	},
});

function RouteComponent() {
	const { flags } = Route.useRouteContext();

	return <RegisterPage disableEmailAuth={flags.disableEmailAuth} />;
}
