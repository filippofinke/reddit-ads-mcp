import { registerAccountTools } from "./accounts.js";
import { registerAudienceTools } from "./audiences.js";
import { registerAuthTools } from "./auth.js";
import { registerCampaignTools } from "./campaigns.js";
import { registerCatalogTools } from "./catalogs.js";
import { registerConversionTools } from "./conversions.js";
import { registerCreativeTools } from "./creatives.js";
import { registerReportTools } from "./reports.js";
import type { Server } from "./shared.js";
import { registerTargetingTools } from "./targeting.js";

export function registerTools(server: Server) {
  registerAuthTools(server);
  registerAccountTools(server);
  registerCampaignTools(server);
  registerCreativeTools(server);
  registerReportTools(server);
  registerTargetingTools(server);
  registerAudienceTools(server);
  registerConversionTools(server);
  registerCatalogTools(server);
}
