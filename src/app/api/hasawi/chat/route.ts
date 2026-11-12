import { NextResponse } from "next/server";
import { allowHasawi, HASAWI_CHAT_MODEL, HASAWI_GREETING, HASAWI_SYSTEM_PROMPT, hasawiAvailable, hasawiClient } from "@/lib/hasawi";

export const runtime = "nodejs";
export const maxDuration = 30;
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  return NextResponse.json({ available: hasawiAvailable(), greeting: HASAWI_GREETING }, { headers });
}

type Turn = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  if (!hasawiAvailable()) return NextResponse.json({ error: "Hasawi is offline." }, { status: 503, headers });
  if (!allowHasawi(req, "chat", 40)) return NextResponse.json({ error: "حساوي تعب شوي 😅 جرّب بعد دقايق." }, { status: 429, headers });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers }); }
  const messages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) return NextResponse.json({ error: "Provide 1–30 messages." }, { status: 400, headers });
  const turns: Turn[] = [];
  for (const m of messages) {
    const role = (m as Turn)?.role;
    const content = (m as Turn)?.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string" || !content.trim() || content.length > 800) {
      return NextResponse.json({ error: "Each message needs a role and 1–800 characters." }, { status: 400, headers });
    }
    turns.push({ role, content: content.trim() });
  }
  if (turns[turns.length - 1].role !== "user") return NextResponse.json({ error: "The last message must be from the visitor." }, { status: 400, headers });
  try {
    const completion = await hasawiClient().chat.completions.create({
      model: HASAWI_CHAT_MODEL,
      max_tokens: 220,
      temperature: 0.7,
      messages: [{ role: "system", content: HASAWI_SYSTEM_PROMPT }, ...turns.slice(-12)],
    });
    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error("empty");
    return NextResponse.json({ reply }, { headers });
  } catch {
    console.error("[hasawi chat] failed");
    return NextResponse.json({ error: "حساوي ما سمعك زين، عيد مرة ثانية." }, { status: 502, headers });
  }
}
