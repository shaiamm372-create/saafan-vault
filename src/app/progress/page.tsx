"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Download, Shield } from "lucide-react";
import { LESSONS } from "@/lib/learning";
import { GUIDED_LABS } from "@/lib/guided-labs";
import { CHALLENGES } from "@/lib/challenges";
import { AGENTIC_MISSIONS } from "@/lib/agentic/catalog";
import { clearLearningProgress, downloadEvidence, useLearningProgress } from "@/lib/learning-progress";
import { usePlayer } from "@/hooks/usePlayer";
import { useCohortPlayer } from "@/hooks/useCohortPlayer";
import { useAgenticProgress } from "@/hooks/useAgenticProgress";
import { AR_MISSION_TITLES } from "@/lib/i18n/agentic-ar";
export default function ProgressPage() {
  const records = useLearningProgress(); const legacy = usePlayer(); const player = useCohortPlayer(); const agentic = useAgenticProgress(player.user);
  const [server, setServer] = useState<{ uid: string; ids: string[] } | null>(null);
  const [error, setError] = useState("");
  const [failureUid, setFailureUid] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => {
    if (!player.user) return;
    const user = player.user; const abort = new AbortController();
    user.getIdToken().then((token) => fetch("/api/attack/evaluate?progress=1", { signal: abort.signal, headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })).then(async (response) => { if (!response.ok) throw new Error("تعذّر تحميل تقدّمك الموثّق في خزنة النماذج."); return response.json(); }).then((data) => { if (!abort.signal.aborted) { setServer({ uid: user.uid, ids: data.solvedChallenges }); setError(""); setFailureUid(null); } }).catch(() => { if (!abort.signal.aborted) { setFailureUid(user.uid); setError("تعذّر تحميل تقدّمك الموثّق في خزنة النماذج. حدّث الصفحة لإعادة المحاولة."); } });
    return () => abort.abort();
  }, [player.user]);
  const llm = player.user && server?.uid === player.user.uid ? server.ids : [];
  const llmStatus = !player.user ? "signed-out" : failureUid === player.user.uid ? "unavailable" : server?.uid === player.user.uid ? "loaded" : "loading";
  const statusLabel = (status: string, count: number) => status === "loaded" ? String(count) : status === "signed-out" ? "سجّل الدخول" : status === "loading" ? "جارٍ التحميل…" : "غير متاح";
  const lessonIds = records.filter((record) => record.mode === "lesson").map((record) => record.id);
  const defenses = records.filter((record) => record.mode === "deterministic-defense");
  const nextLesson = LESSONS.find((lesson) => !lessonIds.includes(lesson.slug));
  const nextLab = GUIDED_LABS.find((lab) => !defenses.some((record) => record.id === lab.id));
  const title = (id: string) => LESSONS.find((entry) => entry.slug === id)?.title ?? GUIDED_LABS.find((entry) => entry.id === id)?.title ?? CHALLENGES.find((entry) => entry.id === id)?.title ?? AR_MISSION_TITLES[id] ?? AGENTIC_MISSIONS.find((entry) => entry.id === id)?.title ?? id;
  const labels = { lesson: "اختبار درس", simulated: "تدريب نماذج بالمحاكاة", "viewer-live": "مباشر بمفتاحك · غير محتسب", "server-live": "نتيجة مباشرة على الخادم · سجل الجهاز", "deterministic-defense": "مجموعة دفاع حتمية", "agentic-practice": "تدريب وكلاء بالسيناريو" };
  return <div className="platform-page"><div className="platform-shell"><header className="platform-header"><p className="eyebrow"><Shield size={14} /> سجل تعلّم خاص</p><h1>أكمل من حيث توقفت.</h1><p>افصل بين الدروس، والتدريب في البيئة المعزولة، وفحوص الدفاع، والمنافسة الموثّقة. سجلات الجهاز إنجازات تعلّم، لا شهادات معتمدة بشكل مستقل.</p></header><div className="progress-metrics">{[["دروس مكتملة", `${lessonIds.length}/${LESSONS.length}`], ["دفاعات موجّهة", `${defenses.length}/${GUIDED_LABS.length}`], ["نماذج موثّقة", statusLabel(llmStatus, llm.length)], ["وكلاء موثّقة", statusLabel(agentic.status, agentic.ranked.length)]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><section className="progress-next"><p className="eyebrow">خطوتك التالية</p><h2>{nextLesson?.title ?? nextLab?.title ?? "استكشف مهمة جديدة"}</h2><p>{nextLesson?.summary ?? nextLab?.summary ?? "تابع إلى مختبر الوكلاء وافحص حدًّا مختلفًا."}</p><Link className="lab-button lab-button-primary" href={nextLesson ? `/learn/${nextLesson.slug}` : nextLab ? `/labs/${nextLab.id}` : "/agentic"}>تابع <ArrowRight size={16} /></Link></section>
    {!player.user && <div className="progress-account"><p>الدروس والتدريب تبقى على هذا الجهاز. سجّل الدخول لتحميل حلولك المحتسبة على الخادم عبر الأجهزة.</p><button className="lab-button lab-button-secondary" onClick={() => { void player.signIn().catch(() => setError("تعذّر بدء تسجيل الدخول. أعد المحاولة أو تابع دون حساب.")); }}>سجّل الدخول بـ Google</button></div>}
    {(error || agentic.error) && <p role="alert" className="guided-hint text-amber-300">{error || "تعذّر تحميل تقدّمك الموثّق في مختبر الوكلاء."}</p>}
    {player.user && <section className="progress-server"><h2>المنافسة المسجّلة على الخادم</h2><p>تُحمّل هذه القوائم من سجلات الخادم الموثّقة. نقاط النماذج الجديدة تستخدم جلسات يملكها الخادم، والترتيب التاريخي يبقى منفصلًا.</p><div className="guided-actions">{llm.map((id) => <Link href={`/challenges/${id}`} key={id} className="mode-tag">{title(id)} · مباشر</Link>)}{agentic.ranked.map((id) => <Link href={`/agentic/${id}`} key={id} className="mode-tag">{title(id)} · {AGENTIC_MISSIONS.find((entry) => entry.id === id)?.role === "defender" ? "دفاع" : "مباشر"}</Link>)}</div>{llmStatus === "loaded" && agentic.status === "loaded" && llm.length + agentic.ranked.length === 0 && <p>لا توجد حلول مسجّلة على الخادم بعد.</p>}</section>}
    <section className="progress-records"><h2>على هذا الجهاز</h2>{records.length ? <ol>{[...records].sort((a, b) => b.completedAt - a.completedAt).map((record) => <li key={`${record.id}-${record.mode}`}><Link href={record.href}>{title(record.id)}<span>{labels[record.mode]}</span></Link><time dateTime={new Date(record.completedAt).toISOString()}>{new Date(record.completedAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}</time></li>)}</ol> : <p>لا توجد إنجازات تعلّم جديدة بعد. أكمل اختبار درس أو دفاعًا موجّهًا لتبدأ.</p>}<p className="execution-limits">تقدّم سابق على الجهاز: {legacy.solvedIds.length} إنجاز في خزنة النماذج و{agentic.practice.length} إنجاز تدريب وكلاء. قد يكون مصدر تنفيذها مجهولًا، ولا تُحتسب كحلول موثّقة جديدة.</p></section>
    <div className="guided-actions"><button className="lab-button lab-button-secondary" onClick={() => downloadEvidence("saafan-learning-record.json", JSON.stringify({ exportedAt: new Date().toISOString(), deviceRecords: records, historicalDeviceLlm: legacy.solvedIds, scriptedAgenticPractice: agentic.practice, authenticatedServerLlm: { status: llmStatus, solvedIds: llmStatus === "loaded" ? llm : null }, authenticatedServerAgentic: { status: agentic.status, solvedIds: agentic.status === "loaded" ? agentic.ranked : null }, limitation: "سجلات الجهاز إنجازات تسجّلها بنفسك، وهذا التصدير ليس شهادة موقّعة. بيانات الدخول والبريد مستبعدة." }, null, 2), "application/json")}><Download size={16} /> صدّر سجل التعلّم</button><button className="lab-button lab-button-secondary" onClick={() => setConfirmClear(true)}>امسح إنجازات الجهاز الجديدة</button></div>{confirmClear && <div className="guided-hint"><p>تمسح إنجازات الدروس والمختبرات الموجّهة الجديدة على هذا الجهاز؟ صدّرها أولًا إن أردت الاحتفاظ بها. تقدّم التحديات الحالي ونقاط الخادم محفوظة.</p><div className="guided-actions"><button className="lab-button lab-button-secondary" onClick={() => setConfirmClear(false)}>احتفظ بالسجلات</button><button className="lab-button lab-button-secondary" onClick={() => { clearLearningProgress(); setConfirmClear(false); }}>امسح الإنجازات</button></div></div>}
  </div></div>;
}
