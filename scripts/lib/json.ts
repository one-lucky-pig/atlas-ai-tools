export function parseJsonFromText(value: string): unknown {
  const trimmed = value.trim();
  const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = codeFenceMatch ? codeFenceMatch[1].trim() : trimmed;
  return JSON.parse(candidate);
}
