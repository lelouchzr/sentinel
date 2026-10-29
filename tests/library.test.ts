import { describe, expect, it, vi } from 'vitest';
import { addCollection, emptyLibrary } from '@/features/app/local-library';
import { previewImport } from '@/features/imports/parser';

describe('confirmed local vocabulary identity', () => {
  const sample = () =>
    previewImport('expression\tmeaning\n빌리다\temprunter\n돌려주다\trendre').rows;
  it('does not transfer an old expression identity to an edited draft', () => {
    const original = sample();
    const previousId = original[0]!.id;
    original[0]!.meaning = 'une autre signification';
    const collection = addCollection(emptyLibrary, 'Edited', original).collections[0]!;
    expect(collection.items[0]!.id).not.toBe(previousId);
  });
  it('rejects identical reimports even in a different order without changing the existing library', () => {
    const library = addCollection(emptyLibrary, 'First', sample());
    expect(() => addCollection(library, 'Second', sample().reverse())).toThrow('déjà présentes');
    expect(library.collections).toHaveLength(1);
  });
  it('preserves homonyms but groups duplicate pairs during explicit confirmation', () => {
    const rows = sample();
    rows.push({ ...rows[0]!, meaning: 'emprunter une voie' }, { ...rows[0]! });
    const library = addCollection(emptyLibrary, 'Homonyms', rows);
    expect(library.collections[0]!.items).toHaveLength(3);
    expect(new Set(library.collections[0]!.items.map((item) => item.id)).size).toBe(3);
  });
});
