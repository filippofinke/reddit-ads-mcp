import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { type ZodRawShape, type ZodType, z } from "zod";
import { paginate, type Query, request } from "../client.js";
import { config } from "../config.js";

export type Server = McpServer;

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export interface Endpoint {
  name: string;
  title: string;
  description: string;
  method: Method;
  path: string;
  query?: ZodRawShape;
  body?: ZodType;
  paginated?: boolean;
  readOnly?: boolean;
  destructive?: boolean;
  explode?: string[];
}

export const readOnly: ToolAnnotations = { readOnlyHint: true, openWorldHint: true };
export const write: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
};
export const destructive: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true,
};

export const fields = (description: string) =>
  z.record(z.string(), z.unknown()).describe(`Sent as {"data": {...}}. ${description}`);

export const ids = (description: string) => z.array(z.string()).optional().describe(description);

export const accountIdSchema = z
  .string()
  .optional()
  .describe("Ad account ID (t2_... or a2_...). Defaults to REDDIT_ADS_ACCOUNT_ID.");

const pageShape = {
  page_size: z
    .number()
    .int()
    .min(1)
    .max(2000)
    .optional()
    .describe("Items per page (usually max 1000)"),
  page_token: z.string().optional().describe("Page token from a previous pagination.next_url"),
  max_pages: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Follow pagination.next_url up to this many pages and merge results (default 1)"),
};

export function resolveAccount(accountId?: string) {
  const id = accountId || config.defaultAccountId;
  if (!id) {
    throw new Error(
      "ad_account_id is required. Call reddit_ads_list_ad_accounts to find it or set REDDIT_ADS_ACCOUNT_ID.",
    );
  }
  return id;
}

export async function respond(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    const result = await fn();
    return {
      content: [
        {
          type: "text",
          text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return { isError: true, content: [{ type: "text", text: (error as Error).message }] };
  }
}

function annotationsFor(endpoint: Endpoint): ToolAnnotations {
  if (endpoint.readOnly || endpoint.method === "GET") return readOnly;
  return endpoint.destructive || endpoint.method === "DELETE" ? destructive : write;
}

export function registerEndpoints(server: Server, endpoints: Endpoint[]) {
  for (const endpoint of endpoints) {
    const pathParams = [...endpoint.path.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string);
    const shape: ZodRawShape = {
      ...Object.fromEntries(
        pathParams.map((param) => [
          param,
          param === "ad_account_id" ? accountIdSchema : z.string().min(1),
        ]),
      ),
      ...endpoint.query,
      ...(endpoint.paginated ? pageShape : {}),
      ...(endpoint.body ? { data: endpoint.body } : {}),
    };

    server.registerTool(
      endpoint.name,
      {
        title: endpoint.title,
        description: endpoint.description,
        inputSchema: shape,
        annotations: annotationsFor(endpoint),
      },
      (args: Record<string, unknown>) =>
        respond(async () => {
          const path = endpoint.path.replace(/\{(\w+)\}/g, (_, key: string) =>
            encodeURIComponent(
              key === "ad_account_id"
                ? resolveAccount(args[key] as string | undefined)
                : String(args[key]),
            ),
          );
          const query: Query = {};
          for (const key of Object.keys(endpoint.query ?? {})) {
            query[key] = args[key] as Query[string];
          }
          if (endpoint.paginated) {
            query["page.size"] = args.page_size as number | undefined;
            query["page.token"] = args.page_token as string | undefined;
          }
          const options = {
            query,
            explode: endpoint.explode,
            body: endpoint.body ? { data: args.data ?? {} } : undefined,
          };
          return endpoint.paginated
            ? paginate(endpoint.method, path, options, args.max_pages as number | undefined)
            : request(endpoint.method, path, options);
        }),
    );
  }
}
