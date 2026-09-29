<h1 align="center">Welcome to reddit-ads-mcp 👋</h1>
<p align="center">
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg">
  <a href="https://github.com/filippofinke/reddit-ads-mcp/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
  <a href="https://github.com/filippofinke/reddit-ads-mcp/actions/workflows/ci.yml" target="_blank">
    <img alt="CI" src="https://github.com/filippofinke/reddit-ads-mcp/actions/workflows/ci.yml/badge.svg" />
  </a>
  <a href="https://twitter.com/filippofinke" target="_blank">
    <img alt="Twitter: filippofinke" src="https://img.shields.io/twitter/follow/filippofinke.svg?style=social" />
  </a>
</p>

> 📣 MCP server for the [Reddit Ads API v3](https://ads-api.reddit.com/docs/v3/): let any MCP-compatible AI client create, update, delete and report on campaigns, ad groups, ads, audiences, catalogs and more.

> ⚠️ **Not affiliated with Reddit, Inc.** You need your own Reddit Ads developer app. Actions run against your real ad accounts and can spend real money.

### 🏠 [Homepage](https://github.com/filippofinke/reddit-ads-mcp)

## Features

- 🧭 **Full API coverage**: all 108 operations of the Reddit Ads API v3 as 114 MCP tools, plus a raw request tool
- 🔐 **Browser OAuth login**: only a client ID and secret needed; the server opens Reddit's consent page, catches the callback on `localhost` and stores a refresh token (0600) that is refreshed automatically
- 📊 **Campaign management**: campaigns, ad groups, ads, bulk activate / pause / archive / delete
- 🖼️ **Creatives**: structured post jobs, legacy posts, creative asset library, video poster generation
- 🎯 **Targeting**: communities, interests, geolocations, devices, carriers, languages, third-party audiences, keyword suggestions
- 👥 **Audiences**: custom audiences (hashed user upload), saved audiences, lead gen forms
- 📈 **Reporting and planning**: performance reports with breakdowns, bid suggestions, audience and delivery estimates, reach curves
- 🛒 **Catalogs and conversions**: product catalogs, feeds, sets, batch upserts, pixels, Conversions API, data deletion jobs
- 📄 **Pagination**: automatic `next_url` following with merged results
- 🔁 **Resilient**: token refresh on 401, backoff on 429, no retries of non-idempotent writes

## Setup

### 1. Create a Reddit developer app

In [Reddit Ads Manager](https://ads.reddit.com), open **Business settings → Developer applications** and create an app (business admins only). Set the redirect URL to:

```
http://localhost:8765/callback
```

Copy the **Client ID** and **Client secret**.

### 2. Build

```sh
git clone https://github.com/filippofinke/reddit-ads-mcp.git
cd reddit-ads-mcp
npm install
npm run build
```

Requires Node 20+.

### 3. Connect your MCP client

It is a standard **stdio** MCP server, so it works with any client that supports MCP (Claude, Cursor, VS Code, Windsurf, Codex, Gemini CLI, Zed, Cline, Continue, …). Point your client at:

```json
{
  "mcpServers": {
    "reddit-ads": {
      "command": "node",
      "args": ["/absolute/path/to/reddit-ads-mcp/dist/index.js"],
      "env": {
        "REDDIT_ADS_CLIENT_ID": "your_client_id",
        "REDDIT_ADS_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

| Client | Where the config goes |
| --- | --- |
| Claude Desktop | `claude_desktop_config.json` |
| Claude Code | `claude mcp add -s user reddit-ads -e REDDIT_ADS_CLIENT_ID=… -e REDDIT_ADS_CLIENT_SECRET=… -- node /absolute/path/to/reddit-ads-mcp/dist/index.js` |
| Cursor | `~/.cursor/mcp.json` or `.cursor/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Gemini CLI | `~/.gemini/settings.json` |
| Cline / Roo Code | MCP settings of the extension |
| VS Code (Copilot) | `.vscode/mcp.json`, using `"servers"` instead of `"mcpServers"` and `"type": "stdio"` |
| Codex CLI | `~/.codex/config.toml` (see below) |

Codex CLI uses TOML:

```toml
[mcp_servers.reddit-ads]
command = "node"
args = ["/absolute/path/to/reddit-ads-mcp/dist/index.js"]
env = { REDDIT_ADS_CLIENT_ID = "your_client_id", REDDIT_ADS_CLIENT_SECRET = "your_client_secret" }
```

### 4. Log in

Ask your assistant anything, e.g. _"List my Reddit ad accounts"_. On the first call the server opens Reddit's consent page. After you approve, the refresh token is saved to `~/.config/reddit-ads-mcp/tokens.json` and reused from then on.

`reddit_ads_auth_status` shows the current state and `reddit_ads_logout` revokes and deletes the token.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `REDDIT_ADS_CLIENT_ID` | required | App client ID |
| `REDDIT_ADS_CLIENT_SECRET` | required | App client secret |
| `REDDIT_ADS_ACCOUNT_ID` | | Default ad account for tools taking `ad_account_id` |
| `REDDIT_ADS_REDIRECT_PORT` | `8765` | Port of the local OAuth callback server |
| `REDDIT_ADS_REDIRECT_URI` | `http://localhost:<port>/callback` | Must exactly match the app's redirect URL |
| `REDDIT_ADS_SCOPES` | `adsread adsedit adsconversions adsdatadeletion` | OAuth scopes |
| `REDDIT_ADS_TOKEN_PATH` | `~/.config/reddit-ads-mcp/tokens.json` | Token storage |
| `REDDIT_ADS_USER_AGENT` | `node:reddit-ads-mcp:1.0.0` | Reddit asks for `<platform>:<app id>:<version> (by /u/<username>)` |

## Example prompts

- _"Show last week's spend, clicks and CTR per campaign"_
- _"Create a paused traffic campaign targeting r/legaladvice and r/law in the US with a $20 daily budget"_
- _"Pause every ad group with a CPC above $2"_
- _"Suggest subreddits and keywords similar to r/startups"_
- _"Archive the campaign named Summer Sale"_

## Caveats

- 💵 Money values are **micro-currency**: `1000000` is one unit of the account currency.
- 🗑️ Campaigns, ad groups and ads have no hard delete: set status `DELETED`. A campaign must be `ARCHIVED` first, and deletion is only allowed three hours after the last change.
- 📌 New ad groups require a `conversion_pixel_id`, usually equal to the ad account ID (see `reddit_ads_list_pixels`).
- 🔎 The custom audience name filter needs an operator prefix: `=` for exact, `@` for substring.

## Scripts

```sh
npm run dev         # run from source with tsx
npm run build       # compile to dist/
npm run typecheck   # tsc --noEmit
npm run lint        # Biome lint + format check
npm run format      # Biome lint + format (write)
```

## Author

👤 **Filippo Finke**

* Website: [https://filippofinke.ch](https://filippofinke.ch)
* Twitter: [@filippofinke](https://twitter.com/filippofinke)
* Github: [@filippofinke](https://github.com/filippofinke)
* LinkedIn: [@filippofinke](https://linkedin.com/in/filippofinke)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />
Feel free to check the [issues page](https://github.com/filippofinke/reddit-ads-mcp/issues).

## Show your support

Give a ⭐️ if this project helped you!

<a href="https://www.buymeacoffee.com/filippofinke">
  <img src="https://github.com/filippofinke/filippofinke/raw/main/images/buymeacoffe.png" alt="Buy Me A McFlurry">
</a>

## 📝 License

Copyright © 2026 [Filippo Finke](https://github.com/filippofinke).<br />
This project is [MIT](./LICENSE) licensed.

***

_Unofficial project, not affiliated with Reddit, Inc._
