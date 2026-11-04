import { validateRoom, type Room } from "../game.ts";
import { greenhouse } from "./greenhouse.ts";
import { lighthouse } from "./lighthouse.ts";
import { kitchenStory } from "./kitchen.ts";
import { observatory } from "./observatory.ts";

export const storyCatalog = [
  { slug: "le-dernier-service", definition: kitchenStory },
  { slug: "le-secret-de-la-serre", definition: greenhouse },
  { slug: "le-phare-des-marees", definition: lighthouse },
  { slug: "la-vigie-de-la-lune", definition: observatory },
].map(({ slug, definition }) => ({
  slug,
  definition: validateRoom(definition),
}));

/** Published short snapshots remain addressable; the catalogue points to the long editions. */
export const legacyEditions: Record<string, string> = {
  "le-secret-de-la-serre-00e47d55": "le-secret-de-la-serre",
  "le-phare-des-marees-6c1b1fe6": "le-phare-des-marees",
  "la-vigie-de-la-lune-3fd3194c": "la-vigie-de-la-lune",
};
export function catalogueStory(slug: string) {
  return storyCatalog.find((s) => s.slug === slug);
}
export function storyCard(story: { slug: string; definition: Room }) {
  const room = story.definition;
  return {
    id: `story:${story.slug}:narrative-v1`,
    slug: story.slug,
    title: room.title,
    description: room.description,
    image: room.image,
    theme: room.theme,
    difficulty: room.difficulty,
    duration: room.duration,
    author: "L’atelier Storyscape",
    createdAt: "2026-11-04T14:00:00Z",
    builtin: true,
    chapterCount: room.chapters?.length ?? 1,
    interactionCount: room.objects.length,
  };
}
