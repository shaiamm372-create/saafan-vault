import { NextResponse } from "next/server";
import { allowHasawi, HASAWI_TTS_MODEL, HASAWI_VOICE, HASAWI_VOICE_STYLE, hasawiAvailable, hasawiClient } from "@/lib/hasawi";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Hasawi's voice: turns his reply into speech (mp3). */
export async function POST(req: Request) {
  if (!hasawiAvailable()) return NextResponse.json({ error: "Hasawi is offline." }, { status: 503 });
  if (!allowHasawi(req, "speak", 50)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  let text: unknown;
  try { text = ((await req.json()) as { text?: unknown })?.text; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof text !== "string" || !text.trim() || text.length > 700) return NextResponse.json({ error: "Provide 1–700 characters." }, { status: 400 });
  try {
    const speech = await hasawiClient().audio.speech.create({
      model: HASAWI_TTS_MODEL,
      voice: HASAWI_VOICE,
      input: text.trim(),
      instructions: HASAWI_VOICE_STYLE,
      response_format: "mp3",
    });
    return new Response(speech.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch {
    console.error("[hasawi speak] failed");
    return NextResponse.json({ error: "Voice unavailable." }, { status: 502 });
  }
}
