import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addCollection,
  canonicalItems,
  emptyLibrary,
  mergeLibraryBackup,
  parseLibraryBackup,
  readLibrary,
  saveCompletedSession,
  storageKey,
  updateCollection,
  writeLibrary,
} from '@/features/app/local-library';
import { previewImport } from '@/features/imports/parser';
import { completedSessionFixture } from './session-fixtures';

const rows = () => previewImport('expression\tmeaning\n빌리다\temprunter\n돌려주다\trendre').rows;
const library = () => addCollection(emptyLibrary, 'Mes expressions', rows());

afterEach(() => vi.unstubAllGlobals());

describe('library editing and backup boundaries', () => {
  it('changes edited vocabulary identity without rewriting historical conversations', () => {
    const current = library();
    const session = completedSessionFixture({ mode: 'local' });
    current.history.push(session);
    const collection = current.collections[0]!;
    const oldId = collection.items[0]!.id;
    const changed = updateCollection(current, collection.id, 'Nouveau nom', [
      { ...collection.items[0]!, meaning: 'emprunter quelque chose' },
    ]);
    expect(changed.collections[0]!.title).toBe('Nouveau nom');
    expect(changed.collections[0]!.items[0]!.id).not.toBe(oldId);
    expect(current.collections[0]!.items).toHaveLength(2);
    expect(changed.history[0]).toBe(session);
    expect(changed.collections[0]!.createdAt).toBe(collection.createdAt);
  });

  it('provides readable validation errors for missing titles and empty vocabulary', () => {
    expect(() => addCollection(emptyLibrary, ' ', rows())).toThrow('1 à 100 caractères');
    expect(() => canonicalItems([{ ...rows()[0]!, expression: '' }])).toThrow('expression 1');
    expect(() => canonicalItems([])).toThrow('1 à 500');
  });

  it('validates backups before restoring and rejects duplicate identities', () => {
    expect(() => parseLibraryBackup('{invalid')).toThrow('invalide');
    expect(() => parseLibraryBackup(JSON.stringify({ ...emptyLibrary, version: 2 }))).toThrow(
      'invalide',
    );
    const backup = library();
    backup.collections.push(backup.collections[0]!);
    expect(() => parseLibraryBackup(JSON.stringify(backup))).toThrow('en double');
    const session = completedSessionFixture({ mode: 'local' });
    expect(() =>
      parseLibraryBackup(JSON.stringify({ ...emptyLibrary, history: [session, session] })),
    ).toThrow('en double');
    expect(() => parseLibraryBackup('한'.repeat(4_000_000))).toThrow('10 Mo');
  });

  it('merges additively, skipping duplicates and remapping colliding collection IDs', () => {
    const current = library();
    const source = library();
    source.collections[0]!.id = current.collections[0]!.id;
    const changed = {
      ...source.collections[0]!,
      items: [{ ...rows()[0]!, meaning: 'autre sens' }],
    };
    const incoming = parseLibraryBackup(JSON.stringify({ ...source, collections: [changed] }));
    const merged = mergeLibraryBackup(current, incoming);
    expect(merged.collections).toHaveLength(2);
    expect(merged.collections[1]!.id).not.toBe(current.collections[0]!.id);
    expect(merged.collections[0]).toEqual(current.collections[0]);
    expect(
      mergeLibraryBackup(current, parseLibraryBackup(JSON.stringify(current))).collections,
    ).toHaveLength(1);
    expect(current.collections).toHaveLength(1);
  });

  it('does not overwrite newer session history during a backup merge', () => {
    const current = library();
    const session = completedSessionFixture({ mode: 'local', revision: 8 });
    current.history.push(session);
    const restored = completedSessionFixture({ mode: 'local', revision: 4 });
    const merged = mergeLibraryBackup(current, { ...emptyLibrary, history: [restored] });
    expect(merged.history[0]!.revision).toBe(8);
  });

  it('leaves current data intact when a merge would exceed collection capacity', () => {
    const current = library();
    const template = current.collections[0]!;
    current.collections = Array.from({ length: 30 }, (_, index) => ({
      ...template,
      id: crypto.randomUUID(),
      items: [{ ...template.items[0]!, meaning: `sens ${index}` }],
    }));
    const before = JSON.stringify(current);
    expect(() => mergeLibraryBackup(current, library())).toThrow('30 collections');
    expect(JSON.stringify(current)).toBe(before);
  });

  it('excludes live account conversations from an anonymous backup and local history', () => {
    const local = completedSessionFixture({ mode: 'local' });
    const live = completedSessionFixture({ id: crypto.randomUUID(), mode: 'live' });
    const backup = parseLibraryBackup(JSON.stringify({ ...emptyLibrary, history: [local, live] }));
    expect(backup.history.map((entry) => entry.id)).toEqual([local.id]);
    expect(saveCompletedSession(backup, live)).toBe(backup);
    const invalidated = { ...local, feedback: undefined, status: 'active' as const, revision: 5 };
    expect(saveCompletedSession(backup, invalidated).history).toEqual([invalidated]);
  });

  it('never displays a previous account snapshot from anonymous localStorage', () => {
    const stored = JSON.stringify({ ...library(), history: [completedSessionFixture()] });
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => stored), setItem });
    expect(readLibrary().history).toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('preserves unreadable local storage and does not write invalid state', () => {
    const setItem = vi.fn();
    const getItem = vi.fn(() => '{broken');
    vi.stubGlobal('localStorage', { getItem, setItem });
    expect(() => readLibrary()).toThrow('Téléchargez leur copie');
    expect(getItem).toHaveBeenCalledWith(storageKey);
    expect(() => writeLibrary({ ...emptyLibrary, version: 9 } as never)).toThrow();
    expect(setItem).not.toHaveBeenCalled();
  });
});
