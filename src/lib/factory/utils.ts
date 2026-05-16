export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hasPlaceholderText(value: string): boolean {
  return /\b(todo|tbd|placeholder|lorem ipsum)\b/i.test(value);
}
