import "dotenv/config";
import { runPipeline } from "./lib/pipeline";

const result = await runPipeline();

console.log(
  JSON.stringify(
    {
      provider: result.provider,
      cachedTools: result.cachedTools,
      totalPages: result.bundle.pages.length,
      totalCategories: result.bundle.categories.length,
      totalTools: result.bundle.tools.length
    },
    null,
    2
  )
);
