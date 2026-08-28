import { createFileRoute, redirect } from "@tanstack/react-router";
import z from "zod";
import { isSafeRelativeRedirectPath } from "@reactive-resume/utils/url";
import { VerifyTwoFactorPage } from "@/features/auth/pages/verify-2fa";

const searchSchema = z.object({ callbackURL: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/auth/verify-2fa")({
	component: VerifyTwoFactorPage,
	validateSearch: searchSchema,
	beforeLoad: ({ context, search }) => {
		if (!context.session) return;
		// Same OAuth bridge handoff as apps/web/src/routes/auth/login.tsx.
		if (isSafeRelativeRedirectPath(search.callbackURL)) {
			throw redirect({ href: search.callbackURL, replace: true, reloadDocument: true });
		}
		throw redirect({ to: "/dashboard", replace: true });
	},
});
