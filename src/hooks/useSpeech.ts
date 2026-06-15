import { useCallback, useEffect, useRef, useState } from 'react';
import { sanitizeForSpeech } from '../utils/speechUtils';
import audioManifest from '../data/audioManifest.json';

const EL_KEY     = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
const EL_VOICE   = import.meta.env.VITE_ELEVENLABS_VOICE_ID as string | undefined
                    ?? 'IKne3meq5aSn9XLyUdCD';
const EL_MODEL   = 'eleven_flash_v2_5';

const MANIFEST = audioManifest as Record<string, string>;

export { sanitizeForSpeech };

export function useSpeech() {
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => {
    audioRef.current?.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(async (rawText: string) => {
    const text = sanitizeForSpeech(rawText);

    audioRef.current?.pause();
    audioRef.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(true);

    // ── Pre-recorded static file ───────────────────────────────────────────
    const prerecordedUrl = MANIFEST[text];
    if (prerecordedUrl) {
      const audio = new Audio(prerecordedUrl);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      try {
        await audio.play();
      } catch (playErr) {
        if ((playErr as DOMException).name === 'NotAllowedError') {
          setSpeaking(false);
          return;
        }
        throw playErr;
      }
      return;
    }

    // ── ElevenLabs live path (dev / unrecognised phrases) ─────────────────
    if (EL_KEY) {
      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${EL_VOICE}/stream`,
          {
            method: 'POST',
            headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              model_id: EL_MODEL,
              voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
            }),
          },
        );
        if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);

        const blob  = await res.blob();
        const url   = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };

        try {
          await audio.play();
        } catch (playErr) {
          if ((playErr as DOMException).name === 'NotAllowedError') {
            setSpeaking(false);
            URL.revokeObjectURL(url);
            return;
          }
          throw playErr;
        }
        return;
      } catch (err) {
        console.warn('ElevenLabs TTS failed, falling back to browser speech', err);
        setSpeaking(false);
      }
    }

    // ── Browser Web Speech fallback ────────────────────────────────────────
    if (!('speechSynthesis' in window)) { setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate  = 0.88;
    u.pitch = 1.0;
    u.onend   = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, []);

  return { speak, stop, speaking, supported: true };
}
