import {
  CODE_ALPHABET,
  CODE_LENGTH,
  cleanSettings,
  DEFAULT_LOBBY,
  normalizeCode,
  PASSWORD_MAX,
} from "../../../src/programs/three-four-go/net/protocol";
import { directory, type Env, records, room } from "./env";

export { Directory } from "./directory";
export { Records } from "./records";
export { Room } from "./room";

/** Biggest request body accepted (a new lobby's settings), in bytes. */
const BODY_MAX = 2048;
/** Tries at finding a free code before giving up. */
const CODE_TRIES = 6;

/** Whether a browser on `origin` may use the server. No Origin = not a browser (a script): allowed. */
function allowedOrigin(origin: string | null, env: Env) {
  if (origin === null) return true;
  return env.ALLOWED_ORIGINS.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      const pattern = entry.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^.:/]*");
      return new RegExp(`^${pattern}$`).test(origin);
    });
}

function cors(origin: string | null): Record<string, string> {
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      }
    : {};
}

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** A small JSON request body, or null if it's too big or not JSON. */
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const text = await request.text();
  if (text.length > BODY_MAX) return null;
  try {
    const body: unknown = JSON.parse(text);
    return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function createLobby(request: Request, env: Env, origin: string | null) {
  const body = await readBody(request);
  if (!body) return json({ error: "bad-request" }, 400, origin);
  const settings = cleanSettings(body, DEFAULT_LOBBY);
  const password = typeof body.password === "string" ? body.password.slice(0, PASSWORD_MAX) : "";
  for (let i = 0; i < CODE_TRIES; i++) {
    const code = randomCode();
    if (await room(env, code).create(code, settings, password)) return json({ code }, 201, origin);
  }
  return json({ error: "no-code" }, 503, origin);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    // Readable by the refused site (with CORS headers), so the game can say why.
    if (!allowedOrigin(origin, env)) return json({ error: "origin" }, 403, origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });

    const parts = url.pathname.split("/").filter(Boolean);

    // /records (POST a finished race) and /records/:track (its boards)
    if (parts[0] === "records") {
      if (parts.length === 1 && request.method === "POST") {
        const body = await readBody(request);
        // Only used to limit how often one address submits; not stored.
        const address = request.headers.get("CF-Connecting-IP") ?? "unknown";
        const places = body ? await records(env).submit(body, address) : null;
        return places ? json(places, 200, origin) : json({ error: "refused" }, 400, origin);
      }
      if (parts.length === 2 && request.method === "GET") {
        const boards = await records(env).boards(decodeURIComponent(parts[1]));
        return boards ? json(boards, 200, origin) : json({ error: "not-found" }, 404, origin);
      }
      return json({ error: "not-found" }, 404, origin);
    }

    if (parts[0] !== "lobbies") return json({ error: "not-found" }, 404, origin);

    // /lobbies
    if (parts.length === 1) {
      if (request.method === "GET") return json(await directory(env).list(), 200, origin);
      if (request.method === "POST") return createLobby(request, env, origin);
      return json({ error: "method" }, 405, origin);
    }

    // /lobbies/:code/socket
    const code = normalizeCode(parts[1] ?? "");
    if (parts.length === 3 && parts[2] === "socket" && code && request.method === "GET") {
      if (request.headers.get("Upgrade") !== "websocket") return json({ error: "upgrade" }, 426, origin);
      return room(env, code).fetch(request);
    }
    return json({ error: "not-found" }, 404, origin);
  },
} satisfies ExportedHandler<Env>;
