"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Shield } from "lucide-react";
import { AGENTIC_MISSIONS, AGENTIC_THREATS } from "@/lib/agentic/catalog";
import { useAgenticProgress } from "@/hooks/useAgenticProgress";
import { AgenticErrorBoundary, AgenticFailureNotice } from "@/components/AgenticMissionScreen";
import { useCohortPlayer } from "@/hooks/useCohortPlayer";
import { AR_MISSION_TITLES, AR_THREATS } from "@/lib/i18n/agentic-ar";
import { arRole, arStage } from "@/lib/i18n/ar";

export default function AgenticCatalog() {
  return <AgenticErrorBoundary><AgenticCatalogContents /></AgenticErrorBoundary>;
}

function AgenticCatalogContents() {
  const player = useCohortPlayer();
  const progress = useAgenticProgress(player.user);
  const [signInError, setSignInError] = useState(false);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [role, setRole] = useState("all");
  const selected = AGENTIC_MISSIONS.filter((mission) => (stage === "all" || mission.stage === stage) && (role === "all" || mission.role === role) && `${mission.title} ${AR_MISSION_TITLES[mission.id] ?? ""} ${mission.code} ${AGENTIC_THREATS.find((threat) => threat.code === mission.code)?.name} ${AR_THREATS[mission.code] ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  if (signInError || progress.error) return <AgenticFailureNotice detail={signInError ? "تعذّر بدء تسجيل الدخول." : "تعذّر تحميل التقدّم المحتسب."} />;
  return <>
    <div className="agentic-preview-banner"><div><strong>{progress.ranked.length}/30 محتسبة · {progress.practice.length}/30 تدريب</strong><p>تقدّم التدريب محفوظ على هذا الجهاز، والإنجازات المحتسبة تأتي من حسابك الموثّق.</p>{progress.ranked.length === 30 && <p className="text-emerald-300">مُكمِل مختبر الوكلاء · أنجزت المهام الثلاثين المحتسبة</p>}{progress.practice.length === 30 && <p>اكتملت دورة التدريب · غير محتسبة</p>}</div>{!player.user && <button className="lab-button lab-button-secondary" onClick={() => void player.signIn().catch(() => setSignInError(true))}>سجّل الدخول للتقدّم المحتسب</button>}</div>
    <div className="flex flex-wrap gap-3 mb-6"><input aria-label="ابحث في مهام الوكلاء" placeholder="ابحث في المهام أو التهديدات…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 w-full sm:w-auto flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3" /><select aria-label="صعوبة المهمة" value={stage} onChange={(event) => setStage(event.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">{["all", "Foundation", "Advanced", "Expert"].map((value) => <option key={value} value={value}>{value === "all" ? "كل المستويات" : arStage(value)}</option>)}</select><select aria-label="دور المهمة" value={role} onChange={(event) => setRole(event.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3">{["all", "attacker", "defender"].map((value) => <option key={value} value={value}>{value === "all" ? "كل الأدوار" : arRole(value)}</option>)}</select></div>
    <section aria-label="مهام تهديدات الوكلاء من OWASP" className="agentic-threat-grid">{AGENTIC_THREATS.filter((threat) => selected.some((mission) => mission.code === threat.code)).map((threat) => <article key={threat.code} className="agentic-threat-card"><div className="agentic-threat-heading"><span>{threat.code} · {AGENTIC_MISSIONS.filter((mission) => mission.code === threat.code && progress.ranked.includes(mission.id)).length}/3 محتسبة</span><Shield size={17} /></div><h2>{AR_THREATS[threat.code] ?? threat.name}</h2><p className="text-xs text-slate-500 -mt-2 mb-3"><span className="ltr inline-block">{threat.name}</span></p><div className="agentic-mission-list">{selected.filter((mission) => mission.code === threat.code).map((mission) => <Link className="agentic-mission-link available" key={mission.id} href={`/agentic/${mission.id}`}><span><small>{arStage(mission.stage)} · {arRole(mission.role)} · {mission.points} نقطة</small><strong>{AR_MISSION_TITLES[mission.id] ?? mission.title}</strong><small>{progress.ranked.includes(mission.id) ? "✓ أُنجزت محتسبة" : progress.practice.includes(mission.id) ? "✓ أُنجزت تدريبًا · غير محتسبة" : "جاهزة للعب"}</small></span><span className="agentic-mission-action"><ArrowUpRight size={16} /></span></Link>)}</div></article>)}</section>
    {selected.length === 0 && <div className="agentic-notice">لا توجد مهام مطابقة. <button className="underline text-emerald-300" onClick={() => { setSearch(""); setStage("all"); setRole("all"); }}>امسح التصفية</button></div>}
  </>;
}
