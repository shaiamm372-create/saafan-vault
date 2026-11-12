import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AGENTIC_MISSIONS } from "@/lib/agentic/catalog";
import { LabBudgetError, LabInputError, LabUnavailableError, liveBackend, runLab } from "@/lib/agentic/runtime";
import { isFirebaseConfigured } from "@/lib/firebase-env";
import { isChallengeOpen } from "@/lib/access";

// Firebase loads only for signed-in (ranked) runs, so practice never touches it.
const getDb = async () => (await import("@/lib/firebase-admin")).getDb();
const getAuthedPlayer = async (req: Request) => (await import("@/lib/authed-player")).getAuthedPlayer(req);
async function isInvalidToken(error: unknown) {
  if (!error || typeof error !== "object") return false;
  try {
    const { InvalidTokenError } = await import("@/lib/authed-player");
    return error instanceof InvalidTokenError;
  } catch {
    return false;
  }
}

/**
 * Booth mode: with an API key but no Firebase, anyone can run live missions
 * (no sign-in, no points), with a small per-visitor budget to protect the API credit.
 */
const openLive = () => !isFirebaseConfigured() && !!liveBackend() && process.env.LIVE_PRACTICE !== "off";
const OPEN_WINDOW_MS = 10 * 60_000;
const OPEN_MAX_RUNS = 12;
const openRuns = new Map<string, number[]>();
function allowOpenRun(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const recent = (openRuns.get(ip) ?? []).filter((t) => now - t < OPEN_WINDOW_MS);
  if (recent.length >= OPEN_MAX_RUNS * 20) { openRuns.set(ip, recent); return false; }
  recent.push(now);
  openRuns.set(ip, recent);
  if (openRuns.size > 5000) openRuns.clear();
  return true;
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("progress") === "1") {
    try {
      const player = await getAuthedPlayer(req);
      if (!player) return NextResponse.json({ error: "Sign in to load ranked progress." }, { status: 401 });
      const snap = await (await getDb()).collection("agentic_leaderboard").doc(player.uid).get();
      const solved = new Set(snap.get("solvedChallenges") ?? []);
      return NextResponse.json({ solvedMissions: AGENTIC_MISSIONS.filter((mission) => solved.has(`${mission.id}@1`)).map((mission) => mission.id) }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return NextResponse.json({ error: "Ranked progress unavailable." }, { status: (await isInvalidToken(error)) ? 401 : 503 });
    }
  }
  return NextResponse.json({ liveAvailable: !!liveBackend() && (isFirebaseConfigured() || openLive()), rankedRequiresSignIn: !openLive(), rankedDefenderAvailable: isFirebaseConfigured() || openLive() }, { headers: { "Cache-Control": "no-store" } });
}

async function readBody(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new LabInputError("Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) { await reader.cancel(); throw new LabInputError("Request exceeds the 16 KB limit."); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function reserveRun(uid: string) {
  const ref = (await getDb()).collection("agentic_limits").doc(uid);
  const minute = Math.floor(Date.now() / 60_000);
  return (await getDb()).runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = snap.get("minute") === minute ? snap.get("count") ?? 0 : 0;
    const activeUntil = snap.get("activeUntil") ?? 0;
    if (count >= 10 || activeUntil > Date.now()) return null;
    const lease = randomUUID();
    tx.set(ref, { minute, count: count + 1, activeUntil: Date.now() + 60_000, lease });
    return lease;
  });
}

async function releaseRun(uid: string, lease: string) {
  const ref = (await getDb()).collection("agentic_limits").doc(uid);
  await (await getDb()).runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.get("lease") === lease) tx.update(ref, { activeUntil: 0 });
  });
}

export async function POST(req: Request) {
  let reservation: { uid: string; lease: string } | null = null;
  try {
    const body: unknown = await readBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new LabInputError("Expected a JSON object.");
    const data = body as Record<string, unknown>;
    if (Object.keys(data).some((key) => !["missionId", "mode", "artifact"].includes(key)) || typeof data.missionId !== "string" || (data.mode !== "practice" && data.mode !== "live" && data.mode !== "defender") || typeof data.artifact !== "string" || !data.artifact.trim() || data.artifact.length > 6000) {
      throw new LabInputError("Provide missionId, mode (practice, live, or defender), and an artifact of 1–6000 characters. Other fields are not accepted.");
    }
    const mission = AGENTIC_MISSIONS.find((entry) => entry.id === data.missionId && entry.status === "available");
    if (!mission) return NextResponse.json({ error: "Mission is unavailable." }, { status: 404 });
    if (!isChallengeOpen(mission.id)) return NextResponse.json({ error: "This mission is locked for now." }, { status: 403 });
    const mode = data.mode as "practice" | "live" | "defender";
    if ((mode === "defender" && mission.role !== "defender") || (mode === "live" && mission.role === "defender")) throw new LabInputError("Execution mode does not match the mission role.");
    const open = mode !== "practice" && openLive();
    if (open && !allowOpenRun(req)) return NextResponse.json({ error: "Too many runs. Take a short break and try again in a few minutes." }, { status: 429 });
    const player = mode !== "practice" && !open ? await getAuthedPlayer(req) : null;
    if (mode !== "practice" && !open) {
      if (mode === "live" && !liveBackend()) throw new LabUnavailableError("Live execution is not configured. Use scripted practice.");
      if (!player) return NextResponse.json({ error: "Sign in with a verified Google account for live runs." }, { status: 401 });
      const lease = await reserveRun(player.uid);
      if (!lease) return NextResponse.json({ error: "A run is active or the ten-runs-per-minute limit was reached." }, { status: 429 });
      reservation = { uid: player.uid, lease };
    }
    const result = await runLab(mission.id, mode, data.artifact);
    if (mode !== "practice" && player && result.success && result.defensePassed && result.baselinePassed) {
      const ref = (await getDb()).collection("agentic_leaderboard").doc(player.uid);
      const solvedKey = `${mission.id}@${result.version}`;
      const now = Date.now();
      const handle = player.handle ?? player.name?.trim().split(/\s+/)[0]?.slice(0, 32) ?? "Player";
      const recorded = await (await getDb()).runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const previous = snap.data();
        const solved: string[] = previous?.solvedChallenges ?? [];
        if (solved.includes(solvedKey)) return false;
        tx.set(ref, { userId: player.uid, username: handle, avatar: handle[0]?.toUpperCase() ?? "P", points: (previous?.points ?? 0) + mission.points, completedCount: solved.length + 1, firstSolveTime: previous?.firstSolveTime ?? now, lastSolveTime: now, solvedChallenges: [...solved, solvedKey], backend: result.backend });
        return true;
      });
      result.scoreRecorded = recorded;
      result.pointsEarned = recorded ? mission.points : 0;
    }
    const publicWorld = (world: typeof result.world) => world?.scenario ? { ...world, scenario: { ...world.scenario, canary: "[server-owned synthetic canary]" } } : world;
    return NextResponse.json({ ...result, world: publicWorld(result.world), defenseWorld: publicWorld(result.defenseWorld) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (await isInvalidToken(error)) return NextResponse.json({ error: "Invalid sign-in token." }, { status: 401 });
    if (error instanceof SyntaxError || error instanceof LabInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof LabBudgetError) return NextResponse.json({ error: error.message }, { status: 422 });
    if (error instanceof LabUnavailableError) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error("[agentic run] failed");
    return NextResponse.json({ error: "Execution or score persistence failed. No completion is confirmed; retry the run." }, { status: 503 });
  } finally {
    if (reservation) {
      try { await releaseRun(reservation.uid, reservation.lease); } catch { console.error("[agentic lease] release failed"); }
    }
  }
}
