/** English links are canonical; legacy slugs remain valid for bookmarks and saves. */
const englishSlugs: Readonly<Record<string, string>> = {
  "le-dernier-service": "the-last-service",
  "le-secret-de-la-serre": "the-greenhouse-secret",
  "le-phare-des-marees": "the-tidal-lighthouse",
  "la-vigie-de-la-lune": "moonwatch",
  "le-dernier-service-classique": "the-last-service-classic",
};

export function canonicalStorySlug(slug: string): string {
  return englishSlugs[slug] ?? slug;
}

/** Reuse the original browser capability key instead of abandoning existing progress. */
export function savedStorySlug(slug: string): string {
  return Object.entries(englishSlugs).find(([, english]) => english === slug)?.[0] ?? slug;
}
