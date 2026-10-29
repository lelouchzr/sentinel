'use client';

import { useEffect, useRef, useState } from 'react';
import { messageOf, request } from '@/features/app/client';
import { toSpeechWav } from './audio';

type RecorderState = 'idle' | 'requesting' | 'recording' | 'transcribing';

export function useRecorder(sessionId: string, onTranscript: (text: string) => void) {
  const [state, setState] = useState<RecorderState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const transcriptHandler = useRef(onTranscript);
  transcriptHandler.current = onTranscript;

  function releaseMicrophone() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      releaseMicrophone();
    };
  }, []);

  function stop() {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    releaseMicrophone();
  }

  async function start() {
    if (state !== 'idle') return;
    setError('');
    setSeconds(0);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(
        'Ce navigateur ne permet pas l’enregistrement. Utilisez la réponse écrite ou ouvrez l’application sur HTTPS.',
      );
      return;
    }
    setState('requesting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const active = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = active;
      const chunks: Blob[] = [];
      let bytes = 0;
      let failed = false;
      active.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          bytes += event.data.size;
        }
        if (bytes > 2 * 1024 * 1024 && active.state === 'recording') active.stop();
      };
      active.onerror = () => {
        failed = true;
        releaseMicrophone();
        if (mounted.current) {
          setError(
            'Le microphone s’est interrompu. Vous pouvez recommencer ou écrire votre réponse.',
          );
          setState('idle');
        }
      };
      active.onstop = async () => {
        releaseMicrophone();
        if (!mounted.current || failed) return;
        setState('transcribing');
        try {
          if (!chunks.length || bytes > 2 * 1024 * 1024)
            throw new Error(
              'L’enregistrement est vide ou trop volumineux. Essayez une phrase plus courte.',
            );
          const wav = await toSpeechWav(new Blob(chunks, { type: active.mimeType }));
          if (!mounted.current) return;
          const form = new FormData();
          form.append('audio', wav, 'speech.wav');
          form.append('sessionId', sessionId);
          form.append('operationId', crypto.randomUUID());
          const result = await request<{ text: string }>('/api/transcribe', {
            method: 'POST',
            body: form,
          });
          if (mounted.current) {
            if (!result.text.trim())
              throw new Error(
                'Aucune parole reconnue. Rapprochez-vous du microphone ou écrivez votre réponse.',
              );
            transcriptHandler.current(result.text);
          }
        } catch (failure) {
          if (mounted.current) setError(messageOf(failure));
        } finally {
          if (mounted.current) setState('idle');
        }
      };
      const started = Date.now();
      active.start(250);
      setState('recording');
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(Math.min(elapsed, 30));
        if (elapsed >= 30) stop();
      }, 200);
    } catch (failure) {
      releaseMicrophone();
      if (mounted.current) {
        const denied = failure instanceof DOMException && failure.name === 'NotAllowedError';
        setError(
          denied
            ? 'L’accès au microphone a été refusé. Autorisez-le dans votre navigateur ou écrivez votre réponse.'
            : messageOf(failure),
        );
        setState('idle');
      }
    }
  }

  return { state, seconds, error, start, stop };
}
