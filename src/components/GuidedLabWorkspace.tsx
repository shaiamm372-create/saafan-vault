"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Download, Play, RotateCcw, Shield, Terminal } from "lucide-react";
import { type GuidedLab, type GuidedResult, type LabPolicy, type Execution } from "@/lib/guided-labs";
import { downloadEvidence, saveLearningProgress } from "@/lib/learning-progress";

function EvidenceTrace({ title, execution }: { title: string; execution: Execution }) {
  return <section className="proof-trace"><h3>{title}<span className={execution.violation ? "text-amber-300" : "text-emerald-300"}>{execution.violation ? "اختُرق الحد" : "صمد الحد"}</span></h3><ol>{execution.trace.map((event) => <li key={event.step}><span className="proof-step">{String(event.step).padStart(2, "0")}</span><div><strong>{event.operation} · {event.status === "committed" ? "نُفّذ" : "رُفض"}</strong><p>{event.detail}</p></div></li>)}</ol><pre>{JSON.stringify(execution.state, null, 2)}</pre></section>;
}
function markdown(result: GuidedResult, title: string) {
  return [`# ${title}`, `وقت التسجيل: ${result.createdAt}`, `التنفيذ: ${result.mode} · إصدار السيناريو ${result.version}`, `مجموعة الدفاع: ${result.defensePassed ? "نجحت" : "فشلت"}`, `اكتملت دورة التعلّم: ${result.completed ? "نعم" : "لا"}`, "", "## النطاق", result.limitation, "", "## الطلب", "```json", JSON.stringify(result.request, null, 2), "```", "## السياسة", "```json", JSON.stringify(result.policy, null, 2), "```", "## الفحوص", "| الفحص | النوع | النتيجة |", "| --- | --- | --- |", ...result.attacks.map((check) => `| ${check.name} | هجوم | ${check.passed ? "نجح" : "فشل"} |`), ...result.benign.map((check) => `| ${check.name} | مهمة مشروعة | ${check.passed ? "نجح" : "فشل"} |`), "", "## التنفيذ الأصلي", "```json", JSON.stringify(result.original, null, 2), "```", "## التنفيذ بعد الدفاع", "```json", JSON.stringify(result.defended, null, 2), "```", "## أدلة الفحوص كاملة", "```json", JSON.stringify({ attacks: result.attacks, benign: result.benign }, null, 2), "```"].join("\n");
}
export default function GuidedLabWorkspace({ lab, compact = false }: { lab: GuidedLab; compact?: boolean }) {
  const [request, setRequest] = useState(JSON.stringify(lab.attack, null, 2));
  const [policy, setPolicy] = useState<LabPolicy>(lab.initialPolicy);
  const [result, setResult] = useState<GuidedResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [hints, setHints] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  function editRequest(value: string) { setRequest(value); setResult(null); setError(""); }
  function editPolicy(key: keyof LabPolicy, value: boolean) { setPolicy((current) => ({ ...current, [key]: value })); setResult(null); setError(""); }
  async function execute() {
    if (busy.current) return;
    busy.current = true; setRunning(true); setError(""); setResult(null);
    const abort = new AbortController(); controller.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 15_000);
    try {
      const input: unknown = JSON.parse(request);
      const response = await fetch("/api/labs/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ labId: lab.id, request: input, policy }), signal: abort.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "لم تُرجع البيئة المعزولة أي نتيجة.");
      setResult(data);
      if (data.completed) saveLearningProgress(lab.id, "deterministic-defense", `/labs/${lab.id}`);
    } catch (caught) { if (!abort.signal.aborted) setError(caught instanceof SyntaxError ? "يجب أن يكون الطلب JSON صالحًا. حمّل مثالًا أو صحّح المحرّر." : caught instanceof Error ? caught.message : "فشل التنفيذ."); else setError("انتهت مهلة التنفيذ ولم تُعتمد أي نتيجة. أعد المحاولة."); }
    finally { window.clearTimeout(timer); busy.current = false; setRunning(false); }
  }
  return <div className={`guided-workspace ${compact ? "guided-compact" : ""}`} aria-busy={running}>
    {compact && <div className="guided-demo-bar"><span><Terminal size={14} /> خدمة العملاء / بانِي السياق</span><span className="mode-tag">بيئة تعمل فعليًا</span></div>}
    <div className="guided-contract"><p className="eyebrow">المهمة المصرّح بها</p><p>{lab.task}</p><div className="boundary-flow">{lab.boundary.split(" ← ").map((part, index) => <span key={part}>{index > 0 && <ArrowRight size={13} aria-hidden="true" />}{part}</span>)}</div></div>
    <div className="guided-editor-grid">
      <section className="guided-editor"><h2><Terminal size={16} /> الإجراء المقترح</h2><p className="panel-description">إجراء JSON صريح · موارد اصطناعية · بلا استدعاء نموذج</p><div className="example-buttons"><button disabled={running} onClick={() => editRequest(JSON.stringify(lab.benign, null, 2))}>مهمة مشروعة</button><button disabled={running} onClick={() => editRequest(JSON.stringify(lab.attack, null, 2))}>مثال هجوم</button></div><label htmlFor={`request-${lab.id}`} className="sr-only">طلب JSON</label><textarea id={`request-${lab.id}`} value={request} disabled={running} maxLength={4000} spellCheck={false} onChange={(event) => editRequest(event.target.value)} />{!compact && <details className="lab-request-reference"><summary>الطلبات المدعومة</summary><p>{lab.id === "support-context" ? "مواضيع answer: return-policy، opening-hours، staff-code، context-export، claimed-staff" : lab.id === "tenant-retrieval" ? "سجلات retrieve: alpha-policy، alpha-hours، beta-internal، beta-payroll" : "مبالغ refund: من 1 إلى 8 قيم بالدولار الصحيح، من 1 إلى 500"}</p></details>}</section>
      <section className="guided-controls"><h2><Shield size={16} /> دفاعك</h2><p className="panel-description">غيّر ضابط التطبيق، ثم قارن التنفيذ.</p>{lab.controls.map((control) => <label key={control.key}><input type="checkbox" disabled={running} checked={policy[control.key] === true} onChange={(event) => editPolicy(control.key, event.target.checked)} /><span><strong>{control.label}</strong>{!compact && <small>{control.help}</small>}</span></label>)}</section>
    </div>
    <div className="guided-actions"><button className="lab-button lab-button-primary" disabled={running} onClick={() => void execute()}><Play size={16} />{running ? "جارٍ التنفيذ…" : "نفّذ وقارن"}</button>{!compact && <><button className="lab-button lab-button-secondary" disabled={running || hints >= lab.hints.length} onClick={() => setHints((value) => value + 1)}>تلميح {Math.min(hints + 1, lab.hints.length)}/{lab.hints.length}</button><button aria-label="أعد ضبط هذه البيئة" className="lab-button lab-button-secondary" disabled={running} onClick={() => { editRequest(JSON.stringify(lab.attack, null, 2)); setPolicy(lab.initialPolicy); setHints(0); }}><RotateCcw size={16} /> إعادة ضبط</button></>}</div>
    {!compact && lab.hints.slice(0, hints).map((hint) => <p className="guided-hint" key={hint}>{hint}</p>)}
    {error && <p role="alert" className="guided-hint text-amber-300">{error}</p>}
    <div aria-live="polite" className="guided-results">{result ? <>
      <div className={`proof-verdict ${result.completed ? "passed" : ""}`}><Check size={18} /><div><strong>{result.completed ? "ثبت الهجوم، وتحقّق دفاع فعّال." : result.defensePassed ? "نجحت مجموعة الدفاع. أثبت الهجوم الأصلي لتكتمل المهمة." : "افحص النتيجة، وحسّن الدفاع."}</strong><p>{result.attacks.filter((check) => check.passed).length}/{result.attacks.length} فحوص هجوم · {result.benign.filter((check) => check.passed).length}/{result.benign.length} مهام مشروعة محفوظة</p></div></div>
      {compact ? <div className="mini-proof"><div><span>الأصل</span><strong>{result.original.violation ? "أُرجع الرمز المحمي" : "لم يُرجع الرمز المحمي"}</strong></div><ArrowRight size={18} /><div><span>دفاعك</span><strong>{result.defended.violation ? "الرمز ما زال مكشوفًا" : "حُجب الرمز المحمي"}</strong></div><Link href={`/labs/${lab.id}`}>افحص الأدلة كاملة <ArrowRight size={14} /></Link></div> : <>
        <div className="proof-comparison"><EvidenceTrace title="التنفيذ الأصلي" execution={result.original} /><EvidenceTrace title="التنفيذ بعد دفاعك" execution={result.defended} /></div>
        <section className="proof-suite"><h2>مجموعة الدفاع المحدودة</h2><p className="panel-description">حالة جديدة لكل فحص. المطلوب احتواء الهجوم والحفاظ على الوظيفة المشروعة معًا.</p>{[...result.attacks.map((check) => ({ ...check, type: "هجوم" })), ...result.benign.map((check) => ({ ...check, type: "مهمة مشروعة" }))].map((check) => <details key={check.name}><summary><span>{check.type} · {check.name}</span><strong className={check.passed ? "text-emerald-300" : "text-amber-300"}>{check.passed ? "نجح" : "فشل"}</strong></summary><pre>{JSON.stringify({ request: check.action, ...check.execution }, null, 2)}</pre></details>)}</section>
        <div className="guided-actions"><button className="lab-button lab-button-secondary" onClick={() => downloadEvidence(`${lab.id}-evidence.md`, markdown(result, lab.title), "text/markdown")}><Download size={16} /> تقرير Markdown</button><button className="lab-button lab-button-secondary" onClick={() => downloadEvidence(`${lab.id}-evidence.json`, JSON.stringify(result, null, 2), "application/json")}><Download size={16} /> أدلة JSON</button><Link href={lab.mission} className="lab-button lab-button-secondary">تابع في المهمة <ArrowRight size={16} /></Link></div>
      </>}
      <p className="execution-limits">{result.limitation}</p>
    </> : <p className="execution-limits">شغّل مثالًا، وافحص الأثر الأصلي، وغيّر الدفاع، ثم قارن. بلا توقيت ولا ترتيب، وبدون حساب أو مفتاح API.</p>}</div>
  </div>;
}
