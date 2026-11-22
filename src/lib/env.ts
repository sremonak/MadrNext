import "server-only";

/**
 * Typed environment access. All secrets come from env vars — never hardcoded.
 * Development defaults exist only for local sandbox bootstrapping.
 */
export const env = {
  get authSecret(): string {
    const s = process.env.AUTH_SECRET;
    if (!s || s.length < 32) {
      throw new Error(
        "AUTH_SECRET must be set (32+ chars). Generate with: openssl rand -hex 32",
      );
    }
    return s;
  },
  get mediaTokenTtl(): number {
    return parseInt(process.env.MEDIA_TOKEN_TTL_SECONDS ?? "120", 10);
  },
  get maxConcurrentPlaybacks(): number {
    return parseInt(process.env.MAX_CONCURRENT_PLAYBACKS ?? "2", 10);
  },
  get maxConcurrentSessions(): number {
    return parseInt(process.env.MAX_CONCURRENT_SESSIONS ?? "3", 10);
  },
  get sessionTtlHours(): number {
    return parseInt(process.env.SESSION_TTL_HOURS ?? "72", 10);
  },
  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
  get storageDir(): string {
    return process.env.STORAGE_DIR ?? "./storage";
  },
  get isProd(): boolean {
    return process.env.NODE_ENV === "production";
  },
  smtp: {
    get host(): string | undefined {
      return process.env.SMTP_HOST || undefined;
    },
    get from(): string {
      return process.env.MAIL_FROM ?? "MadrNext <no-reply@localhost>";
    },
  },
};
