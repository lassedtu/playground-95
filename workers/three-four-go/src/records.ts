import { DurableObject } from "cloudflare:workers";

import type { Env } from "./env";

/**
 * The global records (top times per track). Declared now so the first
 * deploy creates it; filled in with step 16 of the plan.
 */
export class Records extends DurableObject<Env> {}
