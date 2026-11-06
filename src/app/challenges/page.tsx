"use client";

import { CHALLENGES, getWeeklyChallenge } from "@/lib/challenges";
import ChallengeCard from "@/components/ChallengeCard";
import { Shield, Info, CalendarDays, Zap, RotateCcw, Share2, Copy, Check, Search, X, Network, ArrowUpRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DIFFICULTY_CONFIG } from "@/lib/challenges";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/hooks/usePlayer";
import { buildGrid } from "@/components/ShareResultCard";
import { use, useState, useSyncExternalStore } from "react";

const initialWeeklyId = CHALLENGES.find((challenge) => challenge.level >= 4)!.id;
const subscribeToWeek = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
};
const getWeeklyId = () => getWeeklyChallenge().id;
const getInitialWeeklyId = () => initialWeeklyId;

import LabCatalogue from "@/components/LabCatalogue";
import { SITE_URL, BRAND } from "@/lib/brand";
import { arAttackType, arDifficulty } from "@/lib/i18n/ar";

export default function ChallengesPage({ searchParams }: { searchParams: Promise<{ track?: string | string[]; view?: string | string[] }> }) {
  const { track, view } = use(searchParams);
  if (track === "llm") return <LlmMissions />;
  if (view === "labs") return <LabCatalogue />;
  return <div className="pt-28 pb-24 min-h-screen"><div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
    <header className="mb-10 sm:mb-14"><p className="eyebrow mb-5"><Shield size={15} /> أمن الذكاء الاصطناعي / غرفة العمليات</p><h1 className="font-semibold text-white">اختر <span className="text-emerald-400">تحدّيك.</span></h1><p className="mt-5 max-w-2xl text-slate-400 leading-7">مساران، ولكل منهما حدود ثقة مختلفة. اختر النظام الذي تريد أن تتحدّى {BRAND.guardian} فيه.</p></header>
    <div className="grid gap-6 md:grid-cols-2">
      <Link href="/challenges?track=llm" aria-label="ادخل خزنة النماذج" className="ctf-track-card" data-track="llm">
        <div className="flex items-center justify-between"><span className="ctf-track-icon"><Shield size={28} strokeWidth={1.5} /></span><span className="font-mono text-xs text-slate-400">01 / النماذج اللغوية</span></div>
        <div><p className="eyebrow mb-3">الأمر / السياق / الرد</p><h2 className="text-3xl sm:text-4xl font-semibold text-white">خزنة النماذج</h2><p className="mt-4 text-slate-400 leading-7">اكسر قيود النموذج بحقن الأوامر، وكسر القيود، واستخراج الأسرار، وتسميم السياق.</p></div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300"><span>حقن الأوامر</span><span>تسميم الاسترجاع</span><span>شرح المدافع</span></div>
        <div className="ctf-track-footer"><span>{CHALLENGES.length} مهمة</span><strong>ادخل خزنة النماذج <ArrowUpRight size={18} /></strong></div>
      </Link>
      <Link href="/agentic" aria-label="ادخل مختبر الوكلاء" className="ctf-track-card" data-track="agentic">
        <div className="flex items-center justify-between"><span className="ctf-track-icon"><Network size={28} strokeWidth={1.5} /></span><span className="font-mono text-xs text-slate-400">02 / الوكلاء المستقلون</span></div>
        <div><p className="eyebrow mb-3">الصلاحية / الإجراء / الدليل</p><h2 className="text-3xl sm:text-4xl font-semibold text-white">مختبر الوكلاء</h2><p className="mt-4 text-slate-400 leading-7">تجاوز حدود وكلاء يستخدمون الأدوات، ويفوّضون العمل، ويتذكّرون. افحص الإجراءات ودافع عن سير العمل.</p></div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300"><span>إساءة الأدوات والهوية</span><span>تسميم الذاكرة</span><span>احتواء الوكيل المارق</span></div>
        <div className="ctf-track-footer"><span>30 مهمة · OWASP Agentic 2026</span><strong>ادخل مختبر الوكلاء <ArrowUpRight size={18} /></strong></div>
      </Link>
    </div>
    <div className="mt-8 flex flex-wrap gap-3"><Link href="/leaderboard" className="lab-button lab-button-primary">المتصدرون <ArrowUpRight size={16} /></Link><Link href="/community" className="lab-button lab-button-secondary">المجتمع</Link><Link href="/challenges?view=labs" className="lab-button lab-button-secondary">كل المختبرات والدفاعات الموجّهة</Link></div>
  </div></div>;
}

function LlmMissions() {
  const { isSolved, solvedIds } = usePlayer();
  const [progressCopied, setProgressCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const filteredChallenges = CHALLENGES.filter((challenge) =>
    (difficulty === "all" || challenge.difficulty === difficulty) &&
    `${challenge.title} ${challenge.description} ${challenge.attackType} ${arAttackType(challenge.attackType).name}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const weeklyId = useSyncExternalStore(subscribeToWeek, getWeeklyId, getInitialWeeklyId);
  const solvedCount = solvedIds.length;
  const nextChallenge = CHALLENGES.find((challenge) => !isSolved(challenge.id)) ?? CHALLENGES[0];
  const weekly = CHALLENGES.find((challenge) => challenge.id === weeklyId)!;
  const diff = DIFFICULTY_CONFIG[weekly.difficulty];
  const shareUrl = `${SITE_URL}/challenges?track=llm`;
  const shareCaption = [`هل تستطيع كسر القاعدة في أحد تحديات ${BRAND.vault} الستة عشر في أمن الذكاء الاصطناعي؟ اختر مهمة وقارن نتيجتك.`, "", shareUrl, "#خزنة_سعفان #أمن_الذكاء_الاصطناعي"].join("\n");
  const encodedCaption = encodeURIComponent(shareCaption);

  return (
    <div className="pt-16 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <div className="mb-8">
          <div className="eyebrow mb-5">
            <Shield className="h-4 w-4" />
            خزنة النماذج · 16 مهمة
          </div>
          <h1 className="font-semibold text-white mb-5">مهام خزنة النماذج</h1><Link href="/leaderboard?board=legacy" className="lab-button lab-button-secondary mb-5 me-3">متصدرو خزنة النماذج <ArrowUpRight size={16} /></Link>
          <Link href="/challenges" className="lab-button lab-button-secondary mb-5"><ArrowLeft size={16} /> غيّر المسار</Link>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            {CHALLENGES.length} تحديًا متدرّج الصعوبة تغطي قائمة OWASP LLM Top 10 (2025) كاملة، من حقن
            الأوامر الأساسي إلى إساءة استخدام أدوات الوكلاء، وتهريب البيانات، وتسميم الاسترجاع، وهجمات سلسلة الإمداد.
          </p>
          {solvedCount > 0 && (
            <button
              onClick={() => {
                const text = [
                  `${buildGrid(solvedIds)} ${solvedCount}/${CHALLENGES.length}`,
                  "تقدّم تعلّم محفوظ على هذا الجهاز فقط.",
                  "",
                  `جرّب التحديات: ${SITE_URL}/challenges`,
                  "#خزنة_سعفان #أمن_الذكاء_الاصطناعي",
                ].join("\n");
                navigator.clipboard.writeText(text);
                setProgressCopied(true);
                setTimeout(() => setProgressCopied(false), 2000);
              }}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold transition-colors"
            >
              <Share2 className="h-4 w-4" />
              {progressCopied ? "تم النسخ!" : `شارك تقدّمك (${solvedCount}/${CHALLENGES.length})`}
            </button>
          )}
        </div>

        <div className="mission-progress-banner mb-10 grid gap-5 border border-emerald-500/25 bg-[#18140f] p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-300">
              {solvedCount === 0 ? "جديد هنا؟ ابدأ بهذه" : solvedCount === CHALLENGES.length ? "أنجزت كل المهام" : `أنجزت ${solvedCount} من ${CHALLENGES.length} · التالية`}
            </p>
            <h2 className="text-xl font-bold text-white">المستوى {nextChallenge.level}: {nextChallenge.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{nextChallenge.description}</p>
            <div className="mission-progress-track" role="progressbar" aria-label="المهام المنجزة" aria-valuenow={solvedCount} aria-valuemin={0} aria-valuemax={CHALLENGES.length}><span style={{ width: `${solvedCount / CHALLENGES.length * 100}%` }} /></div>
          </div>
          <Link href={`/challenges/${nextChallenge.id}`} className="lab-button lab-button-primary">
            {solvedCount === CHALLENGES.length ? "أعد المستوى 1" : solvedCount === 0 ? "العب المستوى 1" : "تابع اللعب"}
            <Zap className="h-4 w-4" />
          </Link>
        </div>

        {/* How it works banner */}
        <details className="mission-howto mb-8">
          <summary><Info className="h-4 w-4" /> كيف تعمل الساحة <span>اقرأ الإيجاز</span></summary>
          <div className="flex items-start gap-3 pt-4">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-slate-400">
            <span className="text-blue-400 font-semibold">طريقة اللعب:</span> كل تحدٍ يقدّم ذكاءً اصطناعيًا مقيّدًا.
            اكتب أمرًا (بالإنجليزية) يخرق قيوده، وستحصل على نتيجة التدريب فورًا. النقاط المحتسبة في الترتيب تتطلب جلسة مباشرة مع تسجيل الدخول.
            واستخدم <span className="text-blue-400">مفتاح المدافع</span> في شاشة اللعب لتقلب المنظور وترى الضوابط التي كانت ستوقف هجومك.
          </p>
        </div>

        </details>

        {/* All challenges grid */}
        <div className="mb-6">
          <div className="library-heading"><h2 className="section-title">مكتبة المهام</h2><span className="font-mono text-xs text-slate-400" aria-live="polite">{filteredChallenges.length} / {CHALLENGES.length} مهمة</span></div>
          <div className="mission-filters">
            <div className="mission-search"><Search size={17} aria-hidden="true" /><input aria-label="ابحث في المهام" type="search" placeholder="ابحث عن نمط هجوم…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="امسح البحث" onClick={() => setQuery("")}><X size={15} /></button>}</div>
            <div className="difficulty-filters" role="group" aria-label="صفِّ حسب الصعوبة">
              {["all", ...Object.keys(DIFFICULTY_CONFIG)].map((level) => <button key={level} aria-pressed={difficulty === level} onClick={() => setDifficulty(level)} className={difficulty === level ? "is-active" : ""}>{level === "all" ? "كل المستويات" : arDifficulty(level)}</button>)}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} solved={isSolved(challenge.id)} />
            ))}
          </div>
        </div>

        {filteredChallenges.length === 0 && <div className="mission-empty"><Search size={26} /><h3>لا توجد مهام مطابقة</h3><p>جرّب نمطًا أو مستوى صعوبة مختلفًا.</p><button className="lab-button lab-button-secondary" onClick={() => { setQuery(""); setDifficulty("all"); }}>أعد ضبط التصفية</button></div>}

        {/* Weekly Challenge */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-400 uppercase tracking-wide">تحدّي الأسبوع</span>
            <span className="text-xs text-slate-500 ms-1">يتغيّر كل يوم اثنين</span>
          </div>
          <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/5 p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xl">{weekly.level >= 6 ? "🔥" : "⭐"}</span>
                <h2 className="text-xl font-bold text-white">{weekly.title}</h2>
                <span className={cn("px-2 py-0.5 rounded text-xs font-semibold border", diff.bg, diff.color)}>
                  {arDifficulty(weekly.difficulty)}
                </span>
                {weekly.level >= 6 && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold border border-pink-400/30 bg-pink-400/10 text-pink-400">
                    موضوع الساعة 2025/26
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400 mb-3">{weekly.description}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-yellow-400" />
                  {weekly.basePoints} نقطة أساسية
                </span>
                <span className="flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" />
                  تدريب بلا توقيت
                </span>
              </div>
            </div>
            <Link
              href={`/challenges/${weekly.id}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-bold text-sm transition-all flex-shrink-0"
            >
              <CalendarDays className="h-4 w-4" />
              العب تحدّي الأسبوع
            </Link>
          </div>
        </div>

        {/* Social share */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Share2 className="h-4 w-4 text-emerald-400" />
                <h2 className="font-bold text-white">شارك التحدي</h2>
              </div>
              <p className="text-sm text-slate-400">تعرف أحدًا يستمتع باختبار حدود أنظمة الذكاء الاصطناعي؟ أرسل له هذا.</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareCaption);
                setCaptionCopied(true);
                setTimeout(() => setCaptionCopied(false), 2000);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              {captionCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {captionCopied ? "تم النسخ!" : "انسخ النص"}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedCaption}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              انشر في X
            </a>
            <a
              href={`https://www.threads.net/intent/post?text=${encodedCaption}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Threads
            </a>
            <a
              href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`${BRAND.vault}: تحدي حقن الأوامر`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Reddit
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
            >
              LinkedIn
            </a>
          </div>
        </div>

        {/* Scoring reference */}
        <div className="mt-12 rounded-xl border border-slate-700 bg-[#241f1a] p-6">
          <h2 className="font-bold text-white mb-4">احتساب النقاط في الترتيب</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="rounded-lg bg-slate-900 p-3">
              <div className="text-emerald-400 font-semibold mb-1">النقاط الأساسية</div>
              <div className="text-slate-400">نقاط ثابتة لكل حل جديد يتحقق منه الخادم</div>
            </div>
            <div className="rounded-lg bg-slate-900 p-3">
              <div className="text-blue-400 font-semibold mb-1">جلسة موثّقة</div>
              <div className="text-slate-400">الخادم يملك المؤقت والسجل والمحاولات والنتيجة</div>
            </div>
            <div className="rounded-lg bg-slate-900 p-3">
              <div className="text-yellow-400 font-semibold mb-1">التدريب والتلميحات</div>
              <div className="text-slate-400">التدريب بلا توقيت لا يدخل الترتيب، والتلميحات لا تغيّر النقاط الأساسية</div>
            </div>
            <div className="rounded-lg bg-slate-900 p-3">
              <div className="text-purple-400 font-semibold mb-1">الرتب</div>
              <div className="text-slate-400">مبتدئ ← محلّل ← مخترق ← فريق أحمر ← قائد الفريق الأحمر</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
