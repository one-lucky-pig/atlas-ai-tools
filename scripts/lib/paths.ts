import path from "node:path";

export const rootDir = process.cwd();
export const dataDir = path.join(rootDir, "data");
export const generatedDir = path.join(dataDir, "generated");
export const runtimeDir = path.join(rootDir, "runtime");

export const siteFile = path.join(dataDir, "site.json");
export const categorySeedFile = path.join(dataDir, "seeds", "categories.json");
export const toolSeedFile = path.join(dataDir, "seeds", "tools.json");
export const generatedBundleFile = path.join(generatedDir, "site-bundle.json");
export const pipelineReportFile = path.join(generatedDir, "pipeline-report.json");
export const enrichmentCacheFile = path.join(generatedDir, "enrichments.json");
export const schedulerStateFile = path.join(runtimeDir, "scheduler-state.json");
export const observationFile = path.join(runtimeDir, "category-observations.json");
export const decisionFile = path.join(runtimeDir, "publishing-decisions.json");
