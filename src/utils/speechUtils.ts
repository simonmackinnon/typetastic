export const SYMBOL_MAP: [RegExp, string][] = [
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

export function sanitizeForSpeech(text: string): string {
  let out = text;
  for (const [re, word] of SYMBOL_MAP) out = out.replace(re, word);
  return out.replace(/\s{2,}/g, ' ').trim();
}
