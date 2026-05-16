import type { CategorySeed, ToolSeed } from "../../src/lib/factory/types";

export function buildToolEnrichmentPrompt(tool: ToolSeed, category: CategorySeed): string {
  return [
    "Return valid JSON only.",
    "You are enriching a tool catalog for an editorial AI software directory.",
    `Category: ${category.name}`,
    `Tool: ${tool.name}`,
    `Official URL: ${tool.officialUrl}`,
    `Pricing model: ${tool.pricingModel}`,
    `Core features: ${tool.coreFeatures.join(", ")}`,
    `Use cases: ${tool.useCases.join(", ")}`,
    `Target users: ${tool.targetUsers.join(", ")}`,
    "Respond with this shape:",
    JSON.stringify(
      {
        summary: "string",
        pros: ["string"],
        cons: ["string"],
        alternatives: ["tool-slug"],
        faq: [{ question: "string", answer: "string" }],
        metaDescription: "string",
        editorialAngles: ["string"],
        suggestedInternalLinks: [{ label: "string", href: "/path" }]
      },
      null,
      2
    )
  ].join("\n");
}
