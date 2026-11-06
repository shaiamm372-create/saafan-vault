import { arLabError } from "@/lib/i18n/grader-ar";
import { NextResponse } from "next/server";
import { GuidedInputError, RequestSizeError, readBoundedJson, runGuidedLab } from "@/lib/guided-lab-runtime";
export async function POST(req: Request) {
  try {
    const body = await readBoundedJson(req, 8192);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["labId", "request", "policy"].includes(key))) throw new GuidedInputError("Provide labId, request, and policy only.");
    return NextResponse.json(runGuidedLab(body.labId, body.request, body.policy), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestSizeError) return NextResponse.json({ error: arLabError(error.message) }, { status: 413 });
    if (error instanceof SyntaxError || error instanceof GuidedInputError) return NextResponse.json({ error: arLabError(error.message) }, { status: 400 });
    console.error("[guided lab] failed");
    return NextResponse.json({ error: "تعذّر تشغيل البيئة المعزولة. لم تُعتمد أي نتيجة." }, { status: 500 });
  }
}
