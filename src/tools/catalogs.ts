import { z } from "zod";
import { type Endpoint, fields, ids, registerEndpoints, type Server } from "./shared.js";

const approval = z.enum(["PENDING", "APPROVED", "REJECTED"]).optional();

const endpoints: Endpoint[] = [
  {
    name: "reddit_ads_list_catalogs",
    title: "List product catalogs",
    description: "List product catalogs of a business.",
    method: "GET",
    path: "/businesses/{business_id}/product_catalogs",
  },
  {
    name: "reddit_ads_get_catalog",
    title: "Get product catalog",
    description: "Get a product catalog.",
    method: "GET",
    path: "/product_catalogs/{catalog_id}",
  },
  {
    name: "reddit_ads_create_catalog",
    title: "Create product catalog",
    description: "Create a product catalog for dynamic product ads.",
    method: "POST",
    path: "/businesses/{business_id}/product_catalogs",
    body: fields(
      "Fields: name, default_language (en|de|es|fr|it|pt), default_currency (USD|GBP|CAD|EUR|AUD|JPY|CHF|NZD|SEK|NOK), event_sources [pixel IDs].",
    ),
  },
  {
    name: "reddit_ads_update_catalog",
    title: "Update product catalog",
    description: "Update a product catalog.",
    method: "PATCH",
    path: "/product_catalogs/{catalog_id}",
    body: fields("Fields: name, event_sources [pixel IDs]."),
  },
  {
    name: "reddit_ads_delete_catalog",
    title: "Delete product catalog",
    description: "Permanently delete a product catalog with its feeds, sets and products.",
    method: "DELETE",
    path: "/product_catalogs/{catalog_id}",
  },
  {
    name: "reddit_ads_list_product_feeds",
    title: "List product feeds",
    description: "List feeds of a product catalog.",
    method: "GET",
    path: "/product_catalogs/{catalog_id}/product_feeds",
  },
  {
    name: "reddit_ads_get_product_feed",
    title: "Get product feed",
    description: "Get a product feed.",
    method: "GET",
    path: "/product_feeds/{feed_id}",
  },
  {
    name: "reddit_ads_create_product_feed",
    title: "Create product feed",
    description: "Create a scheduled product feed (max 2 per catalog, of different modes).",
    method: "POST",
    path: "/product_catalogs/{catalog_id}/product_feeds",
    body: fields(
      "Fields: name, url, username, password, mode (REPLACE|UPDATE), schedule {is_paused, interval (HOURLY|DAILY|WEEKLY|MONTHLY), interval_count, day_of_month, day_of_week, hour, minute, timezone}.",
    ),
  },
  {
    name: "reddit_ads_update_product_feed",
    title: "Update product feed",
    description: "Update a product feed.",
    method: "PATCH",
    path: "/product_feeds/{feed_id}",
    body: fields("Fields: name, url, username, password, mode, schedule."),
  },
  {
    name: "reddit_ads_delete_product_feed",
    title: "Delete product feed",
    description: "Permanently delete a product feed.",
    method: "DELETE",
    path: "/product_feeds/{feed_id}",
  },
  {
    name: "reddit_ads_list_catalog_imports",
    title: "List catalog imports",
    description: "List feed import runs of a catalog.",
    method: "GET",
    path: "/product_catalogs/{catalog_id}/catalog_imports",
    query: {
      feed_ids: ids("Filter by feed IDs"),
      statuses: z
        .array(z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "SKIPPED"]))
        .optional(),
    },
    explode: ["feed_ids"],
    paginated: true,
  },
  {
    name: "reddit_ads_list_catalog_import_issues",
    title: "List catalog import issues",
    description: "List issues found while importing a feed.",
    method: "GET",
    path: "/catalog_imports/{import_id}/issues",
    query: { code: z.string().optional().describe("Filter by issue code") },
    paginated: true,
  },
  {
    name: "reddit_ads_get_catalog_import_report",
    title: "Get catalog import report",
    description: "Get a download URL for a feed import report.",
    method: "GET",
    path: "/catalog_imports/{import_id}/report",
  },
  {
    name: "reddit_ads_list_product_sets",
    title: "List product sets",
    description: "List product sets of a catalog.",
    method: "GET",
    path: "/product_catalogs/{catalog_id}/product_sets",
    paginated: true,
  },
  {
    name: "reddit_ads_get_product_set",
    title: "Get product set",
    description: "Get a product set.",
    method: "GET",
    path: "/product_sets/{product_set_id}",
  },
  {
    name: "reddit_ads_create_product_set",
    title: "Create product set",
    description: "Create a filtered product set for catalog ad groups (product_set_id).",
    method: "POST",
    path: "/product_catalogs/{catalog_id}/product_sets",
    body: fields("Fields: name (max 100), filter (filter rule string)."),
  },
  {
    name: "reddit_ads_update_product_set",
    title: "Update product set",
    description: "Update a product set.",
    method: "PATCH",
    path: "/product_sets/{product_set_id}",
    body: fields("Fields: name, filter."),
  },
  {
    name: "reddit_ads_delete_product_set",
    title: "Delete product set",
    description: "Permanently delete a product set.",
    method: "DELETE",
    path: "/product_sets/{product_set_id}",
  },
  {
    name: "reddit_ads_list_catalog_products",
    title: "List catalog products",
    description: "List products in a catalog.",
    method: "GET",
    path: "/product_catalogs/{catalog_id}/products",
    query: {
      ids: ids("Filter by product IDs"),
      approval_decision: approval,
      search: z.string().optional(),
    },
    explode: ["ids"],
    paginated: true,
  },
  {
    name: "reddit_ads_list_product_set_products",
    title: "List product set products",
    description: "List products in a product set.",
    method: "GET",
    path: "/product_sets/{product_set_id}/products",
    query: {
      ids: ids("Filter by product IDs"),
      approval_decision: approval,
      search: z.string().optional(),
      issue_code: z.string().optional(),
    },
    explode: ["ids"],
    paginated: true,
  },
  {
    name: "reddit_ads_upsert_products",
    title: "Upsert products",
    description: "Create or update up to 1000 products in a catalog.",
    method: "POST",
    path: "/product_catalogs/{catalog_id}/products/batch_upsert",
    body: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(1000)
      .describe(
        'Sent as {"data": [...]}. Product fields: id, title, description, price ("9.99 USD"), link, image_link, availability (IN_STOCK|OUT_OF_STOCK|PREORDER|BACKORDER), brand, gtin, mpn, sale_price, sale_price_effective_date, item_group_id, additional_image_links, product_type, google_product_category, condition, color, size, gender, age_group, custom_label_0..4.',
      ),
  },
  {
    name: "reddit_ads_delete_products",
    title: "Delete products",
    description: "Delete up to 1000 products from a catalog by product ID.",
    method: "POST",
    path: "/product_catalogs/{catalog_id}/products/batch_delete",
    destructive: true,
    body: z.array(z.string()).min(1).max(1000).describe("Product IDs"),
  },
];

export function registerCatalogTools(server: Server) {
  registerEndpoints(server, endpoints);
}
