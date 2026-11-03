import {
  CODE_ALPHABET,
  CODE_LENGTH,
  cleanSettings,
  DEFAULT_LOBBY,
  normalizeCode,
  PASSWORD_MAX,
} from "../../../src/programs/three-four-go/net/protocol";
import { directory, type Env, room } from "./env";

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

async function createLobby(request: Request, env: Env, origin: string | null) {
  const text = await request.text();
  if (text.length > BODY_MAX) return json({ error: "too-big" }, 413, origin);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return json({ error: "bad-request" }, 400, origin);
  }
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
    if (!allowedOrigin(origin, env)) return new Response("Forbidden", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });

    const parts = url.pathname.split("/").filter(Boolean);
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
