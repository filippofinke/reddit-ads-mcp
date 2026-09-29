import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const port = Number(process.env.REDDIT_ADS_REDIRECT_PORT ?? 8765);

export const config = {
  clientId: required("REDDIT_ADS_CLIENT_ID"),
  clientSecret: required("REDDIT_ADS_CLIENT_SECRET"),
  redirectPort: port,
  redirectUri: process.env.REDDIT_ADS_REDIRECT_URI ?? `http://localhost:${port}/callback`,
  scopes: (process.env.REDDIT_ADS_SCOPES ?? "adsread adsedit adsconversions adsdatadeletion")
    .split(/[\s,]+/)
    .filter(Boolean),
  tokenPath:
    process.env.REDDIT_ADS_TOKEN_PATH ??
    join(homedir(), ".config", "reddit-ads-mcp", "tokens.json"),
  defaultAccountId: process.env.REDDIT_ADS_ACCOUNT_ID,
  version,
  userAgent: process.env.REDDIT_ADS_USER_AGENT ?? `node:reddit-ads-mcp:${version}`,
  apiBaseUrl: "https://ads-api.reddit.com/api/v3",
  authorizeUrl: "https://www.reddit.com/api/v1/authorize",
  tokenUrl: "https://www.reddit.com/api/v1/access_token",
  revokeUrl: "https://www.reddit.com/api/v1/revoke_token",
};
