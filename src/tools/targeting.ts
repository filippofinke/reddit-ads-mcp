import { z } from "zod";
import { type Endpoint, fields, registerEndpoints, type Server } from "./shared.js";

const endpoints: Endpoint[] = [
  {
    name: "reddit_ads_search_communities",
    title: "Search communities",
    description: "Search subreddits for targeting by name or topic.",
    method: "GET",
    path: "/targeting/communities/search",
    query: { query: z.string().describe("Search text") },
    paginated: true,
  },
  {
    name: "reddit_ads_get_communities",
    title: "Get communities",
    description: "Look up subreddits by exact name, with subscriber counts and categories.",
    method: "GET",
    path: "/targeting/communities",
    query: { names: z.string().describe("Comma separated subreddit names without r/") },
    paginated: true,
  },
  {
    name: "reddit_ads_suggest_communities",
    title: "Suggest communities",
    description: "Suggest related subreddits from seed subreddits and/or a website URL.",
    method: "GET",
    path: "/targeting/communities/suggestions",
    query: {
      names: z.string().optional().describe("Comma separated seed subreddit names"),
      website_url: z.string().optional(),
    },
    paginated: true,
  },
  {
    name: "reddit_ads_list_interests",
    title: "List interests",
    description: "List interest categories for targeting.",
    method: "GET",
    path: "/targeting/interests",
  },
  {
    name: "reddit_ads_list_geolocations",
    title: "List geolocations",
    description:
      "List geolocation targets. Without filters returns countries; filter by country for regions/metros, or search cities / postal codes.",
    method: "GET",
    path: "/targeting/geolocations",
    query: {
      country: z.string().optional().describe("ISO country code, e.g. US"),
      cities_search: z.string().optional(),
      postal_code: z.string().optional(),
    },
  },
  {
    name: "reddit_ads_validate_geolocations",
    title: "Validate geolocations",
    description: "Validate geolocation IDs or city names before using them in targeting.",
    method: "POST",
    path: "/targeting/geolocations_validations",
    body: fields("One of: geolocation_ids [] (max 20000) or cities [] (max 2000)."),
    readOnly: true,
  },
  {
    name: "reddit_ads_list_devices",
    title: "List devices",
    description: "List device makes and models for targeting.",
    method: "GET",
    path: "/targeting/devices",
    paginated: true,
  },
  {
    name: "reddit_ads_list_carriers",
    title: "List carriers",
    description: "List mobile carriers for targeting.",
    method: "GET",
    path: "/targeting/carriers",
    paginated: true,
  },
  {
    name: "reddit_ads_list_languages",
    title: "List languages",
    description: "List languages for targeting.",
    method: "GET",
    path: "/targeting/languages",
    paginated: true,
  },
  {
    name: "reddit_ads_list_third_party_audiences",
    title: "List third-party audiences",
    description: "List third-party data audiences (LiveRamp, Bombora) with sizes and costs.",
    method: "GET",
    path: "/targeting/third_party_audiences",
    paginated: true,
  },
  {
    name: "reddit_ads_suggest_keywords",
    title: "Suggest keywords",
    description: "Get keyword suggestions with monthly views from seed keywords.",
    method: "POST",
    path: "/targeting/keyword_suggestions",
    body: z.object({ seed_keywords: z.array(z.string()).min(1).max(1000) }),
    readOnly: true,
  },
  {
    name: "reddit_ads_validate_keywords",
    title: "Validate keywords",
    description: "Check whether keywords are brand safe.",
    method: "POST",
    path: "/targeting/keyword_validations",
    body: z.object({ keywords: z.array(z.string()).min(1).max(1000) }),
    readOnly: true,
  },
];

export function registerTargetingTools(server: Server) {
  registerEndpoints(server, endpoints);
}
