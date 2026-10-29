import { describe, expect, it } from 'vitest';
import {
  ImportError,
  MAX_IMPORT_BYTES,
  plainText,
  previewImport,
  vocabularyKey,
} from '@/features/imports/parser';

describe('vocabulary import boundary', () => {
  it('preserves Korean, BOM, CRLF and quoted comma/newline fields', () => {
    const result = previewImport(
      '\uFEFFexpression,meaning,example\r\n빌리다,"emprunter, louer","펜을\n빌려 주세요."',
      { exampleColumn: 2 },
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      expression: '빌리다',
      meaning: 'emprunter, louer',
      example: '펜을\n빌려 주세요.',
      sourceRow: 2,
    });
  });

  it('requires confirmation externally and returns plain editable drafts only', () => {
    const result = previewImport('충전기\tchargeur\n펜\tstylo', {
      source: 'tsv',
      hasHeader: false,
    });
    expect(result.rows.map((row) => row.expression)).toEqual(['충전기', '펜']);
    expect(result.rows[0]!.provenance).toEqual({
      expression: 'imported',
      meaning: 'imported',
      example: 'imported',
    });
    expect(result).not.toHaveProperty('confirmed');
  });

  it('supports explicit multi-column Anki mapping and excludes metadata', () => {
    const result = previewImport('#separator:tab\n#html:true\nchargeur\t<b>충전기</b>\texample', {
      source: 'anki',
      expressionColumn: 1,
      meaningColumn: 0,
      exampleColumn: 2,
    });
    expect(result.rows[0]).toMatchObject({
      expression: '충전기',
      meaning: 'chargeur',
      example: 'example',
    });
  });

  it('does not discard literal hashtag vocabulary from ordinary exports', () => {
    expect(previewImport('#하나\tun', { source: 'tsv' }).rows[0]!.expression).toBe('#하나');
  });

  it('strips script/style content and media markup, decodes text entities', () => {
    expect(
      plainText(
        '<script>alert(1)</script><style>body{}</style><b>안녕</b><br>salut &amp; &#xC694;',
      ),
    ).toBe('안녕\nsalut & 요');
    expect(plainText('texte<script>unclosed payload')).toBe('texte');
    expect(plainText('<img src=x onerror=alert(1)>bon')).toBe('bon');
  });

  it('deduplicates identical pairs but preserves distinct meanings', () => {
    const result = previewImport('눈\tœil\n눈\tneige\n눈\tœil', { source: 'tsv' });
    expect(result.rows.map((row) => row.meaning)).toEqual(['œil', 'neige']);
    expect(result.warnings.some((warning) => warning.includes('doublon'))).toBe(true);
    expect(vocabularyKey(result.rows[0]!)).not.toEqual(vocabularyKey(result.rows[1]!));
  });

  it('gives stable ids across reimport and normalizes decomposed Hangul', () => {
    const first = previewImport('가\taller', { source: 'tsv' }).rows[0]!;
    const second = previewImport('가\taller', { source: 'tsv' }).rows[0]!;
    expect(second.id).toBe(first.id);
  });

  it('rejects oversize input and row count rather than saving a truncated subset', () => {
    expect(() => previewImport('x'.repeat(MAX_IMPORT_BYTES + 1))).toThrow(ImportError);
    expect(() =>
      previewImport(Array.from({ length: 501 }, (_, i) => `mot${i}\tsens`).join('\n'), {
        source: 'tsv',
      }),
    ).toThrow('500');
  });

  it('reports bad rows and unsupported cloze content without inventing values', () => {
    const result = previewImport('expression\tmeaning\n정상\tvalide\n없음\t\n{{c1::답}}\tréponse', {
      source: 'anki',
      hasHeader: true,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.warnings).toHaveLength(2);
  });

  it('leaves columns available to recover an all-invalid mapping', () => {
    const result = previewImport('ko,fr,extra\n안녕,,salut', {
      hasHeader: true,
      expressionColumn: 0,
      meaningColumn: 1,
    });
    expect(result.rows).toEqual([]);
    expect(result.columns).toEqual(['ko', 'fr', 'extra']);
    expect(
      previewImport('ko,fr,extra\n안녕,,salut', {
        hasHeader: true,
        expressionColumn: 0,
        meaningColumn: 2,
      }).rows,
    ).toHaveLength(1);
  });

  it('reads the real FlashCardStudy exporter shape with reversible field mapping', () => {
    const fixture = JSON.stringify({
      name: 'Original fixture',
      source_lang: 'fr-FR',
      target_lang: 'ko-KR',
      cards: [
        {
          front: 'charger',
          back: '충전하다',
          front_sentence: 'Je charge mon téléphone.',
          back_sentence: '휴대폰을 충전해요.',
        },
      ],
    });
    const result = previewImport(fixture, {
      source: 'flashcardstudy',
      expressionColumn: 1,
      meaningColumn: 0,
      exampleColumn: 3,
    });
    expect(result.rows[0]).toMatchObject({
      expression: '충전하다',
      meaning: 'charger',
      example: '휴대폰을 충전해요.',
    });
    expect(result.warnings.join(' ')).toContain('fr-FR');
    expect(result.columns).toEqual(['front', 'back', 'front_sentence', 'back_sentence']);
  });

  it('rejects malformed JSON, malformed CSV and invalid mappings', () => {
    expect(() => previewImport('{"cards":', { source: 'flashcardstudy' })).toThrow('JSON');
    expect(() => previewImport('{"cards":[]}', { source: 'flashcardstudy' })).toThrow(
      'FlashCardStudy',
    );
    expect(() => previewImport('a,b\n"unterminated,b')).toThrow('guillemets');
    expect(() =>
      previewImport('가\taller', { source: 'tsv', expressionColumn: 0, meaningColumn: 0 }),
    ).toThrow('différentes');
  });
});
