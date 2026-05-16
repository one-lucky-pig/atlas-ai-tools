import type { ToolEnrichment, ToolSeed } from "./types";

export function createDefaultEnrichment(tool: ToolSeed): ToolEnrichment {
  return {
    summary: `${tool.name} helps ${tool.targetUsers.join(", ")} handle ${tool.useCases.join(", ")} with AI-assisted workflows.`,
    pros: [`Useful for ${tool.useCases[0]}`, `Covers ${tool.coreFeatures[0]}`],
    cons: ["Needs editorial review before publishing final claims"],
    alternatives: [],
    faq: [
      {
        question: `Who should try ${tool.name}?`,
        answer: `${tool.name} is best suited to ${tool.targetUsers.join(", ")} working on ${tool.useCases.join(", ")}.`
      }
    ],
    metaDescription: `${tool.name} overview, pricing model, core features, and realistic use cases.`,
    editorialAngles: [...tool.useCases],
    suggestedInternalLinks: [
      {
        label: `${tool.category} tools`,
        href: `/categories/${tool.category}`
      }
    ]
  };
}
