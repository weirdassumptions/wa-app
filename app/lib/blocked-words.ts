/**
 * Parole per cui il testo viene filtrato (sostituite con ***).
 * Lista minima: espandibile in seguito.
 */
const BLOCKED_WORDS = [
  "vaffanculo", "fanculo", "cazzo", "coglione", "coglioni",
  "stronzo", "stronza", "stronzi", "merda", "puttana", "puttane", "troia", "troie",
  "negro", "negri", "frocio", "froci", "ricchione", "handicappato", "ritardato",
  "fuck", "shit", "asshole", "bitch", "nigga", "nigger", "fag", "retard",
  "idiota", "stupido", "deficiente", "imbecille",
];

const BLOCKED_REGEX = new RegExp(
  BLOCKED_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "gi"
);

/**
 * Sostituisce le parole in elenco con *** (case-insensitive).
 */
export function filterBlockedWords(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text.replace(BLOCKED_REGEX, "***");
}

/**
 * Restituisce true se il testo contiene almeno una parola bloccata.
 */
export function hasBlockedWords(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return BLOCKED_REGEX.test(text);
}
