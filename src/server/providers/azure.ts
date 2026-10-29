import 'server-only';
import { assertAIEnabled, providerRequest, readBoundedBody, requiredSetting } from './http';
import { ProviderError, type ProviderResult } from './types';

export function escapeXml(text: string): string {
  return text.replace(
    /[<>&"']/g,
    (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!,
  );
}

export async function synthesizeSpeech(text: string): Promise<ProviderResult<Uint8Array>> {
  assertAIEnabled();
  if (!text.trim() || text.length > 600 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
    throw new ProviderError(
      'INVALID_SPEECH_TEXT',
      'La phrase à lire doit contenir entre 1 et 600 caractères.',
      400,
    );
  }
  const key = requiredSetting('AZURE_SPEECH_KEY');
  const region = requiredSetting('AZURE_SPEECH_REGION');
  if (!/^[a-z][a-z0-9]{1,30}$/.test(region))
    throw new ProviderError(
      'INVALID_SPEECH_REGION',
      'La région Azure configurée est invalide.',
      503,
    );
  const voice = process.env.AZURE_SPEECH_VOICE || 'ko-KR-SunHiNeural';
  if (!/^ko-KR-[A-Za-z0-9]+Neural$/.test(voice))
    throw new ProviderError(
      'INVALID_SPEECH_VOICE',
      'Choisissez une voix coréenne Azure valide.',
      503,
    );
  const started = Date.now();
  const response = await providerRequest(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'language-speaking-app',
      },
      body: `<speak version="1.0" xml:lang="ko-KR"><voice name="${escapeXml(voice)}">${escapeXml(text)}</voice></speak>`,
    },
    25_000,
  );
  const data = await readBoundedBody(response, 1_048_576);
  if (!data.byteLength)
    throw new ProviderError(
      'EMPTY_SPEECH_RESPONSE',
      'La synthèse vocale a renvoyé un fichier vide.',
      502,
      true,
    );
  return {
    data,
    usage: {
      provider: 'azure',
      model: voice,
      operation: 'speech',
      requestId: response.headers.get('x-requestid') || undefined,
      characters: [...text].length,
      latencyMs: Date.now() - started,
    },
  };
}
