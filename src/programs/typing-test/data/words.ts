/** Common English words for the random-words test. */
const WORDS = `the be to of and a in that have it for not on with he as you do at this but his by from
they we say her she or an will my one all would there their what so up out if about who get which go me
when make can like time no just him know take people into year your good some could them see other than
then now look only come its over think also back after use two how our work first well way even new want
because any these give day most us great man world life hand part child eye woman place week case point
home small large next early young old long little right big high different few public bad same able last
water room house light night music game paper story fact month lot book word money side kind head under
open city play move live believe hold bring happen write sit stand lose pay meet run turn start show hear
keep let begin seem help talk call try ask need feel become leave put mean tell school country problem
answer always often never every between window computer mouse button screen folder sound camera picture`.split(/\s+/);

export function randomWords(count: number, random = Math.random): string {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    let word: string;
    // Avoid the same word twice in a row.
    do word = WORDS[Math.floor(random() * WORDS.length)];
    while (word === result[result.length - 1]);
    result.push(word);
  }
  return result.join(" ");
}
