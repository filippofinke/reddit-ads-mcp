#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "./config.js";
import { registerTools } from "./tools/index.js";

const server = new McpServer(
  { name: "reddit-ads", version: config.version },
  {
    instructions:
      "Manage Reddit Ads through the Reddit Ads API v3. Start with reddit_ads_list_ad_accounts to find the ad account ID. Hierarchy: business > ad account > campaign > ad group > ad. Money values are in micro-currency (1 USD = 1000000). The first call opens a browser for Reddit login if the server is not yet authenticated.",
  },
);

registerTools(server);

process.stdin.on("close", () => process.exit(0));

await server.connect(new StdioServerTransport());
