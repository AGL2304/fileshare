-- Migration initiale — FileShare System
-- Préfère utiliser `prisma migrate dev` ou `prisma migrate deploy` en CI/prod.
-- Ce fichier est conservé pour bootstrap docker-entrypoint-initdb.d.

CREATE TYPE "Role" AS ENUM ('GUEST', 'USER', 'PREMIUM', 'ADMIN');
CREATE TYPE "FileStatus" AS ENUM ('PENDING', 'SCANNING', 'READY', 'QUARANTINED', 'DELETED');
CREATE TYPE "SharePermission" AS ENUM ('VIEW', 'DOWNLOAD');

-- Users
CREATE TABLE "users" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"         TEXT UNIQUE NOT NULL,
  "password_hash" TEXT NOT NULL,
  "name"          TEXT,
  "avatar_key"    TEXT,
  "role"          "Role" NOT NULL DEFAULT 'USER',
  "quota_bytes"   BIGINT NOT NULL DEFAULT 5368709120,
  "used_bytes"    BIGINT NOT NULL DEFAULT 0,
  "is_active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens (sha256 hashes — never store raw tokens)
CREATE TABLE "refresh_tokens" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "token"      TEXT UNIQUE NOT NULL,
  "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Folders
CREATE TABLE "folders" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"       TEXT NOT NULL,
  "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "parent_id"  UUID REFERENCES "folders"("id"),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Files
CREATE TABLE "files" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"             TEXT NOT NULL,
  "original_name"    TEXT NOT NULL,
  "mime_type"        TEXT NOT NULL,
  "size_bytes"       BIGINT NOT NULL,
  "storage_key"      TEXT UNIQUE NOT NULL,
  "checksum_sha256"  TEXT,
  "status"           "FileStatus" NOT NULL DEFAULT 'PENDING',
  "is_infected"      BOOLEAN NOT NULL DEFAULT FALSE,
  "thumbnail_key"    TEXT,
  "user_id"          UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "folder_id"        UUID REFERENCES "folders"("id"),
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shares
CREATE TABLE "shares" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "token"           UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  "file_id"         UUID NOT NULL REFERENCES "files"("id") ON DELETE CASCADE,
  "created_by"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "password_hash"   TEXT,
  "permission"      "SharePermission" NOT NULL DEFAULT 'DOWNLOAD',
  "expires_at"      TIMESTAMPTZ,
  "max_downloads"   INTEGER,
  "download_count"  INTEGER NOT NULL DEFAULT 0,
  "is_active"       BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access logs
CREATE TABLE "access_logs" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id"     UUID NOT NULL REFERENCES "files"("id") ON DELETE CASCADE,
  "share_id"    UUID REFERENCES "shares"("id"),
  "ip_address"  TEXT NOT NULL,
  "user_agent"  TEXT,
  "action"      TEXT NOT NULL,
  "accessed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_files_user_status ON "files"("user_id", "status");
CREATE INDEX idx_files_folder_id ON "files"("folder_id");
CREATE INDEX idx_files_created_at ON "files"("created_at" DESC);
CREATE INDEX idx_shares_token ON "shares"("token");
CREATE INDEX idx_shares_created_by ON "shares"("created_by");
CREATE INDEX idx_shares_file_id ON "shares"("file_id");
CREATE INDEX idx_access_logs_file_id ON "access_logs"("file_id");
CREATE INDEX idx_access_logs_accessed_at ON "access_logs"("accessed_at" DESC);
CREATE INDEX idx_refresh_tokens_user_id ON "refresh_tokens"("user_id");
CREATE INDEX idx_refresh_tokens_expires_at ON "refresh_tokens"("expires_at");
CREATE INDEX idx_folders_user_parent ON "folders"("user_id", "parent_id");

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at BEFORE UPDATE ON "files"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON "folders"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- The admin user is now created via `npm run db:seed` to avoid shipping
-- a known bcrypt hash in version control.
