/** Convert the browser's recording into the mono PCM16 WAV expected by Meta ASR. */
export async function toSpeechWav(recording: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await recording.arrayBuffer());
    if (!Number.isFinite(decoded.duration) || decoded.duration <= 0)
      throw new Error('L’enregistrement est vide.');
    // Timer scheduling may add a few milliseconds; keep the submitted clip within 30 seconds.
    const length = Math.min(Math.ceil(decoded.duration * 24000), 30 * 24000);
    const offline = new OfflineAudioContext(1, length, 24000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodePcm16Wav(rendered.getChannelData(0), 24000);
  } finally {
    await context.close();
  }
}

export function encodePcm16Wav(samples: Float32Array, sampleRate = 24000): Blob {
  if (!samples.length || ![16000, 24000].includes(sampleRate) || samples.length > sampleRate * 30)
    throw new Error('Format ou durée audio invalide.');
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) throw new Error('Échantillon audio invalide.');
    const value = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}
