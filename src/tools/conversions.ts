import { z } from "zod";
import { type Endpoint, registerEndpoints, type Server } from "./shared.js";

const identifiers = z.object({
  identifiers: z
    .array(
      z.object({
        type: z.enum(["EMAIL", "PHONE_NUMBER", "IDFA", "AAID", "EXTERNAL_ID"]),
        value: z.string().describe("Raw or SHA-256 hashed value"),
      }),
    )
    .min(1)
    .max(200),
});

const endpoints: Endpoint[] = [
  {
    name: "reddit_ads_list_pixels",
    title: "List pixels",
    description: "List Reddit pixels of an ad account.",
    method: "GET",
    path: "/ad_accounts/{ad_account_id}/pixels",
    paginated: true,
  },
  {
    name: "reddit_ads_list_business_pixels",
    title: "List business pixels",
    description: "List Reddit pixels of a business.",
    method: "GET",
    path: "/businesses/{business_id}/pixels",
    paginated: true,
  },
  {
    name: "reddit_ads_get_pixel_last_fired",
    title: "Get pixel last fired",
    description: "Get when each conversion event last fired for a pixel, to check tracking health.",
    method: "GET",
    path: "/pixels/{pixel_id}/last_fired_at",
  },
  {
    name: "reddit_ads_send_conversion_events",
    title: "Send conversion events",
    description:
      "Send server-side conversion events through the Conversions API (requires the adsconversions scope). Use test_id to send test events visible in Events Manager.",
    method: "POST",
    path: "/pixels/{pixel_id}/conversion_events",
    body: z.object({
      test_id: z.string().optional(),
      events: z
        .array(z.record(z.string(), z.unknown()))
        .min(1)
        .max(1000)
        .describe(
          "Each event: event_at (epoch ms), action_source (WEBSITE|APP|OTHER|PHYSICAL_STORE), type {tracking_type: PAGE_VISIT|VIEW_CONTENT|SEARCH|ADD_TO_CART|ADD_TO_WISHLIST|PURCHASE|LEAD|SIGN_UP|CUSTOM, custom_event_name}, click_id, event_source_url, referrer_url, metadata {conversion_id, order_id, currency, item_count, value (base currency units), products [{id, name, category, quantity, item_price}]}, user {email, phone_number, external_id, ip_address, user_agent, aaid, idfa, uuid, screen_dimensions, data_processing_options}",
        ),
    }),
  },
  {
    name: "reddit_ads_create_data_deletion_job",
    title: "Delete user data (ad account)",
    description:
      "Request deletion of a person's data from an ad account (requires the adsdatadeletion scope).",
    method: "POST",
    path: "/ad_accounts/{ad_account_id}/data_deletion_jobs",
    body: identifiers,
  },
  {
    name: "reddit_ads_create_pixel_data_deletion_job",
    title: "Delete user data (pixel)",
    description:
      "Request deletion of a person's data collected by a pixel (requires the adsdatadeletion scope and business admin).",
    method: "POST",
    path: "/pixels/{pixel_id}/data_deletion_jobs",
    body: identifiers,
  },
  {
    name: "reddit_ads_get_data_deletion_job",
    title: "Get data deletion job",
    description: "Get the status of a data deletion job (QUEUED|COMPLETED|FAILED).",
    method: "GET",
    path: "/data_deletion_jobs/{job_id}",
  },
];

export function registerConversionTools(server: Server) {
  registerEndpoints(server, endpoints);
}
