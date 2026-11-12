import { NextResponse } from "next/server";
import { toFile } from "openai";
import { allowHasawi, HASAWI_STT_MODEL, hasawiAvailable, hasawiClient } from "@/lib/hasawi";

export const runtime = "nodejs";
export const maxDuration = 30;
const headers = { "Cache-Control": "no-store" };
const MAX_BYTES = 3 * 1024 * 1024;

/** Turns the visitor's recorded voice into text. */
export async function POST(req: Request) {
  if (!hasawiAvailable()) return NextResponse.json({ error: "Hasawi is offline." }, { status: 503, headers });
  if (!allowHasawi(req, "listen", 40)) return NextResponse.json({ error: "حساوي تعب شوي 😅 جرّب بعد دقايق." }, { status: 429, headers });
  const type = req.headers.get("content-type") ?? "";
  const length = Number(req.headers.get("content-length") ?? 0);
  if (!type.startsWith("audio/")) return NextResponse.json({ error: "Send an audio recording." }, { status: 400, headers });
  if (length > MAX_BYTES) return NextResponse.json({ error: "Recording too long." }, { status: 413, headers });
  const audio = Buffer.from(await req.arrayBuffer());
  if (audio.byteLength === 0 || audio.byteLength > MAX_BYTES) return NextResponse.json({ error: "Recording is empty or too long." }, { status: 413, headers });
  const extension = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : type.includes("wav") ? "wav" : "webm";
  try {
    const result = await hasawiClient().audio.transcriptions.create({
      model: HASAWI_STT_MODEL,
      file: await toFile(audio, `voice.${extension}`, { type: type.split(";")[0] }),
      prompt: "محادثة مع روبوت اسمه حساوي في بوث نادي الأمن السيبراني بجامعة الملك فيصل في الأحساء. لهجة سعودية.",
    });
    return NextResponse.json({ text: result.text?.trim() ?? "" }, { headers });
  } catch {
    console.error("[hasawi listen] failed");
    return NextResponse.json({ error: "ما قدرت أسمعك زين، عيد مرة ثانية." }, { status: 502, headers });
  }
}
