import type { Directory } from "./directory";
import type { Records } from "./records";
import type { Room } from "./room";

export interface Env {
  /** One per lobby, named by its code. */
  ROOMS: DurableObjectNamespace<Room>;
  /** A single one ("main"): the list of open lobbies. */
  DIRECTORY: DurableObjectNamespace<Directory>;
  /** A single one ("main"): the global records (step 16). */
  RECORDS: DurableObjectNamespace<Records>;
  /** Comma-separated origins allowed to connect; `*` matches anything within a part. */
  ALLOWED_ORIGINS: string;
}

export const directory = (env: Env) => env.DIRECTORY.get(env.DIRECTORY.idFromName("main"));
export const room = (env: Env, code: string) => env.ROOMS.get(env.ROOMS.idFromName(code));
