"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Loader2, Shield, Terminal, ArrowUpRight, Crosshair } from "lucide-react";
import LeaderboardTable from "@/components/LeaderboardTable";
import { LeaderboardEntry } from "@/lib/firestore/leaderboard";
import { useCohortPlayer } from "@/hooks/useCohortPlayer";
import { getClientAuth } from "@/lib/firebase-client";
import { AISYWLC_MISSION_IDS } from "@/lib/challenges";
import { AGENTIC_MISSIONS } from "@/lib/agentic/catalog";
import { formatTimeTaken } from "@/lib/utils";

const COHORT_END = Date.parse(process.env.NEXT_PUBLIC_AISYWLC_ENDS_AT ?? "2026-10-03T08:30:00Z");

function tierProgress(solvedChallenges: string[]) {
  const solved = new Set(solvedChallenges);
  const done = AISYWLC_MISSION_IDS.filter((id) => solved.has(id)).length;
  const starterLeft = AISYWLC_MISSION_IDS.slice(0, 3).filter((id) => !solved.has(id)).length;
  return [
    { name: "مبتدئ · المستوى 3", earned: starterLeft === 0 },
    { name: "أساسي · المستوى 8", earned: done >= 8 },
    { name: "كامل · المستوى 16", earned: done >= AISYWLC_MISSION_IDS.length },
  ];
}

type CohortEntry = { rank: number | null; userId: string; handle: string; avatar: string; college: string; points: number; completedCount: number; firstSolveTime: number | null; lastSolveTime: number | null; tier: string | null; solvedChallenges: string[] };

export default function LeaderboardPage({ searchParams }: { searchParams: Promise<{ board?: string | string[] }> }) {
  const board = use(searchParams).board;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"all" | "week" | "cohort" | "agentic" | "overall" | "legacy">(board === "aisywlc" ? "cohort" : board === "agentic" ? "agentic" : board === "overall" ? "overall" : board === "llm" ? "all" : "legacy");
  const [cohortEntries, setCohortEntries] = useState<CohortEntry[]>([]);
  const [own, setOwn] = useState<CohortEntry | null>(null);
  const cohortPlayer = useCohortPlayer();
  const cohortUid = cohortPlayer.user?.uid;
  const [weekStart, setWeekStart] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const reduceMotion = useReducedMotion();
  const leaders = period === "cohort"
    ? cohortEntries.filter((entry) => entry.rank !== null && entry.rank <= 3).map((entry) => ({ ...entry, username: entry.handle }))
    : entries.filter((entry) => entry.rank <= 3);
  const shownCount = period === "cohort" ? cohortEntries.length : entries.length;
  const [contestOver] = useState(() => Date.now() > COHORT_END);

  useEffect(() => {
    const load = async () => {
      const token = period === "cohort" && cohortUid ? await getClientAuth().currentUser?.getIdToken() : null;
      return fetch(period === "agentic" || period === "overall" || period === "legacy" ? `/api/leaderboard?track=${period}` : period === "cohort" ? "/api/leaderboard?cohort=aisywlc2026" : `/api/leaderboard?period=${period}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    };
    load()
      .then((r) => {
        if (!r.ok) throw new Error("لوحة المتصدرين غير متاحة");
        return r.json();
      })
      .then((data) => {
        setEntries(data.leaderboard ?? []);
        setCohortEntries(period === "cohort" ? data.leaderboard ?? [] : []);
        setOwn(data.own ?? null);
        setWeekStart(data.weekStart ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [period, cohortUid]);

  function selectPeriod(next: "all" | "week" | "cohort" | "agentic" | "overall" | "legacy") {
    if (next === period) return;
    setLoading(true);
    setError(false);
    setEntries([]);
    setPeriod(next);
  }

  return (
    <div className="pt-16 min-h-screen">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="ranking-hero">
          <div><p className="eyebrow mb-5"><Shield size={14} /> أمن الذكاء الاصطناعي / غرفة الترتيب</p><h1 className="font-semibold text-white">لوحة<br /><span className="text-emerald-400">المتصدرين.</span></h1><p className="mt-5 max-w-lg text-sm leading-7 text-slate-400">اكسر القيد، وأكمل المهمة، واحجز مكانك بين من يختبرون حدود الذكاء الاصطناعي.</p></div>
          <div className="ranking-emblem" aria-hidden="true"><span /><span /><Trophy size={48} strokeWidth={1.2} /><p>الترتيب / التحدي</p></div>
        </div>

        <div className="ranking-console-bar"><div className="ranking-periods" role="group" aria-label="فترة الترتيب">
          {(["legacy", "agentic", "overall", "all", "week", "cohort"] as const).map((option) => (
            <button key={option} onClick={() => selectPeriod(option)} aria-pressed={period === option} className={period === option ? "is-active" : ""}>
              {period === option && <motion.span className="ranking-period-active" layoutId="ranking-period" transition={{ duration: reduceMotion ? 0 : 0.25 }} />}
              <span className="relative">{option === "legacy" ? "خزنة النماذج · التاريخي" : option === "overall" ? "الترتيب العام" : option === "agentic" ? "مختبر الوكلاء" : option === "week" ? "هذا الأسبوع" : option === "cohort" ? (contestOver ? "AISYWLC · النهائي" : "AISYWLC 2026") : "خزنة النماذج الموثّق"}</span>
            </button>
          ))}
        </div><span className="ranking-status"><Terminal size={13} /> {loading ? "جارٍ جلب الترتيب" : error ? "الاتصال غير متاح" : `يُعرض ${shownCount} لاعب`}</span></div>
        <p className="mb-4 text-sm text-slate-400">{period === "legacy" || period === "cohort" ? "الترتيب التاريخي يحتفظ بقواعد احتساب سابقة، وقد يشمل التدريب بالمحاكاة، ولا يُثبت اختراق نموذج مباشر." : "الترتيب الجديد لخزنة النماذج يتطلب جلسات مباشرة على الخادم مع تسجيل الدخول. التدريب المجهول والتشغيل بمفتاحك لا يدخلان الترتيب، والترتيب العام يجمع نقاط المسارين الموثّقة."}</p>
        <p className="mb-4 text-center text-sm text-slate-400">
          الترتيب حسب النقاط، ثم عدد المهام المحلولة، ثم أقصر وقت بين أول حل وآخر حل. وعند التعادل، يتقدّم من أنهى أولًا.
        </p>
        {period === "agentic" && <p className="mb-6 text-center text-sm text-slate-400">هجمات على نموذج مباشر وإنجازات دفاعية يتحقق منها الخادم. التدريب بالسيناريو لا يدخل الترتيب. المتاح حاليًا {AGENTIC_MISSIONS.filter((mission) => mission.status === "available").length} مهمة.</p>}
        {period === "overall" && <p className="mb-6 text-center text-sm text-slate-400">مجموع نقاط خزنة النماذج ومختبر الوكلاء. تُدمج الحسابات فقط عند تطابق معرّف المستخدم على الخادم، وأوقات البدء التاريخية المجهولة تبقى مجهولة.</p>}
        {period === "week" && (
          <p className="mb-8 text-center text-sm text-slate-400">
            {weekStart ? `أسبوع ${new Date(weekStart).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", { month: "short", day: "numeric", timeZone: "UTC" })} (UTC). ` : ""}
            حل واحد يقيّمه الخادم لكل لاعب ومهمة أسبوعيًا، بنقاط ثابتة لكل مهمة. ولا يمكن إعادة بناء الحلول التاريخية.
          </p>
        )}
        {period === "cohort" && (
          <div className="mb-8 text-center text-sm text-slate-300">
            <p>{contestOver ? "انتهت المسابقة، وهذا هو الترتيب النهائي." : "إنجازات مهام المسابقة."} نقاط ثابتة لكل مهمة، ونتيجة واحدة لكل مهمة خلال فترة المسابقة.</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {tierProgress(own?.solvedChallenges ?? []).map(({ name, earned }) => (
                <span key={name} className={`rounded-full border px-3 py-1 text-xs ${own && earned ? "border-emerald-400 bg-emerald-400/20 text-emerald-200" : "border-emerald-500/40 text-emerald-300"}`}>
                  {own && earned && "✓ "}{name}
                </span>
              ))}
            </div>
            {own && <p className="mt-4 font-semibold text-emerald-300">ترتيبك: {own.rank === null ? "غير مرتّب" : `#${own.rank}`} · {own.completedCount}/16 مهمة · {own.points} نقطة · {own.tier ?? "لا فئة بعد"}</p>}
          </div>
        )}

        {!loading && !error && leaders.length > 0 && <div className="ranking-podium">
          {[...leaders].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).map((entry) => <motion.div key={entry.userId} data-rank-band="podium" className={`ranking-contender ${entry.rank === 1 ? "ranking-champion" : ""}`} initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.4, delay: reduceMotion ? 0 : ((entry.rank ?? 1) - 1) * 0.08 }}>
            <div className="contender-topline"><span>المركز / {String(entry.rank).padStart(2, "0")}</span>{entry.rank === 1 ? <Trophy size={16} /> : <Crosshair size={16} />}</div>
            <div className="contender-identity"><span className="contender-avatar">{entry.avatar}</span><span className="min-w-0"><span className="block truncate text-base font-semibold text-white" title={entry.username}>{entry.username}</span><span className="text-xs text-slate-400">حلّ {entry.completedCount} مهمة</span></span></div>
            <div className="contender-score">{entry.points.toLocaleString()}<span>نقطة</span></div>
            <div className="contender-trace" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>
          </motion.div>)}
        </div>}

        {loading ? (
          <div role="status" className="ranking-loading flex items-center justify-center py-24 text-slate-400 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            جارٍ تحميل الترتيب…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-6 py-12 text-center text-sm text-red-200">
            لوحة المتصدرين غير متاحة مؤقتًا. حاول مجددًا بعد قليل.
          </div>
        ) : period === "cohort" ? (
          cohortEntries.length === 0 ? <div className="rounded-xl border border-slate-700 p-10 text-center text-slate-300">لا توجد حلول مسجّلة للدفعة بعد.</div> :
          <div className="ranking-table">
            <div className="ranking-row ranking-header">
              <span>الترتيب</span><span>اللاعب</span><span className="ranking-points">النقاط</span><span className="ranking-solved">المحلولة</span><span className="ranking-time">الوقت</span><span className="ranking-active">الفئة</span>
            </div>
            {cohortEntries.map((entry) => <div key={entry.userId} className="ranking-row" data-rank-band={entry.rank !== null && entry.rank >= 1 && entry.rank <= 3 ? "podium" : entry.rank !== null && entry.rank >= 4 && entry.rank <= 10 ? "top-ten" : undefined}>
              <span className="text-slate-400">#{entry.rank}</span>
              <span className="min-w-0"><span className="block truncate font-semibold">{entry.handle}</span>{entry.college && <span className="block truncate text-xs text-slate-400">{entry.college}</span>}{entry.tier && <span className="cohort-tier-inline text-xs text-emerald-300">{entry.tier}</span>}</span>
              <span className="ranking-points font-semibold">{entry.points.toLocaleString()}</span><span className="ranking-solved text-slate-300">{entry.completedCount}</span><span className="ranking-time text-slate-300">{formatTimeTaken(entry.firstSolveTime, entry.lastSolveTime)}</span><span className="ranking-active text-emerald-300">{entry.tier ?? "—"}</span>
            </div>)}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-6 py-16 text-center">
            <p className="text-xl font-bold text-white">لا توجد نتائج في هذه اللوحة بعد</p>
            <p className="mt-2 text-sm text-slate-400">كن أول من يسجّل نتيجة هنا.</p>
            <Link href="/challenges/level-1-basic-injection" className="lab-button lab-button-primary mt-5">العب المستوى 1</Link>
          </div>
        ) : (
          <LeaderboardTable entries={entries} period={period} totalMissions={period === "overall" ? 46 : period === "agentic" ? AGENTIC_MISSIONS.filter((mission) => mission.status === "available").length : undefined} />
        )}

        {/* CTA */}
        <div className="ranking-cta mt-8">
          <p className="text-sm text-slate-400">
            <span className="text-emerald-400 font-semibold">ابدأ اللعب</span> لتظهر في لوحة المتصدرين.{" "}
            <Link href="/challenges" className="text-emerald-400 hover:underline">
              استكشف المهام <ArrowUpRight className="inline h-4 w-4" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
