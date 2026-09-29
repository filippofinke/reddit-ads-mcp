import { z } from "zod";
import { paginate } from "../client.js";
import {
  type Endpoint,
  fields,
  ids,
  readOnly,
  registerEndpoints,
  respond,
  type Server,
} from "./shared.js";

interface List<T> {
  data?: T[];
}

const endpoints: Endpoint[] = [
  {
    name: "reddit_ads_get_me",
    title: "Get current user",
    description: "Get the authenticated Reddit Ads member or system user.",
    method: "GET",
    path: "/me",
  },
  {
    name: "reddit_ads_list_businesses",
    title: "List my businesses",
    description: "List businesses the authenticated user belongs to.",
    method: "GET",
    path: "/me/businesses",
    query: {
      ad_account_id: z.string().optional().describe("Only businesses that own this ad account"),
      role: z.enum(["BUSINESS_ADMIN", "CATALOG_ADMIN"]).optional(),
    },
    paginated: true,
  },
  {
    name: "reddit_ads_get_business",
    title: "Get business",
    description: "Get a business by ID.",
    method: "GET",
    path: "/businesses/{business_id}",
  },
  {
    name: "reddit_ads_update_business",
    title: "Update business",
    description: "Update a business.",
    method: "PATCH",
    path: "/businesses/{business_id}",
    body: fields(
      "Fields: name, industry, country, website_url, phone, primary_contact_id, agency_affiliated.",
    ),
  },
  {
    name: "reddit_ads_list_industries",
    title: "List industries",
    description: "List valid business industries.",
    method: "GET",
    path: "/industries",
  },
  {
    name: "reddit_ads_list_business_ad_accounts",
    title: "List business ad accounts",
    description: "List ad accounts owned by a business (not those shared into it).",
    method: "GET",
    path: "/businesses/{business_id}/ad_accounts",
    query: { ids: ids("Filter by ad account IDs") },
    paginated: true,
  },
  {
    name: "reddit_ads_query_ad_accounts",
    title: "Query ad accounts",
    description:
      "Search the ad accounts a business can access, including shared ones, by name, ID, actor, role or asset.",
    method: "POST",
    path: "/businesses/{business_id}/ad_accounts/query",
    body: fields(
      "Fields: filter (e.g. 'name=@acme' or 'id==t2_abc', comma separated), actors [{id, type: AD_ACCOUNT|BUSINESS|INVITATION|MEMBER|DEVELOPER_APP}], roles [ADMIN|ANALYST|CATALOG_ADMIN|BUSINESS_ADMIN|CREATOR|USE_ASSET|PARTNER_ADMIN|PARTNER_CREATOR|PARTNER_ANALYST], assets [{id, type: AD_ACCOUNT|BILLING_ADDRESS|CUSTOM_AUDIENCE|FUNDING_INSTRUMENT|PIXEL|PRODUCT_CATALOG|PROFILE}].",
    ).optional(),
    paginated: true,
    readOnly: true,
  },
  {
    name: "reddit_ads_get_ad_account",
    title: "Get ad account",
    description:
      "Get an ad account: currency, time zone, attribution settings, approval status and account-level exclusions.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}",
  },
  {
    name: "reddit_ads_update_ad_account",
    title: "Update ad account",
    description: "Update ad account settings.",
    method: "PATCH",
    path: "/ad_accounts/{ad_account_id}",
    body: fields(
      "Fields: name, time_zone_id, attribution_type (ALL_CONVERSION|CLICK_THROUGH_CONVERSION|VIEW_THROUGH_CONVERSION), click_attribution_window / view_attribution_window (DAY|WEEK|MONTH), app_attribution_type, app_click_attribution_window, app_view_attribution_window, excluded_communities [], excluded_keywords [], pixel_partner_preferences [DV|IAS|MODE], primary_contact_member_id.",
    ),
  },
  {
    name: "reddit_ads_get_ad_account_history",
    title: "Get ad account change history",
    description: "Get the change log of an ad account (who changed what and when).",
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/history",
    body: fields(
      "All optional: start_time, end_time (ISO 8601), member_ids [], change_types [AD_ACCOUNT|AD|AD_GROUP|AUDIENCE|BID|BUDGET|CAMPAIGN|STATUS|TARGETING], entity_id_filters [{entity_ids, entity_type: AD|AD_GROUP|CAMPAIGN, include_child_entities}], entity_name_filters [{entity_names, entity_type, operator: EQUALS|LIKE, include_child_entities}].",
    ).optional(),
    paginated: true,
    readOnly: true,
  },
  {
    name: "reddit_ads_list_account_profiles",
    title: "List ad account profiles",
    description:
      "List Reddit profiles (t2_ user IDs) an ad account can post ads as. Profile IDs are needed for posts, creative assets and ads.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/profiles",
    paginated: true,
  },
  {
    name: "reddit_ads_list_business_profiles",
    title: "List business profiles",
    description: "List Reddit profiles owned by a business.",
    method: "GET",
    path: "/businesses/{business_id}/profiles",
    paginated: true,
  },
  {
    name: "reddit_ads_get_profile",
    title: "Get profile",
    description: "Get a Reddit profile by ID.",
    method: "GET",
    path: "/profiles/{profile_id}",
  },
  {
    name: "reddit_ads_list_funding_instruments",
    title: "List funding instruments",
    description: "List the funding instruments (payment methods, credit lines) of an ad account.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/funding_instruments",
    query: {
      funding_instrument_ids: ids("Filter by IDs"),
      types: ids("Filter by funding instrument types"),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
      search: z.string().optional(),
      mode: z.enum(["ACTIVE", "INACTIVE", "UPCOMING", "SELECTABLE", "ALL"]).optional(),
    },
    paginated: true,
  },
  {
    name: "reddit_ads_query_business_funding_instruments",
    title: "Query business funding instruments",
    description: "Query funding instruments available to a business.",
    method: "POST",
    path: "/businesses/{business_id}/funding_instruments/query",
    query: { search: z.string().optional() },
    body: fields(
      "Fields: partner_business_id, funding_instrument_ids [], mode (ACTIVE|ALL).",
    ).optional(),
    paginated: true,
    readOnly: true,
  },
  {
    name: "reddit_ads_list_funding_instrument_allocations",
    title: "List funding instrument allocations",
    description: "List child funding instruments allocated from a funding instrument.",
    method: "GET",
    path: "/funding_instruments/{funding_instrument_id}/allocations",
    paginated: true,
  },
  {
    name: "reddit_ads_list_time_zones",
    title: "List time zones",
    description: "List supported time zones.",
    method: "GET",
    path: "/time_zones",
    paginated: true,
  },
  {
    name: "reddit_ads_get_third_party_trackers",
    title: "Get third-party trackers",
    description: "List approved click and impression tracker domains for ad event_trackers.",
    method: "GET",
    path: "/third_party_trackers",
  },
  {
    name: "reddit_ads_list_apps",
    title: "List apps",
    description: "List mobile apps used in the ad account's past campaigns.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/apps",
    paginated: true,
  },
  {
    name: "reddit_ads_get_app_last_fired",
    title: "Get app events last fired",
    description: "Get when each mobile conversion event last fired for an app.",
    method: "GET",
    path: "/apps/{app_id}/last_fired_at_report",
  },
  {
    name: "reddit_ads_get_skan_availability",
    title: "Get SKAdNetwork availability",
    description: "Get SKAdNetwork campaign, ad group and ad quota for an iOS app.",
    method: "GET",
    path: "/apps/{app_id}/skan_availability",
    query: { campaign_id: z.string().optional(), ad_group_id: z.string().optional() },
  },
];

export function registerAccountTools(server: Server) {
  server.registerTool(
    "reddit_ads_list_ad_accounts",
    {
      title: "List all ad accounts",
      description:
        "List every ad account the authenticated user can access, grouped by business. Start here to find ad_account_id values.",
      annotations: readOnly,
    },
    () =>
      respond(async () => {
        const businesses = (await paginate(
          "GET",
          "/me/businesses",
          { query: { "page.size": 700 } },
          20,
        )) as List<{ id: string; name: string }>;
        return Promise.all(
          (businesses.data ?? []).map(async (business) => {
            const path = `/businesses/${encodeURIComponent(business.id)}/ad_accounts`;
            const accounts = (await paginate(
              "POST",
              `${path}/query`,
              { query: { "page.size": 1000 }, body: { data: {} } },
              20,
            ).catch(() =>
              paginate("GET", path, { query: { "page.size": 1000 } }, 20),
            )) as List<unknown>;
            return { business, ad_accounts: accounts.data ?? [] };
          }),
        );
      }),
  );

  registerEndpoints(server, endpoints);
}
