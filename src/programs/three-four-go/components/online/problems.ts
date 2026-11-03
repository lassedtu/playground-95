import type { OnlineProblem } from "../../lib/use-online";

/** What to tell the player when something online goes wrong. */
export function problemText(problem: OnlineProblem) {
  switch (problem.kind) {
    case "lost":
      return "Lost the connection to the lobby.";
    case "server":
      switch (problem.problem) {
        case "busy":
          return "The race server is busy today. Try again tomorrow.";
        case "not-allowed":
          return `The race server doesn't accept players from ${location.host}. (Add this address to ALLOWED_ORIGINS in the server's wrangler.jsonc and deploy it again.)`;
        case "bad-reply":
          return "The race server sent something odd. Try again in a moment.";
        case "unreachable":
          return "Couldn't reach the race server. Check your connection and try again. (If it keeps happening, the server may have used up its free plays for today.)";
      }
      break;
    case "refused":
      switch (problem.reason) {
        case "full":
          return "This lobby is full.";
        case "racing":
          return "This race has started. Try again in a minute.";
        case "gone":
          return `There's no lobby with the code ${problem.code}. Check the code, or it may have closed.`;
        case "version":
          return "This lobby is on a newer version of 3-4-Go!. Reload the page to update.";
        case "password":
          return "Wrong password.";
      }
  }
}
