import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";
import { isSafeRelativeRedirectPath } from "@reactive-resume/utils/url";

const searchSchema = z.object({ callbackURL: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/auth/")({
	validateSearch: searchSchema,
	beforeLoad: ({ context, search }) => {
		const callbackURL = isSafeRelativeRedirectPath(search.callbackURL) ? search.callbackURL : undefined;

		if (context.session) {
			// Same OAuth bridge handoff as apps/web/src/routes/auth/login.tsx.
			if (callbackURL) throw redirect({ href: callbackURL, replace: true, reloadDocument: true });
			throw redirect({ to: "/dashboard", replace: true });
		}

		// Forward callbackURL along so the login route can still resume the OAuth bridge flow.
		throw redirect({ to: "/auth/login", replace: true, search: { callbackURL } });
	},
});
