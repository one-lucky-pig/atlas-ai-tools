import "dotenv/config";
import { validateGeneratedBundle } from "./lib/pipeline";

const result = await validateGeneratedBundle();

if (result.failures.length > 0) {
  console.error(JSON.stringify(result.failures, null, 2));
  process.exit(1);
}

console.log(`Validated ${result.pages.length} generated pages with no publishing gate failures.`);
