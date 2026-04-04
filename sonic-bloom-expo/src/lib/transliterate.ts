
/**
 * Devanagari to Roman transliteration.
 * Converts Hindi/Marathi/Nepali Devanagari text to readable Roman script.
 */

// Consonants (क to ह + nukta forms)
const CONSONANTS: Record<string, string> = {
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v",
  "श": "sh", "ष": "sh", "स": "s", "ह": "h",
  // Nukta
  "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z",
  "ड़": "d", "ढ़": "dh", "फ़": "f",
  "ळ": "l",
};

// Independent vowels
const INDEPENDENT: Record<string, string> = {
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo",
  "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au",
  "ऍ": "e", "ऑ": "o",
};

// Dependent vowel signs (matras) + modifiers
const SIGNS: Record<string, string> = {
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo",
  "ृ": "ri", "ॄ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au",
  "ॅ": "e", "ॉ": "o",
  "ं": "n", "ः": "h", "ँ": "n",
  "्": "", // virama
};

// Devanagari digits
const DIGITS: Record<string, string> = {
  "०": "0", "१": "1", "२": "2", "३": "3", "४": "4",
  "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
};

const DEVANAGARI_START = 0x0900;
const DEVANAGARI_END = 0x097F;

function isDevanagari(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= DEVANAGARI_START && code <= DEVANAGARI_END;
}

function isDevanagariConsonant(ch: string | undefined): boolean {
  return ch !== undefined && CONSONANTS[ch] !== undefined;
}

function isDevanagariVowel(ch: string | undefined): boolean {
  return ch !== undefined && INDEPENDENT[ch] !== undefined;
}

/**
 * Transliterate Devanagari text to Roman script.
 *
 * Rules:
 * - Consonant alone → adds inherent "a" (क → ka)
 * - Consonant + virama → no inherent vowel (क् → k)
 * - Consonant + vowel sign → uses sign (की → kee)
 * - Consonant at end of Devanagari word → adds "a" (क → ka)
 * - Independent vowels used as-is (अ → a)
 */
export function transliterate(text: string): string {
  let result = "";
  const chars = [...text];
  const len = chars.length;

  for (let i = 0; i < len; i++) {
    const ch = chars[i];

    if (!isDevanagari(ch)) {
      result += ch;
      continue;
    }

    // Digit
    if (DIGITS[ch] !== undefined) {
      result += DIGITS[ch];
      continue;
    }

    // Independent vowel
    if (INDEPENDENT[ch] !== undefined) {
      result += INDEPENDENT[ch];
      continue;
    }

    // Vowel sign / modifier
    if (SIGNS[ch] !== undefined) {
      result += SIGNS[ch];
      continue;
    }

    // Consonant
    if (CONSONANTS[ch] !== undefined) {
      const roman = CONSONANTS[ch];
      const next = chars[i + 1];
      const next2 = chars[i + 2];

      result += roman;

      // If next is virama — halant, skip inherent 'a'
      if (next === "\u094D") {
        continue;
      }

      // If next is a vowel sign — it replaces inherent 'a'
      if (next && SIGNS[next] !== undefined && next !== "\u094D") {
        continue;
      }

      // If next is a Devanagari consonant/vowel — add inherent 'a'
      if (isDevanagariConsonant(next) || isDevanagariVowel(next)) {
        result += "a";
        continue;
      }

      // If next is virama at next2 (consonant + conjunct) — skip
      // Actually, consonant before non-Devanagari (space, punctuation, end)
      // Add inherent 'a' for end of Devanagari word
      if (!next || !isDevanagari(next)) {
        result += "a";
        continue;
      }
    }
  }

  return result;
}

/**
 * Check if text contains Devanagari characters.
 */
export function hasDevanagari(text: string): boolean {
  for (const ch of text) {
    if (isDevanagari(ch)) return true;
  }
  return false;
}

