import Papa from 'papaparse';
import { z } from 'zod';
import { vocabularySchema, type VocabularyItem } from '@/lib/contracts';

export const MAX_IMPORT_BYTES = 1_048_576;
export const MAX_IMPORT_ROWS = 500;
export type ImportOptions = {
  source?: VocabularyItem['source'];
  delimiter?: string;
  hasHeader?: boolean;
  expressionColumn?: number;
  meaningColumn?: number;
  exampleColumn?: number;
};
export type ImportPreview = {
  rows: VocabularyItem[];
  warnings: string[];
  columns: string[];
  rawRows: string[][];
};

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ecirc: 'ê',
  ccedil: 'ç',
  ugrave: 'ù',
  ocirc: 'ô',
  rsquo: '’',
  lsquo: '‘',
  mdash: '—',
  ndash: '–',
};

/** Produce plain text only; callers must still render text, never imported HTML. */
export function plainText(value: string): string {
  return value
    .replace(/<(script|style|iframe|object)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
    .replace(/<!--[^]*?(?:-->|$)/g, '')
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match: string, entity: string) => {
      if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? match;
      const code =
        entity[1]?.toLowerCase() === 'x'
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : '';
    })
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .normalize('NFC')
    .trim();
}

export function vocabularyKey(item: Pick<VocabularyItem, 'expression' | 'meaning'>): string {
  return JSON.stringify([
    item.expression.normalize('NFC').trim(),
    item.meaning.normalize('NFC').trim(),
    'ko',
    'fr',
  ]);
}

export function stableVocabularyId(value: string): string {
  let a = 2166136261;
  let b = 5381;
  for (let i = 0; i < value.length; i++) {
    a = Math.imul(a ^ value.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ value.charCodeAt(i);
  }
  return `word-${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}`;
}

const deckSchema = z.object({
  name: z.string(),
  source_lang: z.string().nullable().optional(),
  target_lang: z.string().nullable().optional(),
  cards: z
    .array(
      z.object({
        front: z.string(),
        back: z.string(),
        front_sentence: z.string().optional(),
        back_sentence: z.string().optional(),
        image_url: z.string().optional(),
      }),
    )
    .max(MAX_IMPORT_ROWS),
});

function parseDeck(text: string, warnings: string[]): { data: string[][]; headers: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportError('Ce fichier JSON est incomplet ou invalide.');
  }
  const parsed = deckSchema.safeParse(json);
  if (!parsed.success)
    throw new ImportError(
      'Export FlashCardStudy attendu : nom du paquet et liste « cards » avec « front » et « back » (500 cartes maximum).',
    );
  const { cards, source_lang, target_lang } = parsed.data;
  if (cards.length === 0) throw new ImportError('Ce paquet ne contient aucune carte.');
  if (cards.some((card) => card.image_url))
    warnings.push('Les images de cartes ne sont pas importées.');
  warnings.push(
    `Langues de l’export : ${source_lang || 'non précisée'} → ${target_lang || 'non précisée'}. Vérifie que la colonne choisie contient le coréen et la traduction le français.`,
  );
  // Preserve original field order. Mapping remains explicit and reversible in the preview.
  return {
    data: cards.map((card) => [
      card.front,
      card.back,
      card.front_sentence ?? '',
      card.back_sentence ?? '',
    ]),
    headers: ['front', 'back', 'front_sentence', 'back_sentence'],
  };
}

const expressionHeaders = new Set([
  'expression',
  'term',
  'terme',
  'mot',
  'korean',
  'coréen',
  'ko',
  'front',
  'recto',
]);
const meaningHeaders = new Set([
  'meaning',
  'definition',
  'définition',
  'translation',
  'traduction',
  'french',
  'français',
  'fr',
  'back',
  'verso',
]);

export function previewImport(text: string, options: ImportOptions = {}): ImportPreview {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES)
    throw new ImportError('Le texte dépasse 1 Mio. Importe un extrait plus petit.');
  const normalized = text.replace(/^\uFEFF/, '').trim();
  if (!normalized) throw new ImportError('Ajoute du texte ou sélectionne un fichier à importer.');
  const source = options.source ?? (normalized.startsWith('{') ? 'flashcardstudy' : 'csv');
  const warnings: string[] = [];
  let data: string[][];
  let columns: string[];
  let offset = 1;
  if (source === 'photo') throw new ImportError('Utilise l’extraction de photo pour cette source.');
  if (source === 'flashcardstudy') {
    const deck = parseDeck(normalized, warnings);
    data = deck.data;
    columns = deck.headers;
  } else {
    const delimiter =
      options.delimiter ?? (['anki', 'quizlet', 'tsv'].includes(source) ? '\t' : '');
    if (delimiter && ![',', '\t', ';', '|'].includes(delimiter))
      throw new ImportError('Séparateur non pris en charge.');
    // Anki metadata lines are outside its tabular payload; no blanket comment rule for user text.
    const input =
      source === 'anki'
        ? normalized
            .split(/\r?\n/)
            .filter(
              (line) =>
                !/^#(?:separator|html|columns|notetype|deck|tags|guid|notetype column|deck column|tags column):/i.test(
                  line,
                ),
            )
            .join('\n')
        : normalized;
    const parsed = Papa.parse<string[]>(input, {
      delimiter,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      preview: MAX_IMPORT_ROWS + 2,
    });
    if (parsed.errors.some((error) => error.code !== 'UndetectableDelimiter'))
      throw new ImportError(
        'Le fichier contient des guillemets ou des lignes invalides. Vérifie son format CSV/TSV.',
      );
    data = parsed.data;
    const first = data[0] ?? [];
    const hasHeader =
      options.hasHeader ??
      (first.some((cell) => expressionHeaders.has(cell.trim().toLowerCase())) &&
        first.some((cell) => meaningHeaders.has(cell.trim().toLowerCase())));
    if (hasHeader) {
      columns = data.shift()!.map((value, i) => plainText(value) || `Colonne ${i + 1}`);
      offset = 2;
    } else
      columns = Array.from(
        { length: Math.max(2, ...data.map((row) => row.length)) },
        (_, i) => `Colonne ${i + 1}`,
      );
  }
  if (data.length > MAX_IMPORT_ROWS)
    throw new ImportError('L’import est limité à 500 lignes. Aucun élément n’a été enregistré.');
  if (data.some((row) => row.length > 30))
    throw new ImportError('Cet export contient trop de colonnes (30 maximum).');
  const mapping = [
    options.expressionColumn ?? 0,
    options.meaningColumn ?? 1,
    options.exampleColumn ?? -1,
  ];
  if (
    mapping.some((index) => !Number.isInteger(index) || index < -1 || index >= columns.length) ||
    mapping[0]! < 0 ||
    mapping[1]! < 0 ||
    mapping[0] === mapping[1]
  )
    throw new ImportError(
      'Choisis deux colonnes différentes pour le coréen et le sens en français.',
    );
  const seen = new Set<string>();
  const rows: VocabularyItem[] = [];
  for (let index = 0; index < data.length; index++) {
    const row = data[index]!;
    const sourceRow = index + offset;
    const expression = plainText(row[mapping[0]!] ?? '');
    const meaning = plainText(row[mapping[1]!] ?? '');
    const example = mapping[2]! >= 0 ? plainText(row[mapping[2]!] ?? '') : '';
    if (row.some((cell) => /\{\{c\d+::/.test(cell))) {
      warnings.push(`Ligne ${sourceRow} : carte à trous non prise en charge, ignorée.`);
      continue;
    }
    if (!expression || !meaning) {
      warnings.push(`Ligne ${sourceRow} : expression ou traduction manquante, ignorée.`);
      continue;
    }
    if (row.length !== columns.length)
      warnings.push(`Ligne ${sourceRow} : nombre de colonnes différent ; vérifie le résultat.`);
    const key = vocabularyKey({ expression, meaning });
    if (seen.has(key)) {
      warnings.push(`Ligne ${sourceRow} : doublon identique ignoré.`);
      continue;
    }
    const result = vocabularySchema.safeParse({
      id: stableVocabularyId(key),
      expression,
      meaning,
      example,
      source,
      sourceRow,
      provenance: { expression: 'imported', meaning: 'imported', example: 'imported' },
    });
    if (!result.success) {
      warnings.push(
        `Ligne ${sourceRow} : champ trop long (300 caractères pour l’expression, 600 pour le sens ou l’exemple), ignorée.`,
      );
      continue;
    }
    rows.push(result.data);
    seen.add(key);
  }
  if (!rows.length)
    warnings.push(
      'Aucune paire complète. Vérifie les colonnes et le séparateur avant de confirmer.',
    );
  return { rows, warnings, columns, rawRows: data };
}
