import 'server-only';
import { ProviderError } from './types';

export type ValidatedWav = {
  sampleRate: 16000 | 24000;
  durationSeconds: number;
  dataBytes: number;
};

export function validateWav(data: Uint8Array): ValidatedWav {
  const reject = (): never => {
    throw new ProviderError(
      'INVALID_AUDIO',
      'Utilisez un enregistrement WAV mono PCM 16 bits de 30 secondes maximum.',
      400,
    );
  };
  if (data.byteLength < 44 || data.byteLength > 2_097_152) return reject();
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const fourCC = (offset: number) => String.fromCharCode(...data.subarray(offset, offset + 4));
  if (
    fourCC(0) !== 'RIFF' ||
    fourCC(8) !== 'WAVE' ||
    view.getUint32(4, true) + 8 !== data.byteLength
  )
    return reject();
  let format: { rate: number; byteRate: number } | undefined;
  let audioBytes: number | undefined;
  let offset = 12;
  while (offset + 8 <= data.byteLength) {
    const tag = fourCC(offset);
    const length = view.getUint32(offset + 4, true);
    const start = offset + 8;
    const end = start + length;
    if (end > data.byteLength) return reject();
    if (tag === 'fmt ') {
      if (
        format ||
        length < 16 ||
        view.getUint16(start, true) !== 1 ||
        view.getUint16(start + 2, true) !== 1 ||
        view.getUint16(start + 14, true) !== 16
      )
        return reject();
      const rate = view.getUint32(start + 4, true);
      const byteRate = view.getUint32(start + 8, true);
      if (
        (rate !== 16000 && rate !== 24000) ||
        byteRate !== rate * 2 ||
        view.getUint16(start + 12, true) !== 2
      )
        return reject();
      format = { rate, byteRate };
    } else if (tag === 'data') {
      if (audioBytes !== undefined || !length || length % 2 !== 0) return reject();
      audioBytes = length;
    }
    offset = end + (length % 2);
  }
  if (!format || audioBytes === undefined || offset !== data.byteLength) return reject();
  const durationSeconds = audioBytes / format.byteRate;
  if (durationSeconds <= 0 || durationSeconds > 30) return reject();
  return { sampleRate: format.rate as 16000 | 24000, durationSeconds, dataBytes: audioBytes };
}
