import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";
import { isSafeRelativeRedirectPath } from "@reactive-resume/utils/url";
import { LoginPage } from "@/features/auth/pages/login";

const searchSchema = z.object({ callbackURL: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/auth/login")({
	component: RouteComponent,
	validateSearch: searchSchema,
	beforeLoad: ({ context, search }) => {
		if (context.session) {
			// The OAuth bridge (apps/server/src/http/auth.ts) sends already-signed-in users here with
			// `?callbackURL=/api/auth/oauth?...` so the flow can resume. That target isn't a client
			// route, so it needs a real document navigation rather than an SPA `to`.
			if (isSafeRelativeRedirectPath(search.callbackURL)) {
				throw redirect({ href: search.callbackURL, replace: true, reloadDocument: true });
			}
			throw redirect({ to: "/dashboard", replace: true });
		}
		return { session: null };
	},
});

function RouteComponent() {
	const { flags } = Route.useRouteContext();

	return <LoginPage disableEmailAuth={flags.disableEmailAuth} disableSignups={flags.disableSignups} />;
}
