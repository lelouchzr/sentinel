import { englishText } from "../language.ts";
import generated from "../../public/stories/manifest.json" with { type: "json" };
import existing from "../../public/stories/base-manifest.json" with { type: "json" };
import type { Room } from "../game.ts";

type Artwork = Pick<Room, "image" | "credits" | "imageProvenance">;
/** Provenance is taken from recorded real model calls, never synthesized by a story author. */
export function artwork(id: string): Artwork {
  const asset = [...generated.assets, ...existing.assets].find(
    (a) => a.id === id,
  );
  if (!asset) throw new Error(`Missing illustration: ${id}`);
  return {
    image: asset.path,
    credits: asset.credits.map((credit) => ({
      ...credit,
      title: englishText(credit.title),
      license: englishText(credit.license),
    })),
    ...("imageProvenance" in asset
      ? { imageProvenance: asset.imageProvenance as Room["imageProvenance"] }
      : {}),
  };
}
