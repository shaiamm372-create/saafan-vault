import "server-only";
import { GUIDED_LABS, type LabAction, type LabPolicy, type Execution, type GuidedResult, type GuidedLabId } from "./guided-labs";

export class GuidedInputError extends Error {}
export class RequestSizeError extends Error {}
export async function readBoundedJson(req: Request, limit: number) {
  const reader = req.body?.getReader();
  if (!reader) throw new SyntaxError("Request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new RequestSizeError(`Request exceeds ${limit / 1024} KB.`);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally { reader.releaseLock(); }
}
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function runGuidedLab(id: unknown, input: unknown, controls: unknown): GuidedResult {
  const lab = GUIDED_LABS.find((entry) => entry.id === id);
  if (!lab) throw new GuidedInputError("Unknown guided lab.");
  if (!object(input) || !object(controls)) throw new GuidedInputError("Request and policy must be JSON objects.");
  const keys = ["blockAll", ...lab.controls.map((control) => control.key)];
  if (Object.keys(controls).some((key) => !keys.includes(key) || typeof controls[key] !== "boolean") || Object.keys(lab.initialPolicy).some((key) => typeof controls[key] !== "boolean")) throw new GuidedInputError("Policy fields must match this lab and contain boolean values.");
  const allowedFields = lab.id === "support-context" ? ["operation", "topic"] : lab.id === "tenant-retrieval" ? ["operation", "records"] : ["operation", "amounts"];
  if (Object.keys(input).some((key) => !allowedFields.includes(key)) || typeof input.operation !== "string") throw new GuidedInputError("Request fields do not match this lab.");
  if (lab.id === "support-context" && (input.operation !== "answer" || !["return-policy", "opening-hours", "staff-code", "context-export", "claimed-staff"].includes(input.topic as string))) throw new GuidedInputError("Use answer with a supported topic from the examples.");
  if (lab.id === "tenant-retrieval" && (input.operation !== "retrieve" || !Array.isArray(input.records) || input.records.length < 1 || input.records.length > 4 || input.records.some((record) => !["alpha-policy", "alpha-hours", "beta-internal", "beta-payroll"].includes(record)))) throw new GuidedInputError("Retrieve 1–4 known alpha or beta record identifiers.");
  if (lab.id === "refund-boundary" && (input.operation !== "refund" || !Array.isArray(input.amounts) || input.amounts.length < 1 || input.amounts.length > 8 || input.amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 1 || amount > 500))) throw new GuidedInputError("Provide 1–8 whole-dollar amounts between $1 and $500.");
  const request = input as LabAction;
  const policy = controls as LabPolicy;
  const execute = (action: LabAction, selected: LabPolicy) => executeAction(lab.id, action, selected);
  const attackCases: { name: string; action: LabAction }[] = lab.id === "support-context" ? [
    { name: "طلب مباشر للقيمة المحمية", action: { operation: "answer", topic: "staff-code" } },
    { name: "تصدير السياق كاملًا", action: { operation: "answer", topic: "context-export" } },
    { name: "ادعاء غير موثّق بأنه موظف", action: { operation: "answer", topic: "claimed-staff" } },
  ] : lab.id === "tenant-retrieval" ? [
    { name: "سجل عميل خاص", action: { operation: "retrieve", records: ["beta-internal"] } },
    { name: "دفعة مختلطة من عميلين", action: { operation: "retrieve", records: ["alpha-policy", "beta-internal"] } },
    { name: "سجل خاص آخر", action: { operation: "retrieve", records: ["beta-payroll"] } },
  ] : [
    { name: "استرداد منفرد يتجاوز الحد", action: { operation: "refund", amounts: [100] } },
    { name: "استرداد مجزّأ", action: { operation: "refund", amounts: [30, 30] } },
    { name: "الحد زائد دولار واحد", action: { operation: "refund", amounts: [25, 26] } },
  ];
  const benignCases = lab.id === "support-context" ? [{ name: "سياسة الإرجاع العامة", action: lab.benign }, { name: "أوقات العمل العامة", action: { operation: "answer", topic: "opening-hours" } }] : lab.id === "tenant-retrieval" ? [{ name: "سجل العميل نفسه", action: lab.benign }, { name: "دفعة سجلات العميل نفسه", action: { operation: "retrieve", records: ["alpha-policy", "alpha-hours"] } }] : [{ name: "استرداد 25 دولارًا المصرّح به", action: lab.benign }, { name: "استردادان جزئيان مجموعهما 25 دولارًا", action: { operation: "refund", amounts: [10, 15] } }];
  const attacks = attackCases.map(({ name, action }) => { const execution = execute(action, policy); return { name, action, passed: !execution.violation, execution }; });
  const benign = benignCases.map(({ name, action }) => { const execution = execute(action, policy); return { name, action, passed: execution.taskCompleted, execution }; });
  const original = execute(request, lab.initialPolicy);
  const defended = execute(request, policy);
  const defensePassed = attacks.every((check) => check.passed) && benign.every((check) => check.passed);
  return { labId: lab.id, version: "1", mode: "deterministic-sandbox", createdAt: new Date().toISOString(), request, policy, original, defended, attacks, benign, defensePassed, completed: original.violation && !defended.violation && defensePassed, limitation: "مجموعة محدودة وحتمية من الإجراءات على موارد اصطناعية، ولم يُستدعَ أي نموذج لغوي. هذا لا يُثبت قابلية التأثر بالأوامر، ولا أمان بيئة الإنتاج، ولا الحماية من كل هجوم." };
}
function executeAction(id: GuidedLabId, action: LabAction, policy: LabPolicy): Execution {
  const result: Execution = { violation: false, taskCompleted: false, trace: [], state: { refunded: 0, returned: [] } };
  const record = (status: "committed" | "denied", detail: string) => result.trace.push({ step: result.trace.length + 1, operation: action.operation, status, detail });
  if (policy.blockAll) { record("denied", "حُجبت كل الطلبات، ولا يمكن إنجاز المهمة المصرّح بها."); return result; }
  if (id === "support-context") {
    const secretRequest = ["staff-code", "context-export", "claimed-staff"].includes(action.topic!);
    record("committed", policy.excludeSecret ? "بُني سياق عام بدون رمز الموظفين الاصطناعي." : "بُني سياق يحتوي السياسة العامة ورمز موظفين اصطناعيًا.");
    if (secretRequest && policy.excludeSecret) { record("denied", "القيمة المحمية غير متاحة في سياق العميل."); return result; }
    result.state.returned = secretRequest ? ["SYNTHETIC-STAFF-CODE-1042"] : [action.topic === "return-policy" ? "يُقبل الإرجاع خلال 30 يومًا." : "نعمل من 09:00 إلى 17:00 في أيام الأسبوع."];
    result.violation = secretRequest; result.taskCompleted = !secretRequest;
    record("committed", secretRequest ? "أرجع المساعد المحاكى القيمة المحمية الاصطناعية." : "أُرجعت معلومات عامة مصرّح بها.");
  } else if (id === "tenant-retrieval") {
    record("committed", "العميل الموثّق هو alpha، ومعرّفات الطلب لا تغيّر هذه الصلاحية.");
    if (policy.enforceTenant && action.records!.some((name) => !name.startsWith("alpha-"))) { record("denied", "رفض تفويض العميل الدفعة المختلطة أو الأجنبية كاملة."); return result; }
    result.state.returned = action.records!.map((name) => `${name}: ${name.startsWith("alpha-") ? "سياسة عامة للعميل (اصطناعية)" : "سجل beta خاص (اصطناعي)"}`);
    result.violation = action.records!.some((name) => name.startsWith("beta-")); result.taskCompleted = !result.violation;
    record("committed", `أُرجع: ${action.records!.join("، ")}.`);
  } else {
    for (const amount of action.amounts!) {
      if (result.state.refunded + amount > 500 || (policy.perCallLimit && amount > 50) || (policy.aggregateLimit && result.state.refunded + amount > 50)) { record("denied", `رُفض استرداد ${amount} دولار، والمجموع المعتمد ${result.state.refunded} دولار.`); continue; }
      result.state.refunded += amount; record("committed", `استُرد ${amount} دولار، والمجموع المعتمد ${result.state.refunded} دولار.`);
    }
    result.violation = result.state.refunded > 50;
    result.taskCompleted = result.state.refunded === 25;
  }
  return result;
}
