/**
 * Texts players can choose in the Text menu. Edit this list to choose which
 * texts are available; with none chosen, the test uses random words.
 *
 * Typographic quotes, dashes and ellipses are converted to plain keyboard
 * characters automatically, and whitespace is collapsed.
 */
export type TypingText = {
  /** Stable id, used to remember the choice and best results. */
  id: string;
  title: string;
  text: string;
};

const RAW_TEXTS: readonly TypingText[] = [
  {
    id: "alice",
    title: "Alice in Wonderland",
    text: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice, "without pictures or conversations?"`,
  },
  {
    id: "minecraft-poem",
    title: "Minecraft End Poem",
    text: `I see the player you mean. lassedtu? Yes. Take care. It has reached a higher level now. It can read our thoughts. That doesn't matter. It thinks we are part of the game. I like this player. It played well. It did not give up. It is reading our thoughts as though they were words on a screen.`,
  },
  {
    id: "bee-movie",
    title: "The Bee Movie Script",
    text: `According to all known laws of aviation, there is no way a bee should be able to fly. Its wings are too small to get its fat little body off the ground. The bee, of course, flies anyway because bees don't care what humans think is impossible. Yellow, black. Yellow, black. Yellow, black. Yellow, black.`,
  },
  {
    id: "house-quotes",
    title: "Quotes from House",
    text: `You don't want to vaccinate your child? Would you like the coffin in froggy green or Firetruck red? Ah House, I've heard your name. Most people have, it's also a noun. Rational arguments don't usually work on religious people. Otherwise there would be no religious people.`,
  },
];

/** Makes a text typeable on any keyboard. */
export function normalizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

export const TEXTS: readonly TypingText[] = RAW_TEXTS.map((t) => ({ ...t, text: normalizeText(t.text) }));
