import { z } from "zod";
import { type Endpoint, fields, ids, registerEndpoints, type Server } from "./shared.js";

const CTA =
  "call_to_action values: Apply Now, Contact Us, Download, Get a Quote, Get Showtimes, Install, Learn More, Order Now, Play Now, Pre-order Now, See Menu, Shop Now, Sign Up, View More, Watch Now, Book Now, Buy Tickets, Get Directions, Listen Now, Read More, Subscribe, Visit Store, Donate Now, Remind Me";

const postType = z.enum(["CAROUSEL", "IMAGE", "TEXT", "VIDEO"]).optional();
const postSource = z.enum(["ORGANIC", "PROMOTED"]).optional();

const endpoints: Endpoint[] = [
  {
    name: "reddit_ads_create_post_job",
    title: "Create post (structured)",
    description:
      "Create an ad post on a profile asynchronously. Poll reddit_ads_get_post_job until status is SUCCESS to get the post_id for reddit_ads_create_ad. Media is fetched by Reddit from public URLs.",
    method: "POST",
    path: "/profiles/{profile_id}/structured_posts/jobs",
    body: fields(
      `Fields: allow_comments (bool), creative (required, one of): IMAGE {type: "IMAGE", headline, image: {media: {type: "URL", url}}, destination: {type: "URL", url, display_url, call_to_action}, supplementary_text}; TEXT {type: "TEXT", headline, body, text_format: PLAIN_TEXT|RICH_TEXT_JSON}; VIDEO {type: "VIDEO", headline, video: {media: {type: "URL", url}}, thumbnail: {media: {type: "URL", url}}, destination}; CAROUSEL {type: "CAROUSEL", headline, carousel: [{image, destination, caption}] (1-40 cards)}; PROMOTED_POST {type: "PROMOTED_POST", headline, post: {type: "PROMOTED_COMMUNITY_POST", post_id}}. ${CTA}.`,
    ),
  },
  {
    name: "reddit_ads_get_post_job",
    title: "Get post creation job",
    description:
      "Get the status of a structured post creation job (QUEUED|PROCESSING|SUCCESS|CLIENT_ERROR|SERVER_ERROR) and the resulting post_id.",
    method: "GET",
    path: "/structured_posts/jobs/{post_creation_job_id}",
  },
  {
    name: "reddit_ads_list_structured_posts",
    title: "List structured posts",
    description: "List structured posts on a profile.",
    method: "GET",
    path: "/profiles/{profile_id}/structured_posts",
    query: { id: ids("Filter by post IDs (max 10)"), type: postType, source: postSource },
    paginated: true,
  },
  {
    name: "reddit_ads_get_structured_post",
    title: "Get structured post",
    description: "Get a structured post.",
    method: "GET",
    path: "/structured_posts/{post_id}",
  },
  {
    name: "reddit_ads_update_structured_post",
    title: "Update structured post",
    description: "Update a structured post. Only allow_comments can be changed.",
    method: "PATCH",
    path: "/structured_posts/{post_id}",
    body: z.object({ allow_comments: z.boolean() }),
  },
  {
    name: "reddit_ads_list_posts",
    title: "List posts",
    description: "List posts on a profile (legacy posts API).",
    method: "GET",
    path: "/profiles/{profile_id}/posts",
    query: { type: postType, source: postSource },
    paginated: true,
  },
  {
    name: "reddit_ads_create_post",
    title: "Create post (legacy)",
    description:
      "Create a post on a profile synchronously (legacy posts API). Prefer reddit_ads_create_post_job.",
    method: "POST",
    path: "/profiles/{profile_id}/posts",
    body: fields(
      `Fields: type (IMAGE|VIDEO|TEXT|CAROUSEL), headline, body, is_richtext, allow_comments, thumbnail_url (required for VIDEO), content [{media_url, destination_url, display_url, call_to_action, caption}]. ${CTA}.`,
    ),
  },
  {
    name: "reddit_ads_get_post",
    title: "Get post",
    description: "Get a post by ID (t3_...).",
    method: "GET",
    path: "/posts/{post_id}",
  },
  {
    name: "reddit_ads_update_post",
    title: "Update post",
    description: "Update a post. Only allow_comments can be changed.",
    method: "PATCH",
    path: "/posts/{post_id}",
    body: z.object({ allow_comments: z.boolean() }),
  },
  {
    name: "reddit_ads_upload_creative_assets",
    title: "Upload creative assets",
    description:
      "Add up to 50 assets to a profile's creative library (used by Reddit Max ads). Media is fetched by Reddit from public URLs. Poll reddit_ads_get_creative_asset_upload for the resulting asset.",
    method: "POST",
    path: "/profiles/{profile_id}/creative_assets/uploads",
    body: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(50)
      .describe(
        `Sent as {"data": [...]}. Items: {type: "IMAGE", name, media: {type: "URL", url}}, {type: "VIDEO", name, media: {type: "URL", url}, poster: {type: "URL", url}}, {type: "HEADLINE", text}, {type: "CTA", call_to_action}; each may have reference_id. ${CTA}.`,
      ),
  },
  {
    name: "reddit_ads_list_creative_asset_uploads",
    title: "List creative asset uploads",
    description: "Get the status of several creative asset uploads.",
    method: "GET",
    path: "/profiles/{profile_id}/creative_assets/uploads",
    query: { id: z.array(z.string()).min(1).max(100).describe("Upload IDs") },
  },
  {
    name: "reddit_ads_get_creative_asset_upload",
    title: "Get creative asset upload",
    description:
      "Get a creative asset upload: status (PROCESSING_MEDIA|ACTIVE|INVALID_MEDIA) and resulting asset.",
    method: "GET",
    path: "/creative_assets/uploads/{id}",
  },
  {
    name: "reddit_ads_list_creative_assets",
    title: "List creative assets",
    description: "List creative assets in a profile's library.",
    method: "GET",
    path: "/profiles/{profile_id}/creative_assets",
    query: {
      mime_type: ids("image/jpeg, image/png, image/gif, image/webp, video/mp4, video/quicktime"),
      creative_asset_ids: ids("Filter by asset IDs"),
      aspect_ratios: ids("1:1, 3:4, 4:3, 4:5, 9:16, 16:9, 1.91:1, CUSTOM"),
      types: z.array(z.enum(["IMAGE", "VIDEO"])).optional(),
      name: z.string().optional(),
    },
    explode: ["mime_type", "creative_asset_ids", "types"],
    paginated: true,
  },
  {
    name: "reddit_ads_get_creative_asset",
    title: "Get creative asset",
    description: "Get a creative asset.",
    method: "GET",
    path: "/creative_assets/{creative_asset_id}",
  },
  {
    name: "reddit_ads_update_creative_asset",
    title: "Rename creative asset",
    description: "Rename a creative asset.",
    method: "PATCH",
    path: "/creative_assets/{creative_asset_id}",
    body: z.object({ name: z.string() }),
  },
  {
    name: "reddit_ads_delete_creative_asset",
    title: "Delete creative asset",
    description: "Permanently delete a creative asset from the library.",
    method: "DELETE",
    path: "/creative_assets/{creative_asset_id}",
  },
  {
    name: "reddit_ads_create_poster_job",
    title: "Generate video posters",
    description:
      "Generate poster (thumbnail) images from a public video URL. Poll reddit_ads_get_poster_job for the result.",
    method: "POST",
    path: "/generated_content/posters/jobs",
    body: z.object({ source_url: z.string().url() }),
  },
  {
    name: "reddit_ads_get_poster_job",
    title: "Get poster job",
    description: "Get the status and generated posters of a poster generation job.",
    method: "GET",
    path: "/generated_content/posters/jobs/{id}",
  },
];

export function registerCreativeTools(server: Server) {
  registerEndpoints(server, endpoints);
}
