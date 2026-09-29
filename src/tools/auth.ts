import { z } from "zod";
import { auth } from "../auth.js";
import { request } from "../client.js";
import { destructive, readOnly, respond, type Server, write } from "./shared.js";

export function registerAuthTools(server: Server) {
  server.registerTool(
    "reddit_ads_login",
    {
      title: "Log in to Reddit Ads",
      description:
        "Open the Reddit OAuth consent page in the browser and wait for the callback. Returns the authorization URL if the login is not completed in time.",
      annotations: write,
    },
    () =>
      respond(async () => {
        await auth.login();
        return auth.status();
      }),
  );

  server.registerTool(
    "reddit_ads_auth_status",
    {
      title: "Auth status",
      description: "Show whether the server holds valid Reddit Ads credentials.",
      annotations: readOnly,
    },
    () => respond(() => auth.status()),
  );

  server.registerTool(
    "reddit_ads_logout",
    {
      title: "Log out of Reddit Ads",
      description: "Revoke the stored refresh token and delete it from disk.",
      annotations: destructive,
    },
    () =>
      respond(async () => {
        await auth.logout();
        return { authenticated: false };
      }),
  );

  server.registerTool(
    "reddit_ads_api_request",
    {
      title: "Raw Reddit Ads API request",
      description:
        "Call any Reddit Ads API v3 endpoint directly. Use for endpoints without a dedicated tool. Path is relative to https://ads-api.reddit.com/api/v3 (e.g. 'me' or 'ad_accounts/{id}/campaigns'). Bodies for POST/PATCH/PUT are usually wrapped as {\"data\": {...}}.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]),
        path: z.string().describe("Endpoint path, e.g. ad_accounts/t2_abc/campaigns"),
        query: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
          .optional()
          .describe("Query string parameters"),
        body: z.unknown().optional().describe("JSON body sent as-is"),
      },
      annotations: destructive,
    },
    ({ method, path, query, body }) => respond(() => request(method, path, { query, body })),
  );
}
