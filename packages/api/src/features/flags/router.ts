import z from "zod";
import { env } from "@reactive-resume/env/server";
import { publicProcedure } from "../../context";

export type FeatureFlags = {
	disableSignups: boolean;
	disableEmailAuth: boolean;
	showSponsors: boolean;
	smtpEnabled: boolean;
	buildSha: string;
	buildTime: string;
};

// Mirrors isSmtpEnabled() in packages/email/src/transport.ts (kept local to avoid an api -> email dependency).
const isSmtpEnabled = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM);

export const flagsRouter = {
	get: publicProcedure
		.route({
			method: "GET",
			path: "/flags",
			tags: ["Feature Flags"],
			operationId: "getFeatureFlags",
			summary: "Get feature flags",
			description:
				"Returns the current feature flags for this Reactive Resume instance. Feature flags control instance-wide settings such as whether new user signups or email-based authentication are disabled. No authentication required.",
			successDescription: "The current feature flags for this instance.",
		})
		.output(
			z.object({
				disableSignups: z.boolean().describe("Whether new user signups are disabled on this instance."),
				disableEmailAuth: z.boolean().describe("Whether email-based authentication is disabled on this instance."),
				showSponsors: z.boolean().describe("Whether sponsor placements are shown on this instance."),
				smtpEnabled: z.boolean().describe("Whether outbound email (SMTP) is configured on this instance."),
				buildSha: z.string().describe("The short git commit SHA this instance was built from."),
				buildTime: z.string().describe("The ISO 8601 timestamp this instance was built at."),
			}),
		)
		.handler(
			(): FeatureFlags => ({
				disableSignups: env.FLAG_DISABLE_SIGNUPS,
				disableEmailAuth: env.FLAG_DISABLE_EMAIL_AUTH,
				showSponsors: env.FLAG_SHOW_SPONSORS,
				smtpEnabled: isSmtpEnabled(),
				buildSha: env.APP_BUILD_SHA,
				buildTime: env.APP_BUILD_TIME,
			}),
		),
};
