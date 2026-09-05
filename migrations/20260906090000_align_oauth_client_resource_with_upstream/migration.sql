ALTER TABLE "oauth_client" ALTER COLUMN "client_credentials_scopes" SET DEFAULT '{}'::text[];--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_client_resource_client_id_resource_id_index" ON "oauth_client_resource" ("client_id","resource_id");
