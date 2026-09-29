import { z } from "zod";
import { type Endpoint, fields, registerEndpoints, type Server } from "./shared.js";

const endpoints: Endpoint[] = [
  {
    name: "reddit_ads_list_custom_audiences",
    title: "List custom audiences",
    description:
      "List custom audiences (customer lists, retargeting, lookalikes) in an ad account.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/custom_audiences",
    query: {
      name: z
        .string()
        .regex(/^[=@]/, "name must start with '=' (exact match) or '@' (substring match)")
        .optional()
        .describe(
          "Name filter starting with '=' for exact match or '@' for substring, e.g. '@retarget'",
        ),
    },
    paginated: true,
  },
  {
    name: "reddit_ads_get_custom_audience",
    title: "Get custom audience",
    description: "Get a custom audience including its status and size.",
    method: "GET",
    path: "/custom_audiences/{audience_id}",
  },
  {
    name: "reddit_ads_create_custom_audience",
    title: "Create custom audience",
    description:
      "Create a custom audience. For customer lists, add users afterwards with reddit_ads_update_custom_audience_users.",
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/custom_audiences",
    body: fields(
      'One of: {type: "CUSTOMER_LIST", name, customer_list_config: {origin_client_id, origin, external_audience_id}}; {type: "PIXEL_RETARGETING", name, pixel_audience_config: {pixel_ids: [one id], targetings: [PAGE_VISIT|VIEW_CONTENT|SEARCH|ADD_TO_CART|ADD_TO_WISHLIST|PURCHASE|LEAD|SIGN_UP|CUSTOM], lookback_window_days 1-90, custom_targetings}}; {type: "ENGAGEMENT_RETARGETING", name, engagement_audience_config: {tracking_types: [IMPRESSIONS|CLICKS|UPVOTES|COMMENT_SUBMISSIONS|VIDEO_STARTED|VIDEO_WATCHED_50_PERCENT|VIDEO_WATCHED_100_PERCENT], lookback_window_days 1-180, campaign_ids: []}}.',
    ),
  },
  {
    name: "reddit_ads_update_custom_audience_users",
    title: "Add or remove audience users",
    description:
      "Add or remove users in a customer list audience. Values must be SHA-256 hashes of normalized (lowercased, trimmed) emails or mobile ad IDs. Max 2500 rows per call.",
    method: "PATCH",
    path: "/custom_audiences/{audience_id}/users",
    body: z.object({
      action_type: z.enum(["ADD", "REMOVE"]),
      column_order: z
        .array(z.enum(["EMAIL_SHA256", "MAID_SHA256"]))
        .min(1)
        .max(2),
      user_data: z
        .array(z.array(z.string()))
        .max(2500)
        .describe("Rows of hashed values in column_order"),
    }),
  },
  {
    name: "reddit_ads_delete_custom_audience",
    title: "Delete custom audience",
    description: "Permanently delete a custom audience.",
    method: "DELETE",
    path: "/custom_audiences/{audience_id}",
  },
  {
    name: "reddit_ads_list_saved_audiences",
    title: "List saved audiences",
    description: "List saved (reusable) targeting audiences.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/saved_audiences",
    paginated: true,
  },
  {
    name: "reddit_ads_get_saved_audience",
    title: "Get saved audience",
    description: "Get a saved audience.",
    method: "GET",
    path: "/saved_audiences/{saved_audience_id}",
  },
  {
    name: "reddit_ads_create_saved_audience",
    title: "Create saved audience",
    description: "Save a targeting configuration to reuse on ad groups via saved_audience_id.",
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/saved_audiences",
    body: fields(
      'Fields: name, type: "REDDIT_AUDIENCE", targeting (same as ad group targeting, without locations and platforms).',
    ),
  },
  {
    name: "reddit_ads_update_saved_audience",
    title: "Update saved audience",
    description: "Update a saved audience. Set status to DELETED to delete it.",
    method: "PATCH",
    path: "/saved_audiences/{saved_audience_id}",
    body: fields("Fields: name, status, targeting."),
  },
  {
    name: "reddit_ads_list_lead_gen_forms",
    title: "List lead gen forms",
    description: "List lead generation forms in an ad account.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/lead_gen_forms",
    paginated: true,
  },
  {
    name: "reddit_ads_get_lead_gen_form",
    title: "Get lead gen form",
    description: "Get a lead generation form.",
    method: "GET",
    path: "/lead_gen_forms/{lead_gen_form_id}",
  },
  {
    name: "reddit_ads_create_lead_gen_form",
    title: "Create lead gen form",
    description: "Create a lead generation form.",
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/lead_gen_forms",
    body: fields(
      "Fields: name, privacy_link (https URL), prompt, questions [{type: EMAIL|FIRST_NAME|LAST_NAME|PHONE_NUMBER|POSTAL_CODE|JOB_TITLE|COMPANY|COMPANY_EMAIL, required}] (at least one required).",
    ),
  },
];

export function registerAudienceTools(server: Server) {
  registerEndpoints(server, endpoints);
}
