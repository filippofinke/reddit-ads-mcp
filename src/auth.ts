import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname } from "node:path";
import open from "open";
import { config } from "./config.js";

interface Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
}

interface PendingLogin {
  url: string;
  done: Promise<void>;
  cancel: (error: Error) => void;
}

const LOGIN_WAIT_MS = 45_000;
const LOGIN_TTL_MS = 600_000;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

const page = (title: string, message: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1>${title}</h1><p>${escapeHtml(message)}</p></div></body></html>`;

export class AuthRequiredError extends Error {}

class TokenError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    body: unknown,
  ) {
    super(`Reddit token request failed (${status}): ${code ?? JSON.stringify(body)}`);
  }
}

class Auth {
  private tokens: Tokens | null | undefined;
  private pending: PendingLogin | null = null;
  private refreshing: Promise<Tokens> | null = null;
  private generation = 0;

  private basic() {
    return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
  }

  private async load(): Promise<Tokens | null> {
    if (this.tokens !== undefined) return this.tokens;
    try {
      this.tokens = JSON.parse(await readFile(config.tokenPath, "utf8")) as Tokens;
    } catch {
      this.tokens = null;
    }
    return this.tokens;
  }

  private async save(tokens: Tokens) {
    this.tokens = tokens;
    await mkdir(dirname(config.tokenPath), { recursive: true });
    await writeFile(config.tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  }

  private async tokenRequest(params: Record<string, string>): Promise<Tokens> {
    const generation = this.generation;
    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        Authorization: this.basic(),
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": config.userAgent,
      },
      body: new URLSearchParams(params),
    });
    const body = (await response.json().catch(() => ({}))) as TokenResponse;
    if (!response.ok || !body.access_token) {
      throw new TokenError(response.status, body.error, body);
    }
    if (generation !== this.generation) throw new AuthRequiredError("Logged out during login");
    const current = await this.load();
    const tokens: Tokens = {
      accessToken: body.access_token,
      refreshToken: body.refresh_token ?? current?.refreshToken,
      expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
      scope: body.scope,
    };
    await this.save(tokens);
    return tokens;
  }

  private refresh(refreshToken: string): Promise<Tokens> {
    this.refreshing ??= this.tokenRequest({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  startLogin(): PendingLogin {
    if (this.pending) return this.pending;

    const state = randomBytes(16).toString("hex");
    const url = `${config.authorizeUrl}?${new URLSearchParams({
      client_id: config.clientId,
      response_type: "code",
      state,
      redirect_uri: config.redirectUri,
      duration: "permanent",
      scope: config.scopes.join(","),
    })}`;
    const callbackPath = new URL(config.redirectUri).pathname;

    let settled = false;
    let finish: (error?: Error) => void = () => {};
    const done = new Promise<void>((resolve, reject) => {
      finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        server.close();
        if (this.pending?.done === done) this.pending = null;
        if (error) reject(error);
        else resolve();
      };
    });
    done.catch(() => {});

    const timer = setTimeout(
      () => finish(new AuthRequiredError("Reddit login timed out")),
      LOGIN_TTL_MS,
    );
    timer.unref();

    const server = createServer(async (req, res) => {
      const params = new URL(req.url ?? "/", config.redirectUri).searchParams;
      if (new URL(req.url ?? "/", config.redirectUri).pathname !== callbackPath) {
        res.writeHead(404).end();
        return;
      }
      const html = (status: number, title: string, message: string) =>
        res
          .writeHead(status, { "Content-Type": "text/html; charset=utf-8" })
          .end(page(title, message));

      if (settled || params.get("state") !== state) {
        html(
          400,
          "Authorization failed",
          "This login link is stale. Start the login again from your MCP client.",
        );
        return;
      }
      const error = params.get("error");
      const code = params.get("code");
      if (error || !code) {
        const reason = error ?? "Missing authorization code";
        html(400, "Authorization failed", reason);
        finish(new AuthRequiredError(`Reddit authorization failed: ${reason}`));
        return;
      }
      try {
        await this.tokenRequest({
          grant_type: "authorization_code",
          code,
          redirect_uri: config.redirectUri,
        });
        html(
          200,
          "Connected to Reddit Ads",
          "You can close this window and return to your MCP client.",
        );
        finish();
      } catch (e) {
        html(500, "Authorization failed", (e as Error).message);
        finish(e as Error);
      }
    });
    server.unref();
    server.on("error", (e: NodeJS.ErrnoException) =>
      finish(
        e.code === "EADDRINUSE"
          ? new AuthRequiredError(
              `Port ${config.redirectPort} is already in use, so the OAuth callback cannot be received. Stop the other process or set REDDIT_ADS_REDIRECT_PORT and REDDIT_ADS_REDIRECT_URI (and update the app's redirect URL).`,
            )
          : e,
      ),
    );
    server.listen(config.redirectPort, () => {
      open(url).catch(() => {});
    });

    this.pending = { url, done, cancel: (error) => finish(error) };
    return this.pending;
  }

  async login(waitMs = LOGIN_WAIT_MS) {
    const { url, done } = this.startLogin();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), waitMs);
      timer.unref();
    });
    const result = await Promise.race([done, timeout]).finally(() => clearTimeout(timer));
    if (result === "timeout") {
      throw new AuthRequiredError(
        `Reddit login not completed yet. Approve access in the browser window that opened (or open ${url}), then retry.`,
      );
    }
  }

  async getAccessToken(): Promise<string> {
    const tokens = await this.load();
    if (tokens && tokens.expiresAt - 60_000 > Date.now()) return tokens.accessToken;
    if (tokens?.refreshToken) {
      try {
        return (await this.refresh(tokens.refreshToken)).accessToken;
      } catch (error) {
        if (!(error instanceof TokenError && error.code === "invalid_grant")) throw error;
        await this.clear();
      }
    }
    await this.login();
    const fresh = await this.load();
    if (!fresh) throw new AuthRequiredError("Reddit login failed");
    return fresh.accessToken;
  }

  async invalidate() {
    const tokens = await this.load();
    if (tokens) tokens.expiresAt = 0;
  }

  async status() {
    const tokens = await this.load();
    return {
      authenticated: Boolean(tokens?.refreshToken || (tokens && tokens.expiresAt > Date.now())),
      scope: tokens?.scope,
      accessTokenExpiresAt: tokens ? new Date(tokens.expiresAt).toISOString() : undefined,
      tokenPath: config.tokenPath,
      redirectUri: config.redirectUri,
      pendingLoginUrl: this.pending?.url,
    };
  }

  private async clear() {
    this.generation++;
    this.tokens = null;
    await rm(config.tokenPath, { force: true });
  }

  async logout() {
    const tokens = await this.load();
    this.pending?.cancel(new AuthRequiredError("Logged out"));
    await this.clear();
    if (tokens?.refreshToken) {
      await fetch(config.revokeUrl, {
        method: "POST",
        headers: {
          Authorization: this.basic(),
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": config.userAgent,
        },
        body: new URLSearchParams({ token: tokens.refreshToken, token_type_hint: "refresh_token" }),
      }).catch(() => {});
    }
  }
}

export const auth = new Auth();
