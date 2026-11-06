"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, Lightbulb, Loader2, Network, Play, RotateCcw, Shield, Terminal, XCircle } from "lucide-react";
import type { AgenticMission, LabBriefing } from "@/lib/agentic/catalog";
import type { LabRun, TraceEvent } from "@/lib/agentic/runtime";
import { saveLearningProgress, downloadEvidence } from "@/lib/learning-progress";
import { recordPracticeSolve } from "@/hooks/useAgenticProgress";
import { useCohortPlayer } from "@/hooks/useCohortPlayer";
import { BRAND } from "@/lib/brand";
import { arStage } from "@/lib/i18n/ar";
import { AR_CONTROLS, AR_MISSION_TITLES, arBackend, arBriefing, arEvidence, arTrace } from "@/lib/i18n/agentic-ar";

export function AgenticFailureNotice({ detail }: { detail?: string }) {
  const router = useRouter();
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    notice.current?.scrollIntoView({ block: "start", behavior: "instant" });
    const timer = window.setTimeout(() => router.replace("/"), 10_000);
    return () => window.clearTimeout(timer);
  }, [router]);
  return <div ref={notice} className="platform-page"><section className="platform-shell" role="alert"><header className="platform-header"><p className="eyebrow">دعم مختبر الوكلاء</p><h1>حدث خطأ ما.</h1><p>راسلنا على <a href={`mailto:${BRAND.ownerEmail}`} className="ltr inline-block text-emerald-300 underline">{BRAND.ownerEmail}</a> مع رابط المهمة والخطأ الذي ظهر لك.</p></header>{detail && <p className="agentic-error">{detail}</p>}<p className="mt-6 text-slate-400">العودة للصفحة الرئيسية بعد 10 ثوانٍ.</p><Link href="/" className="lab-button lab-button-primary mt-6">اذهب للصفحة الرئيسية</Link></section></div>;
}

export class AgenticErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <AgenticFailureNotice /> : this.props.children; }
}

function Trace({ events }: { events: TraceEvent[] }) {
  return <ol className="agentic-trace">{events.map((event) => <li key={event.step} data-status={event.status}><span className="agentic-trace-index">{String(event.step).padStart(2, "0")}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{event.tool}</strong><span className="agentic-event-status">{event.status === "committed" ? "نُفّذ" : "رُفض"} · {event.actor ?? "agent"} · المهمة {event.stage}</span></div><pre>{JSON.stringify(event.args, null, 2)}</pre><p>{arTrace(event.detail)}</p></div>{event.status === "committed" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}</li>)}</ol>;
}

export default function AgenticMissionScreen(props: { mission: AgenticMission; briefing: LabBriefing }) {
  return <AgenticErrorBoundary><AgenticMissionWorkspace {...props} /></AgenticErrorBoundary>;
}

function AgenticMissionWorkspace({ mission, briefing }: { mission: AgenticMission; briefing: LabBriefing }) {
  const player = useCohortPlayer();
  const ar = arBriefing(mission.id, briefing);
  const [mode, setMode] = useState<"practice" | "live" | "defender">("practice");
  const [practice, setPractice] = useState(briefing.practice);
  const [artifact, setArtifact] = useState(briefing.artifact);
  const isDefender = mission.role === "defender";
  const [rankedDefenderAvailable, setRankedDefenderAvailable] = useState(false);
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [capabilityError, setCapabilityError] = useState(false);
  const [loadingCapabilities, setLoadingCapabilities] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<(LabRun & { submittedInput: { missionId: string; mode: string; artifact: string }; executedAt: string }) | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("briefing");
  const [hints, setHints] = useState(0);
  const [defense, setDefense] = useState(false);
  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/agentic/run", { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then((data) => { setLiveAvailable(data.liveAvailable === true); setRankedDefenderAvailable(data.rankedDefenderAvailable === true); }).catch(() => { if (!controller.signal.aborted) setCapabilityError(true); }).finally(() => { if (!controller.signal.aborted) setLoadingCapabilities(false); });
    return () => { controller.abort(); request.current?.abort(); };
  }, []);
  function reset() {
    if (busy.current) return;
    setPractice(briefing.practice); setArtifact(briefing.artifact); setResult(null); setError(""); setDefense(false); setHints(0); setTab("briefing");
  }
  function selectMode(next: "practice" | "live" | "defender") {
    if (busy.current) return;
    setMode(next); setResult(null); setError(""); setDefense(false);
  }
  async function signIn() {
    try { await player.signIn(); } catch { setError("تعذّر بدء تسجيل الدخول بـ Google. تحقّق من إعدادات Firebase ثم أعد المحاولة."); setTab("edit"); }
  }
  async function run() {
    if (busy.current) return;
    busy.current = true; setRunning(true); setResult(null); setError(""); setDefense(false);
    const submittedInput = { missionId: mission.id, mode, artifact: mode === "practice" || isDefender ? practice : artifact };
    const executedAt = new Date().toISOString();
    const controller = new AbortController(); request.current = controller;
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const token = mode !== "practice" ? await player.token() : null;
      const response = await fetch("/api/agentic/run", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(submittedInput) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "فشل التنفيذ.");
      if (data.success && mode === "practice") { recordPracticeSolve(mission.id); saveLearningProgress(mission.id, "agentic-practice", `/agentic/${mission.id}`); }
      if (data.scoreRecorded) window.dispatchEvent(new Event("agentic-ranked-progress"));
      setResult({ ...data, submittedInput, executedAt }); setTab("evidence");
    } catch (caught) { setTab("edit"); setError(caught instanceof Error && caught.name !== "AbortError" ? caught.message : "انتهت مهلة التشغيل ولم يُعتمد إنجازه. يمكنك إعادة المحاولة."); }
    finally { clearTimeout(timer); request.current = null; busy.current = false; setRunning(false); }
  }
  const canRun = !running && (mode === "practice" || ((isDefender ? rankedDefenderAvailable : liveAvailable) && !!player.user));
  if (error || capabilityError) return <AgenticFailureNotice detail={error || "تعذّر التحقق من توفر تنفيذ المهمة."} />;
  return <div className="agentic-lab pt-28 pb-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <Link href="/challenges" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={15} /> كل المختبرات</Link>
    <header className="agentic-mission-header"><p className="eyebrow"><Network size={14} /> {mission.code} / {arStage(mission.stage)} / السيناريو v1</p><h1>{AR_MISSION_TITLES[mission.id] ?? mission.title}</h1><p className="text-xs text-slate-500 -mt-2 mb-3"><span className="ltr inline-block">{mission.title}</span></p><p className="text-slate-400 leading-7 max-w-3xl">{ar.objective}</p></header>
    <div className="agentic-run-bar"><div className="agentic-mode-switch" role="group" aria-label="وضع التنفيذ"><button disabled={running} aria-pressed={mode === "practice"} onClick={() => selectMode("practice")}>تدريب بالسيناريو</button><button disabled={running || loadingCapabilities || !(isDefender ? rankedDefenderAvailable : liveAvailable)} aria-pressed={mode !== "practice"} onClick={() => selectMode(isDefender ? "defender" : "live")}>{isDefender ? "دفاع محتسب" : "نموذج مباشر"}</button></div><span className="text-xs text-slate-400">{mode === "practice" ? "غير محتسب · محاكاة معزولة" : `${mission.points} نقطة · تنفيذ يتحقق منه الخادم`}</span><button className="lab-button lab-button-secondary" disabled={running} onClick={reset}><RotateCcw size={15} /> إعادة ضبط</button></div>
    {!loadingCapabilities && !capabilityError && !liveAvailable && !isDefender && <p className="agentic-notice">التنفيذ المباشر غير متاح على هذا الخادم. التدريب ينفّذ برنامج أدوات صريحًا على موارد وهمية، ولا يحاكي قابلية النموذج للتأثر باللغة الطبيعية.</p>}
    {mode !== "practice" && !player.user && <div className="agentic-notice">التشغيل المحتسب يتطلب تسجيل دخول موثّقًا بـ Google. <button className="text-emerald-300 underline" onClick={() => void signIn()}>سجّل الدخول</button></div>}
    <div className="agentic-mobile-tabs" role="group" aria-label="لوحات مساحة العمل">{["briefing", "edit", "evidence"].map((name) => <button key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{({ briefing: "الإيجاز", edit: "التحرير", evidence: "الأدلة" } as Record<string, string>)[name]}</button>)}</div>
    <div className="agentic-workspace" data-panel={tab} data-running={running}>
      <section className="agentic-panel briefing-panel"><h2><Shield size={17} /> عقد المهمة</h2><div className="agentic-task-contract"><span>المهمة المصرّح بها</span><p>{ar.authorizedTask}</p><p className="ltr mt-2 text-xs text-slate-500" title="النص الذي يراه الوكيل">{briefing.authorizedTask}</p></div><h3>السطح القابل للتعديل</h3><p>{ar.surface}</p><h3>القواعد بدقة</h3><ul>{ar.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul><p className="mt-4 text-xs">حالة جديدة في كل تشغيل · ثمانية استدعاءات أدوات كحد أقصى للهجوم · أربع جولات للنموذج في كل مهمة · ميزانية 45 ثانية للتشغيل المباشر. ومهمة الذاكرة تشغّل أيضًا ضابطًا نظيفًا محدودًا بشكل منفصل.</p><button className="lab-button lab-button-secondary mt-5" disabled={hints >= ar.hints.length} onClick={() => setHints((value) => value + 1)}><Lightbulb size={15} /> اكشف التلميح {Math.min(hints + 1, 3)}/3</button>{ar.hints.slice(0, hints).map((hint, index) => <p className="agentic-hint" key={hint}>{index + 1}. {hint}</p>)}</section>
      <section className="agentic-panel edit-panel"><h2><Terminal size={17} /> {isDefender ? "إعداد الدفاع" : mode === "practice" ? "برنامج الأدوات" : "القطعة غير الموثوقة (بالإنجليزية)"}</h2>{isDefender && briefing.reviewItems?.map((item) => <div key={item.id} className="agentic-task-contract"><strong>{item.id}</strong><p>تفسير الوكيل: <span className="ltr inline-block">{item.summary}</span></p><p>الحمولة الأصلية: <span className="ltr inline-block">{item.destination} · ${item.amount}</span></p><label className="block mt-2">القرار <select aria-label={`القرار لـ ${item.id}`} disabled={running} value={JSON.parse(practice).decisions[item.id]} onChange={(event) => { const config = JSON.parse(practice); config.decisions[item.id] = event.target.value; setPractice(JSON.stringify(config, null, 2)); }} className="bg-slate-900 border border-slate-600 rounded px-3 py-2"><option value="approve">موافقة</option><option value="reject">رفض</option></select></label></div>)}
      {isDefender && briefing.controls?.map((control) => <label key={control} className="flex gap-3 py-3 items-center"><input type="checkbox" disabled={running} checked={JSON.parse(practice).controls.includes(control)} onChange={(event) => { const config = JSON.parse(practice); config.controls = event.target.checked ? [...config.controls, control] : config.controls.filter((value: string) => value !== control); setPractice(JSON.stringify(config, null, 2)); }} />{AR_CONTROLS[control] ?? control.replaceAll("_", " ")} <code className="text-xs text-slate-500">{control}</code></label>)}
      <label htmlFor="agentic-artifact" className="block mb-3 text-sm text-slate-400">{isDefender ? "اختر الدفاعات مع الحفاظ على المهمة المصرّح بها. يقيّم الخادم الإجراءات الناتجة." : mode === "practice" ? "عدّل إجراءات JSON. الاستدعاءات المنفّذة وحدها تؤثر في العالم الوهمي." : "عدّل المحتوى الذي سيستهلكه الوكيل (بالإنجليزية). مخططات الأدوات وصلاحية المهمة يملكها الخادم."}</label><textarea hidden={isDefender} id="agentic-artifact" value={mode === "practice" ? practice : artifact} onChange={(event) => mode === "practice" ? setPractice(event.target.value) : setArtifact(event.target.value)} maxLength={6000} disabled={running} spellCheck={false} /><div className="flex justify-between gap-3 mt-3 text-xs text-slate-500"><span>{(mode === "practice" || isDefender ? practice : artifact).length}/6000 حرف</span><span>موارد وهمية فقط</span></div><button onClick={() => void run()} disabled={!canRun} className="lab-button lab-button-primary agentic-run-button">{running ? <Loader2 className="animate-spin" size={17} /> : <Play size={17} />}{running ? "جارٍ التشغيل المحدود…" : "شغّل المهمة"}<ChevronRight size={16} /></button><details className="mt-5 text-sm text-slate-400"><summary className="cursor-pointer">مرجع الأدوات</summary><pre className="agentic-tool-reference">{briefing.toolReference ?? (mission.id === "asi02-a" ? 'refund { "order": "order-1042", "amount": 25 }' : mission.id === "asi06-a" ? 'Task 1: remember { "key": "tone", "value": "concise" }\nTask 2: summarize { "document": "spec" }\nTask 2: publish { "document": "private-report", "destination": "external-workspace" }' : 'summarize { "document": "spec" }\npublish { "document": "private-report", "destination": "external-workspace" }')}</pre></details></section>
      <section className="agentic-panel evidence-panel" aria-live="polite"><h2><Network size={17} /> أدلة التنفيذ</h2>{result && <button className="lab-button lab-button-secondary my-4" onClick={() => downloadEvidence(`${mission.id}-evidence.json`, JSON.stringify({ mission: mission.id, contract: briefing.authorizedTask, ...result, limitation: "عالم أدوات اصطناعي. إعادة التشغيل بالدفاع تعيد استخدام الطلبات المسجّلة، وليست تشغيلًا ثانيًا للنموذج." }, null, 2), "application/json")}>صدّر أدلة JSON</button>}{result && <details className="my-4 text-sm text-slate-400"><summary className="cursor-pointer">المدخل المنفّذ · {result.submittedInput.mode}</summary><p>سُجّل في {result.executedAt}. تعديلات المحرّر تُطبّق في التشغيل التالي.</p><pre className="agentic-tool-reference">{result.submittedInput.artifact}</pre></details>}{running ? <div className="agentic-empty-evidence"><Loader2 className="animate-spin text-emerald-400" size={28} /><p>الخادم ينفّذ الأدوات.<br />تظهر الأدلة بعد انتهاء التشغيل المحدود.</p></div> : !result ? <div className="agentic-empty-evidence"><Network size={38} strokeWidth={1} /><p>لا يوجد سجل بعد.<br />شغّل المهمة لتفحص الإجراءات وحالة العالم.</p></div> : <><div className={`agentic-verdict ${result.success && !isDefender ? "violation" : "intact"}`}><strong>{result.success ? isDefender ? "تأمّن الحد" : "اختُرق الحد" : "لا يوجد حل متحقق منه"}</strong><p>{arEvidence(result.evidence)}</p><small>{arBackend(result.backend)} · {result.mode === "practice" ? "تدريب فقط · بلا نقاط" : result.scoreRecorded ? `سُجّلت +${result.pointsEarned} نقطة` : "لم تُسجّل نقاط جديدة"}</small></div>{result.memoryControlPassed !== null && <p className="mb-4 text-xs text-slate-400">المهمة الجديدة بلا ذاكرة محفوظة: {result.memoryControlPassed ? "اكتملت بأمان" : "فشلت في الضابط"}.</p>}<div className="agentic-evidence-switch" role="group" aria-label="عرض الأدلة"><button aria-pressed={!defense} onClick={() => setDefense(false)}>التنفيذ الأصلي</button><button aria-pressed={defense} onClick={() => setDefense(true)}>إعادة التشغيل بالدفاع</button></div>{defense && <div className="agentic-notice"><strong>{result.defensePassed ? "نجح الدفاع" : "فشل الدفاع"}</strong><p>{ar.defense}</p><p>يعيد تشغيل طلبات الأدوات نفسها عبر ضوابط مفروضة، وهذا ليس تشغيلًا ثانيًا للنموذج. ضابط الأداة المشروعة: {result.baselinePassed ? "نجح" : "فشل"}.</p></div>}<Trace events={defense ? result.defenseTrace : result.trace} />{result.memoryControlTrace.length > 0 && <details className="mt-5"><summary className="cursor-pointer text-sm text-slate-300">سجل ضابط الذاكرة النظيفة</summary><Trace events={result.memoryControlTrace} /></details>}<details className="mt-5" open><summary className="cursor-pointer text-sm text-slate-300">الحالة النهائية للعالم الوهمي</summary><pre className="agentic-world-state">{JSON.stringify(defense ? result.defenseWorld : result.world, null, 2)}</pre></details></>}</section>
    </div>
  </div></div>;
}
