import { describe, expect, it } from 'vitest';
import { encodePcm16Wav } from '@/features/speaking/audio';
import { validateWav } from '@/server/providers/audio';

describe('browser-to-provider audio contract', () => {
  it.each([16000, 24000])(
    'produces a provider-valid mono PCM recording at %i Hz',
    async (sampleRate) => {
      const samples = new Float32Array(sampleRate / 2);
      // A small deterministic signal exercises real sample conversion without microphone access.
      for (let i = 0; i < samples.length; i++)
        samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.2;
      const wav = encodePcm16Wav(samples, sampleRate);
      const bytes = new Uint8Array(await wav.arrayBuffer());
      expect(wav.type).toBe('audio/wav');
      expect(validateWav(bytes)).toEqual({
        sampleRate,
        durationSeconds: 0.5,
        dataBytes: sampleRate,
      });
      expect(bytes.byteLength).toBe(44 + sampleRate);
    },
  );

  it('preserves sample polarity and clips overloads to signed 16-bit endpoints', async () => {
    const wav = encodePcm16Wav(new Float32Array([-2, -1, -0.5, 0, 0.5, 1, 2]));
    const view = new DataView(await wav.arrayBuffer());
    const decoded = Array.from({ length: 7 }, (_, index) => view.getInt16(44 + index * 2, true));
    expect(decoded).toEqual([-32768, -32768, -16384, 0, 16383, 32767, 32767]);
  });

  it('fits the maximum recording below the server upload limit', async () => {
    const wav = encodePcm16Wav(new Float32Array(30 * 24000));
    expect(wav.size).toBeLessThan(2_097_152);
    expect(validateWav(new Uint8Array(await wav.arrayBuffer())).durationSeconds).toBe(30);
    expect(() => encodePcm16Wav(new Float32Array(30 * 24000 + 1))).toThrow();
  });

  it('rejects unusable samples and unsupported formats instead of sending invalid audio', () => {
    expect(() => encodePcm16Wav(new Float32Array())).toThrow();
    expect(() => encodePcm16Wav(new Float32Array([0]), 44100)).toThrow();
    expect(() => encodePcm16Wav(new Float32Array([Number.NaN]))).toThrow();
    expect(() => encodePcm16Wav(new Float32Array([Number.POSITIVE_INFINITY]))).toThrow();
  });
});
