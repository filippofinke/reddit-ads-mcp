import { z } from "zod";
import { paginate } from "../client.js";
import {
  accountIdSchema,
  type Endpoint,
  fields,
  readOnly,
  registerEndpoints,
  resolveAccount,
  respond,
  type Server,
} from "./shared.js";

const DEFAULT_FIELDS = ["IMPRESSIONS", "CLICKS", "SPEND", "CTR", "CPC", "ECPM"];

const BREAKDOWNS = [
  "AD_ACCOUNT_ID",
  "CAMPAIGN_ID",
  "AD_GROUP_ID",
  "AD_ID",
  "DATE",
  "HOUR",
  "COUNTRY",
  "REGION",
  "DMA",
  "METRO",
  "COMMUNITY",
  "INTEREST",
  "KEYWORD",
  "PLACEMENT",
  "OS_TYPE",
  "GENDER",
  "LANGUAGE",
  "ASSET_ID",
  "CAROUSEL_CARD",
  "GALLERY_ITEM_ID",
] as const;

function toHour(value: string, end: boolean) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : hasOffset ? value : `${value}Z`);
  if (Number.isNaN(date.getTime()) || (dateOnly && !date.toISOString().startsWith(value))) {
    throw new Error(`Invalid date: ${value}`);
  }
  if (dateOnly && end) date.setUTCDate(date.getUTCDate() + 1);
  const roundUp =
    end && date.getUTCMinutes() + date.getUTCSeconds() + date.getUTCMilliseconds() > 0;
  date.setUTCMinutes(0, 0, 0);
  if (roundUp) date.setUTCHours(date.getUTCHours() + 1);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

const endpoints: Endpoint[] = [
  {
    name: "reddit_ads_suggest_bid",
    title: "Suggest bid",
    description: "Get minimum and suggested bid values (micro-currency) for a planned ad group.",
    method: "POST",
    path: "/forecasting/bid_suggestions",
    body: fields(
      "Fields: duration {start_time (required), end_time}, ad_account_id, campaign_objective, bid_type, bid_strategy, optimization_goal, goal_type, goal_value, currency, use_catalog, is_campaign_budget_optimization, view_through_conversion_type, targeting {...same as ad group targeting}.",
    ),
    readOnly: true,
  },
  {
    name: "reddit_ads_estimate_audience",
    title: "Estimate audience and delivery",
    description:
      "Estimate audience size and delivery (impressions, clicks, conversions, reach) for a planned ad group. Limited to 10 requests per minute.",
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/forecasting/audience_and_delivery_estimates",
    body: fields(
      "Fields: objective (required), use_catalog, goal_value (campaign budget, micro; required here or in the ad group config), ad_group_configs (exactly 1) [{start_time, end_time, bid_type, bid_strategy, bid_value, goal_type, goal_value, optimization_goal, view_through_conversion_type, shopping_type, shopping_targeting, targeting {... plus age {min_age, max_age}}}].",
    ),
    readOnly: true,
  },
  {
    name: "reddit_ads_get_channel_reach",
    title: "Get channel planning reach",
    description: "Get a Reddit-wide reach curve (impressions vs reach) for media planning.",
    method: "GET",
    path: "/channel_planning/reach",
    query: {
      duration_days: z.union([z.literal(7), z.literal(28)]),
      geolocation: z.enum(["US", "CA", "GB"]),
      min_age: z.number().int().min(18).optional(),
      max_age: z.number().int().max(99).optional(),
      gender: z.enum(["MALE", "FEMALE", "ALL"]).optional(),
    },
  },
];

export function registerReportTools(server: Server) {
  server.registerTool(
    "reddit_ads_get_report",
    {
      title: "Get performance report",
      description:
        "Get performance metrics for an ad account. Metric keys come back lowercase. spend, cpc, cpv, ecpm, conversion_*_ecpa, app_install_*_ecpa, app_install_skan_* and app_install_*_revenue are micro-currency (divide by 1000000); conversion_*_total_value is in cents. Data can take up to 6 hours to settle.",
      inputSchema: {
        ad_account_id: accountIdSchema,
        starts_at: z.string().describe("Start date YYYY-MM-DD or ISO 8601 (rounded to the hour)"),
        ends_at: z
          .string()
          .describe("End date YYYY-MM-DD (inclusive) or ISO 8601 (rounded to the hour)"),
        fields: z
          .array(z.string())
          .optional()
          .describe(
            `Uppercase metric names. Default ${DEFAULT_FIELDS.join(", ")}. Others: REACH, FREQUENCY, VIDEO_STARTED, VIDEO_WATCHED_25_PERCENT..VIDEO_WATCHED_100_PERCENT, VIDEO_VIEWABLE_IMPRESSIONS, CPV, CONVERSION_PAGE_VISIT_CLICKS, CONVERSION_PURCHASE_CLICKS, CONVERSION_PURCHASE_VIEWS, CONVERSION_PURCHASE_TOTAL_VALUE, CONVERSION_PURCHASE_ECPA, CONVERSION_SIGN_UP_CLICKS, CONVERSION_LEAD_CLICKS, CONVERSION_ADD_TO_CART_CLICKS, KEY_CONVERSION_TOTAL_COUNT, KEY_CONVERSION_ECPA, APP_INSTALL_INSTALL_COUNT, etc.`,
          ),
        breakdowns: z
          .array(z.enum(BREAKDOWNS))
          .max(4)
          .optional()
          .describe(
            "Up to 3 breakdowns (4 when COUNTRY and REGION are both used). Use at most one of KEYWORD, COMMUNITY, INTEREST, LANGUAGE and do not combine them with geo, OS_TYPE, GALLERY_ITEM_ID or CAROUSEL_CARD; HOUR only for ranges up to 7 days",
          ),
        time_zone_id: z.string().optional().describe("IANA time zone, e.g. America/New_York"),
        filter: z
          .string()
          .optional()
          .describe(
            "Filter like campaign:id==123 or ad_group:name=@brand or ad:effective_status==ACTIVE; comma separated conditions are ORed",
          ),
        conversion_metrics: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe("[{conversion_field, action_sources: [WEBSITE|APP|PHYSICAL_STORE|OTHER]}]"),
        conversion_custom_events: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe(
            "[{name, metrics: [{metric_type: VIEWS|CLICKS|ECPA|TOTAL_VALUE|TOTAL_ITEMS|AVG_VALUE|ROAS, action_sources}]}]",
          ),
        custom_column_ids: z.array(z.string()).optional(),
        page_size: z.number().int().min(1).max(1000).optional(),
        max_pages: z.number().int().min(1).max(100).optional().describe("Default 10"),
      },
      annotations: readOnly,
    },
    (args) =>
      respond(() =>
        paginate(
          "POST",
          `/ad_accounts/${encodeURIComponent(resolveAccount(args.ad_account_id))}/reports`,
          {
            query: { "page.size": args.page_size },
            body: {
              data: {
                starts_at: toHour(args.starts_at, false),
                ends_at: toHour(args.ends_at, true),
                fields: args.fields ?? DEFAULT_FIELDS,
                breakdowns: args.breakdowns,
                time_zone_id: args.time_zone_id,
                filter: args.filter,
                conversion_metrics: args.conversion_metrics,
                conversion_custom_events: args.conversion_custom_events,
                custom_column_ids: args.custom_column_ids,
              },
            },
          },
          args.max_pages ?? 10,
        ),
      ),
  );

  registerEndpoints(server, endpoints);
}
