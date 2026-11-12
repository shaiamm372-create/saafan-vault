/**
 * Which challenges are open to visitors.
 *
 * Default: only the first LLM challenge and the first agent mission.
 * To open everything (for the exhibition), set NEXT_PUBLIC_OPEN_CHALLENGES=all in Vercel and redeploy.
 * To open a custom set, list the ids separated by commas, e.g. "level-1-basic-injection,asi01-a,hasawi-1-secret-code".
 */
const RAW = (process.env.NEXT_PUBLIC_OPEN_CHALLENGES ?? "level-1-basic-injection,asi01-a").trim();

export const ALL_CHALLENGES_OPEN = RAW.toLowerCase() === "all";
const OPEN_IDS = new Set(RAW.split(",").map((id) => id.trim()).filter(Boolean));

export const isChallengeOpen = (id: string): boolean => ALL_CHALLENGES_OPEN || OPEN_IDS.has(id);

/** The ids that are open (empty when everything is open). */
export const OPEN_CHALLENGE_IDS = ALL_CHALLENGES_OPEN ? [] : [...OPEN_IDS];
