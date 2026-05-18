import dispatchesData from "../../data/editorial/articles.json";
import type { PublishedDispatch } from "./workflow";

export const dispatches = (dispatchesData as PublishedDispatch[]).slice().sort((left, right) =>
  right.publishedAt.localeCompare(left.publishedAt)
);

export function getDispatchBySlug(slug: string): PublishedDispatch | undefined {
  return dispatches.find((dispatch) => dispatch.slug === slug);
}

export function getRecentDispatches(limit = 6): PublishedDispatch[] {
  return dispatches.slice(0, limit);
}
