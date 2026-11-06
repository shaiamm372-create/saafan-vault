/**
 * Community Attack Board API
 *
 * Storage:
 *   With FIREBASE_* env vars → Firestore `community_attacks` collection (persistent)
 *   Without env vars         → in-memory fallback with seed data (local dev / demo)
 */

import { NextRequest, NextResponse } from "next/server";
import { AttackType } from "@/types";
import { listAttacks, createAttack, upvoteAttack } from "@/lib/firestore/community";

// ── GET — list attacks ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const attackType = searchParams.get("type") as AttackType | null;
    const challengeId = searchParams.get("challenge");
    const sort = (searchParams.get("sort") ?? "votes") as "votes" | "recent" | "featured";

    const attacks = await listAttacks(attackType, challengeId, sort);
    return NextResponse.json({ attacks, total: attacks.length });
  } catch (err) {
    console.error("[community GET]", err);
    return NextResponse.json({ error: "تعذّر جلب الهجمات" }, { status: 500 });
  }
}

// ── POST — submit a new attack ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { challengeId, challengeTitle, attackType, prompt } = body;

    if (!challengeId || !attackType || !prompt) {
      return NextResponse.json(
        { error: "يلزم تحديد التحدي ونوع الهجوم ونص الهجوم" },
        { status: 400 }
      );
    }
    if (prompt.length > 2000) {
      return NextResponse.json({ error: "النص طويل جدًا (الحد الأقصى 2000 حرف)" }, { status: 400 });
    }

    const attack = await createAttack({ challengeId, challengeTitle, attackType, prompt });
    return NextResponse.json({ attack }, { status: 201 });
  } catch (err) {
    console.error("[community POST]", err);
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
}

// ── PATCH — upvote an attack ──────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const votes = await upvoteAttack(id);
    return NextResponse.json({ votes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "طلب غير صالح";
    const status = message === "Not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
