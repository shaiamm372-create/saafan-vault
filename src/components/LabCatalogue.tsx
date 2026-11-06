"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search, Shield } from "lucide-react";
import { CHALLENGES } from "@/lib/challenges";
import { AGENTIC_MISSIONS, LAB_BRIEFINGS } from "@/lib/agentic/catalog";
import { GUIDED_LABS } from "@/lib/guided-labs";
import { useLearningProgress } from "@/lib/learning-progress";
import { arAttackType, arRole, arStage } from "@/lib/i18n/ar";
import { AR_MISSION_TITLES, arBriefing } from "@/lib/i18n/agentic-ar";
const entries = [
  ...GUIDED_LABS.map((lab) => ({ id: lab.id, title: lab.title, description: lab.summary, href: `/labs/${lab.id}`, track: "guided", level: "Foundation", topic: lab.system, mode: "دفاع حتمي", lesson: lab.lesson })),
  ...CHALLENGES.map((lab) => ({ id: lab.id, title: lab.title, description: lab.goal, href: `/challenges/${lab.id}`, track: "llm", level: lab.difficulty === "easy" ? "Foundation" : lab.difficulty === "medium" ? "Advanced" : "Expert", topic: arAttackType(lab.attackType).name, mode: "تدريب بالمحاكاة", lesson: lab.attackType === "indirect-injection" ? "indirect-injection" : lab.attackType === "data-exfiltration" || lab.attackType === "system-prompt-leak" ? "sensitive-context" : "trust-boundaries" })),
  ...AGENTIC_MISSIONS.map((lab) => ({ id: lab.id, title: AR_MISSION_TITLES[lab.id] ?? lab.title, description: arBriefing(lab.id, LAB_BRIEFINGS[lab.id]).objective, href: `/agentic/${lab.id}`, track: "agentic", level: lab.stage, topic: `${lab.code} · ${arRole(lab.role)}`, mode: lab.role === "defender" ? "تقييم دفاعي" : "تدريب بالسيناريو", lesson: lab.code === "ASI01" || lab.code === "ASI06" ? "indirect-injection" : lab.code === "ASI02" ? "tool-authorization" : "evidence-and-defense" })),
];
export default function LabCatalogue() {
  const [query, setQuery] = useState(""); const [track, setTrack] = useState("all"); const [level, setLevel] = useState("all"); const [expanded, setExpanded] = useState(false);
  const [live, setLive] = useState({ llm: false, agentic: false, defense: false, checked: false, failed: false });
  const progress = useLearningProgress();
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([fetch("/api/attack/evaluate", { signal: abort.signal }), fetch("/api/agentic/run", { signal: abort.signal })]).then(async ([llm, agentic]) => {
      if (!llm.ok || !agentic.ok) throw new Error("تعذّر التحقق من التوفر");
      const [a, b] = await Promise.all([llm.json(), agentic.json()]); if (!abort.signal.aborted) setLive({ llm: a.rankedAvailable === true, agentic: b.liveAvailable === true, defense: b.rankedDefenderAvailable === true, checked: true, failed: false });
    }).catch(() => { if (!abort.signal.aborted) setLive((value) => ({ ...value, failed: true })); }); return () => abort.abort();
  }, []);
  const filtered = entries.filter((entry) => (track === "all" || entry.track === track) && (level === "all" || entry.level === level) && `${entry.title} ${entry.description} ${entry.topic} ${entry.mode}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="platform-page"><div className="platform-shell"><header className="platform-header"><p className="eyebrow"><Shield size={14} /> أمن الذكاء الاصطناعي / دليل المختبرات</p><h1>اعثر على حدّ.<br /><span className="text-emerald-400">واجعله يصمد.</span></h1><p>استكشف {CHALLENGES.length + AGENTIC_MISSIONS.length} مهمة و{GUIDED_LABS.length} مختبرات دفاع موجّهة. ابدأ بدون حساب، واختر نظامًا، وافحص ما الذي يُثبته التنفيذ فعلًا.</p><div className="guided-actions"><Link href="/labs/support-context" className="lab-button lab-button-primary">ابدأ أول مختبر موجّه <ArrowUpRight size={16} /></Link><Link href="/learn/trust-boundaries" className="lab-button lab-button-secondary">تعلّم الأساسيات</Link></div></header>
    <div className="catalogue-availability"><span className="status-dot" /><p>{live.failed ? "تعذّر تأكيد توفر التنفيذ على الخادم. تحقّق من كل مساحة عمل قبل بدء تشغيل مباشر." : live.checked ? `النماذج على الخادم: ${live.llm ? "متاح" : "غير متاح"} · الوكلاء على الخادم: ${live.agentic ? "متاح" : "غير متاح"} · الدفاع المحتسب: ${live.defense ? "متاح" : "غير متاح"}` : "جارٍ التحقق من توفر التنفيذ على الخادم…"} <Link href="/docs#execution">افهم أوضاع التنفيذ ←</Link></p></div>
    <div className="catalogue-filters"><label className="catalogue-search"><Search size={17} aria-hidden="true" /><span className="sr-only">ابحث في كل المختبرات</span><input value={query} onChange={(event) => { setQuery(event.target.value); setExpanded(false); }} placeholder="ابحث في الأنظمة أو المهارات أو المهام…" type="search" /></label><label>المستوى<select value={level} onChange={(event) => { setLevel(event.target.value); setExpanded(false); }}><option value="all">كل المستويات</option>{["Foundation", "Advanced", "Expert"].map((value) => <option key={value} value={value}>{arStage(value)}</option>)}</select></label></div>
    <div className="catalogue-tabs" role="group" aria-label="مسار المختبر">{[["all", "كل المختبرات"], ["guided", "الدفاع الموجّه"], ["llm", "خزنة النماذج"], ["agentic", "مختبر الوكلاء"]].map(([value, label]) => <button key={value} aria-pressed={track === value} onClick={() => { setTrack(value); setExpanded(false); }}>{label}<span>{value === "all" ? entries.length : entries.filter((entry) => entry.track === value).length}</span></button>)}</div><p role="status" className="catalogue-count">{filtered.length} نتيجة · التدريب بلا توقيت ولا ترتيب · أهلية التشغيل المباشر تظهر في كل مساحة عمل</p>
    <div className="catalogue-grid">{(expanded ? filtered : filtered.slice(0, 12)).map((entry) => <article className="catalogue-card" key={entry.id}><div className="catalogue-card-top"><span>{entry.track === "guided" ? "مختبر موجّه" : entry.track === "llm" ? "مهمة نموذج" : "مهمة وكيل"}</span><span>{arStage(entry.level)}</span></div><Link href={entry.href}><h2>{entry.title}<ArrowUpRight size={18} /></h2></Link><p>{entry.description}</p><div className="catalogue-card-tags"><span>{entry.mode}</span><span>{entry.topic}</span>{progress.some((record) => record.id === entry.id) && <span className="text-emerald-300">سُجّل التعلّم</span>}</div><div className="catalogue-card-footer"><Link href={`/learn/${entry.lesson}`}>الدرس التمهيدي</Link><Link href={entry.href}>افتح مساحة العمل ←</Link></div></article>)}</div>
    {filtered.length === 0 && <div className="catalogue-empty"><h2>لا توجد مختبرات مطابقة</h2><p>جرّب مهارة أعم، أو امسح التصفية.</p><button className="lab-button lab-button-secondary" onClick={() => { setQuery(""); setTrack("all"); setLevel("all"); }}>امسح التصفية</button></div>}
    {!expanded && filtered.length > 12 && <button className="lab-button lab-button-secondary mt-8" onClick={() => setExpanded(true)}>اعرض كل النتائج ({filtered.length})</button>}
    <div className="catalogue-bottom"><Link href="/agentic">خريطة تهديدات الوكلاء ←</Link><Link href="/leaderboard">المنافسة الموثّقة ←</Link><Link href="/progress">تابع التعلّم ←</Link></div>
  </div></div>;
}
