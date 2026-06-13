import { useCallback, useEffect, useRef, useState } from 'react';

const EL_KEY     = import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined;
const EL_VOICE   = import.meta.env.VITE_ELEVENLABS_VOICE_ID as string | undefined
                    ?? 'IKne3meq5aSn9XLyUdCD'; // Charlie — Australian male
const EL_MODEL   = 'eleven_flash_v2_5';         // lowest latency

const SYMBOL_MAP: [RegExp, string][] = [
  [/\\/g,  ' backslash '],
  [/\+/g,  ' plus '],
  [/;/g,   ' semicolon '],
  [/\//g,  ' slash '],
  [/=/g,   ' equals '],
  [/\[/g,  ' left bracket '],
  [/\]/g,  ' right bracket '],
  [/\|/g,  ' pipe '],
  [/\^/g,  ' caret '],
  [/~/g,   ' tilde '],
  [/`/g,   ' backtick '],
  [/_/g,   ' underscore '],
  [/\*/g,  ' asterisk '],
];

function sanitizeForSpeech(text: string): string {
  let out = text;
  for (const [re, word] of SYMBOL_MAP) out = out.replace(re, word);
  return out.replace(/\s{2,}/g, ' ').trim();
}

export function useSpeech() {
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  // Clean up audio on unmount
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

    // Stop anything already playing
    audioRef.current?.pause();
    audioRef.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(true);

    // ── ElevenLabs path ────────────────────────────────────────────────────
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

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
        audio.onerror = () => { setSpeaking(false); URL.revokeObjectURL(url); };

        try {
          await audio.play();
        } catch (playErr) {
          // Autoplay blocked — user must interact first; fail silently
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

    // ── Browser Web Speech fallback ─────────────────────────────────────────
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
