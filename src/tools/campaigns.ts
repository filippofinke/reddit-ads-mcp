import { z } from "zod";
import { request } from "../client.js";
import {
  type Endpoint,
  fields,
  ids,
  registerEndpoints,
  respond,
  type Server,
  write,
} from "./shared.js";

const TARGETING = `targeting object: communities / excluded_communities (subreddit names), interests / excluded_interests (IDs from reddit_ads_list_interests), keywords / excluded_keywords, geolocations / excluded_geolocations (IDs from reddit_ads_list_geolocations, e.g. "US"), custom_audience_ids / excluded_custom_audience_ids, devices [{type: DESKTOP|MOBILE, os: ANDROID|IOS, min_version, max_version}], carriers [], platforms [ALL|DESKTOP|MOBILE_NATIVE|MOBILE_WEB|...], locations [FEED|COMMENTS_PAGE], gender (MALE|FEMALE|null), languages [EN|DE|...], expand_targeting (bool)`;

const DELETE_RULES =
  "Deleting follows Reddit's rules: a campaign must be ARCHIVED first, and campaigns and ad groups can only be DELETED three hours after their last change (archive now, delete later).";

const MONEY = "All money values are micro-currency (1 USD = 1000000).";

const endpoints: Endpoint[] = [
  {
    name: "reddit_ads_list_campaigns",
    title: "List campaigns",
    description: "List campaigns in an ad account.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/campaigns",
    query: { id: ids("Filter by campaign IDs (max 200)") },
    paginated: true,
  },
  {
    name: "reddit_ads_get_campaign",
    title: "Get campaign",
    description: "Get a campaign including effective_status and delivery_status.",
    method: "GET",
    path: "/campaigns/{campaign_id}",
  },
  {
    name: "reddit_ads_create_campaign",
    title: "Create campaign",
    description: `Create a campaign. ${MONEY} Create it PAUSED unless the user asks otherwise.`,
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/campaigns",
    body: fields(
      `Required: name, configured_status (ACTIVE|PAUSED), objective (CLICKS|CONVERSIONS|IMPRESSIONS|VIDEO_VIEWABLE_IMPRESSIONS|APP_INSTALLS|CATALOG_SALES|LEAD_GENERATION|BRAND_AWARENESS|SALES). Optional: funding_instrument_id, special_ad_categories [HOUSING_EMPLOYMENT_CREDIT|NONE], use_catalog (SALES only), spend_cap, app_id, invoice_label, type ("AUTOMATED" for Reddit Max campaigns, objectives CLICKS|CONVERSIONS|APP_INSTALLS). Campaign budget optimization: is_campaign_budget_optimization true plus start_time, end_time, goal_type (DAILY_SPEND|LIFETIME_SPEND, LIFETIME needs end_time), goal_value, bid_strategy (BIDLESS|MAXIMIZE_VOLUME|TARGET_CPX), bid_type (CPC|CPM|CPV6|CPV15), bid_value, optimization_goal, view_through_conversion_type (SEVEN_DAY_CLICKS|SEVEN_DAY_CLICKS_ONE_DAY_VIEW), conversion_pixel_id, schedule [{start_day 0-6, start_hour, end_day, end_hour}].`,
    ),
  },
  {
    name: "reddit_ads_update_campaign",
    title: "Update campaign",
    description: `Update a campaign. Pass only the fields to change. To delete set configured_status to DELETED, to archive set ARCHIVED. ${DELETE_RULES} ${MONEY}`,
    method: "PATCH",
    path: "/campaigns/{campaign_id}",
    body: fields(
      "Fields: name, configured_status (ACTIVE|PAUSED|ARCHIVED|DELETED), goal_value, funding_instrument_id, spend_cap, bid_strategy, bid_type, bid_value, start_time, end_time, schedule, invoice_label, objective, use_catalog.",
    ),
  },
  {
    name: "reddit_ads_list_ad_groups",
    title: "List ad groups",
    description: "List ad groups in an ad account.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/ad_groups",
    query: {
      campaign_id: z.string().optional().describe("Filter by campaign ID"),
      id: ids("Filter by ad group IDs (max 200)"),
    },
    paginated: true,
  },
  {
    name: "reddit_ads_get_ad_group",
    title: "Get ad group",
    description: "Get an ad group including targeting, bidding and status.",
    method: "GET",
    path: "/ad_groups/{ad_group_id}",
  },
  {
    name: "reddit_ads_create_ad_group",
    title: "Create ad group",
    description: `Create an ad group inside a campaign. ${MONEY} Create it PAUSED unless the user asks otherwise. Under campaign budget optimization the bid_strategy, bid_type, goal_type, optimization_goal and view_through_conversion_type must match the campaign and goal_value must be null.`,
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/ad_groups",
    body: fields(
      `Required: campaign_id, name, bid_strategy, bid_type, conversion_pixel_id (the account pixel ID from reddit_ads_list_pixels, often equal to the ad account ID); set configured_status (ACTIVE|PAUSED). Common: start_time, end_time (ISO 8601, null runs continuously), goal_type (DAILY_SPEND|LIFETIME_SPEND), goal_value (budget), bid_strategy (BIDLESS|MANUAL_BIDDING|MAXIMIZE_VOLUME|TARGET_CPX), bid_type (CPC|CPM|CPV|CPV6|CPV15), bid_value, optimization_goal (CLICKS|PAGE_VISIT|ADD_TO_CART|PURCHASE|LEAD|SIGN_UP|VIEW_CONTENT|SEARCH|LANDING_PAGE_VISIT|VIDEO_VIEW_6S|VIDEO_VIEW_15S|MOBILE_CONVERSION_*), view_through_conversion_type, conversion_pixel_id, schedule, saved_audience_id, app_id, product_set_id, shopping_type (DYNAMIC|STATIC), shopping_targeting, ${TARGETING}. Reddit Max ad groups: type "AUTOMATED" with targeting required.`,
    ),
  },
  {
    name: "reddit_ads_update_ad_group",
    title: "Update ad group",
    description: `Update an ad group. Pass only the fields to change. To delete set configured_status to DELETED. ${DELETE_RULES} Targeting is replaced as a whole object. ${MONEY}`,
    method: "PATCH",
    path: "/ad_groups/{ad_group_id}",
    body: fields(
      `Fields: name, configured_status (ACTIVE|PAUSED|ARCHIVED|DELETED), targeting, bid_strategy, bid_type, bid_value, conversion_pixel_id, start_time, end_time, goal_value, schedule, optimization_goal, product_set_id, saved_audience_id, shopping_type, shopping_targeting. ${TARGETING}.`,
    ),
  },
  {
    name: "reddit_ads_list_ads",
    title: "List ads",
    description:
      "List ads in an ad account. Filters are OR within a parameter and AND across parameters.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/ads",
    query: {
      id: ids("Filter by ad IDs"),
      ad_group_id: ids("Filter by ad group IDs"),
      campaign_id: ids("Filter by campaign IDs"),
      configured_status: z
        .array(z.enum(["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"]))
        .optional()
        .describe("Filter by configured status"),
      effective_status: ids("Filter by effective status, e.g. ACTIVE, REJECTED, PENDING_APPROVAL"),
    },
    paginated: true,
  },
  {
    name: "reddit_ads_get_ad",
    title: "Get ad",
    description:
      "Get an ad including effective_status, rejection_reason, post_url and preview_url.",
    method: "GET",
    path: "/ads/{ad_id}",
  },
  {
    name: "reddit_ads_create_ad",
    title: "Create ad",
    description:
      "Create an ad in an ad group. Standard ads promote a post: first create one with reddit_ads_create_post_job (or reddit_ads_create_post) and pass its post_id (t3_...). Create it PAUSED unless the user asks otherwise.",
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/ads",
    body: fields(
      'Required: ad_group_id, name, configured_status (ACTIVE|PAUSED). Standard ad: post_id, click_url (landing page), click_url_query_parameters [{name, value}], event_trackers [{type: CLICK|VIEW, url}], preview_expiry, profile_id, products [{product_id}], shopping_creative {headline, call_to_action, destination_url, allow_comments, second_line_cta, dpa_carousel_mode, hero_card}. Reddit Max ad: type "DYNAMIC_CREATIVE_AD_TEMPLATE", profile_id, asset_identifiers [{id}] (>=3 headlines and >=2 media from reddit_ads_upload_creative_assets), thumbnail_asset_identifiers, destination {type: "URL", url, display_url}, supplementary_text.',
    ),
  },
  {
    name: "reddit_ads_update_ad",
    title: "Update ad",
    description:
      "Update an ad. Pass only the fields to change. To delete set configured_status to DELETED. The ad group cannot be changed.",
    method: "PATCH",
    path: "/ads/{ad_id}",
    body: fields(
      "Fields: name, configured_status (ACTIVE|PAUSED|ARCHIVED|DELETED), post_id, profile_id, click_url, click_url_query_parameters, event_trackers, preview_expiry, products, shopping_creative, asset_identifiers, thumbnail_asset_identifiers, destination, supplementary_text, enhancements.",
    ),
  },
];

const entityPaths = { campaign: "campaigns", ad_group: "ad_groups", ad: "ads" } as const;

export function registerCampaignTools(server: Server) {
  registerEndpoints(server, endpoints);

  server.registerTool(
    "reddit_ads_set_status",
    {
      title: "Set status",
      description: `Activate, pause, archive or delete several campaigns, ad groups or ads at once. Reddit has no hard delete for these entities; DELETED is the delete operation. ${DELETE_RULES}`,
      inputSchema: {
        entity_type: z.enum(["campaign", "ad_group", "ad"]),
        ids: z.array(z.string()).min(1).describe("Entity IDs"),
        status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"]),
      },
      annotations: { ...write, destructiveHint: true },
    },
    ({ entity_type, ids, status }) =>
      respond(async () => {
        const results = await Promise.all(
          ids.map((id) =>
            request("PATCH", `/${entityPaths[entity_type]}/${encodeURIComponent(id)}`, {
              body: { data: { configured_status: status } },
            })
              .then((result) => ({ id, ok: true, result }))
              .catch((error: Error) => ({ id, ok: false, error: error.message })),
          ),
        );
        if (results.some((result) => !result.ok)) throw new Error(JSON.stringify(results, null, 2));
        return results;
      }),
  );
}
