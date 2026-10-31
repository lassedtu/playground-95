export type Answer = {
  text: string;
  kind: "yes" | "maybe" | "no";
};

/** The 20 classic answers: 10 yes, 5 non-committal, 5 no. */
export const ANSWERS: readonly Answer[] = [
  { text: "It is certain", kind: "yes" },
  { text: "It is decidedly so", kind: "yes" },
  { text: "Without a doubt", kind: "yes" },
  { text: "Yes, definitely", kind: "yes" },
  { text: "You may rely on it", kind: "yes" },
  { text: "As I see it, yes", kind: "yes" },
  { text: "Most likely", kind: "yes" },
  { text: "Outlook good", kind: "yes" },
  { text: "Yes", kind: "yes" },
  { text: "Signs point to yes", kind: "yes" },
  { text: "Reply hazy, try again", kind: "maybe" },
  { text: "Ask again later", kind: "maybe" },
  { text: "Better not tell you now", kind: "maybe" },
  { text: "Cannot predict now", kind: "maybe" },
  { text: "Concentrate and ask again", kind: "maybe" },
  { text: "Don't count on it", kind: "no" },
  { text: "My reply is no", kind: "no" },
  { text: "My sources say no", kind: "no" },
  { text: "Outlook not so good", kind: "no" },
  { text: "Very doubtful", kind: "no" },
];

/** A random answer, never the same one twice in a row. */
export function pickAnswer(previous: Answer | null, random = Math.random): Answer {
  const options = previous ? ANSWERS.filter((answer) => answer !== previous) : ANSWERS;
  return options[Math.floor(random() * options.length)];
}
