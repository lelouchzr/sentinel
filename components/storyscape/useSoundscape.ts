"use client";
import { useEffect, useRef, useState } from "react";

/** A quiet procedural bed is created only after an explicit user gesture.
 * No autoplay, remote audio, microphone or browser permission is involved. */
export function useSoundscape(ambience?: string) {
  const [enabled, setEnabled] = useState(false),
    [error, setError] = useState("");
  const context = useRef<AudioContext | null>(null),
    filter = useRef<BiquadFilterNode | null>(null),
    tone = useRef<OscillatorNode | null>(null);
  useEffect(() => {
    if (filter.current && context.current)
      filter.current.frequency.setTargetAtTime(
        ambience === "rain" ? 650 : ambience === "stars" ? 140 : 280,
        context.current.currentTime,
        0.8,
      );
    if (tone.current && context.current)
      tone.current.frequency.setTargetAtTime(
        ambience === "stars" ? 130.81 : ambience === "steam" ? 164.81 : 146.83,
        context.current.currentTime,
        1,
      );
  }, [ambience]);
  useEffect(
    () => () => {
      void context.current?.close();
    },
    [],
  );
  async function toggle() {
    if (context.current) {
      await context.current.close();
      context.current = null;
      setEnabled(false);
      return;
    }
    try {
      const Audio = window.AudioContext;
      if (!Audio)
        throw new Error(
          "This browser does not support the soundscape.",
        );
      const ctx = new Audio();
      context.current = ctx;
      await ctx.resume();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const low = ctx.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = ambience === "rain" ? 650 : 280;
      filter.current = low;
      const gain = ctx.createGain();
      gain.gain.value = 0.045;
      noise.connect(low).connect(gain).connect(ctx.destination);
      noise.start();
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = ambience === "stars" ? 130.81 : 146.83;
      tone.current = oscillator;
      const toneGain = ctx.createGain();
      toneGain.gain.value = 0.012;
      oscillator.connect(toneGain).connect(ctx.destination);
      oscillator.start();
      setEnabled(true);
      setError("");
    } catch (e) {
      void context.current?.close();
      context.current = null;
      setEnabled(false);
      setError(
        e instanceof Error ? e.message : "Audio ambience is unavailable.",
      );
    }
  }
  return { enabled, error, toggle };
}
