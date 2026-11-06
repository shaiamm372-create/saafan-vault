"use client";

import Link from "next/link";
import {
  Shield,
  Zap,
  Target,
  ArrowRight,
  Terminal,
  Lock,
  Globe,
  BookOpen,
  CalendarDays,
  Copy,
  Check,
  Share2,
  Network,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { CHALLENGES, getWeeklyChallenge, DIFFICULTY_CONFIG } from "@/lib/challenges";
import { ATTACK_TYPE_INFO } from "@/lib/attack-metadata";
import { TOTAL_CHALLENGES } from "@/lib/scoring";
import { OWASP_LLM_TOP_10 } from "@/lib/owasp";
import { AGENTIC_MISSIONS, AGENTIC_THREATS } from "@/lib/agentic/catalog";
import GuidedLabWorkspace from "@/components/GuidedLabWorkspace";
import { GUIDED_LABS } from "@/lib/guided-labs";
import { LESSONS, FOUNDATION_PATH } from "@/lib/learning";
import { trackEvent } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { arAttackType, arDifficulty } from "@/lib/i18n/ar";
import { SITE_URL } from "@/lib/brand";

interface LiveStats {
  totalPlayers: number;
  totalSolves: number;
  recentActivity: { username: string; avatar: string; completedCount: number; lastSolveTime: number }[];
}

const initialWeeklyId = CHALLENGES.find((challenge) => challenge.level >= 4)!.id;
const subscribeToWeek = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
};
const getWeeklyId = () => getWeeklyChallenge().id;
const getInitialWeeklyId = () => initialWeeklyId;

function relativeTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `قبل ${s} ث`;
  const m = Math.floor(s / 60);
  if (m < 60) return `قبل ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return `قبل ${Math.floor(h / 24)} يوم`;
}

const FEATURES = [
  {
    icon: Terminal,
    title: "تدرّب وخذ النتيجة فورًا",
    description:
      "اكتب هجومك في خزنة النماذج، أو شغّل برنامج أدوات محدودًا في مختبر الوكلاء. تدرّب بدون أي مفتاح API، ثم افحص النتيجة والدليل.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    icon: Lock,
    title: "مساران مبنيان على OWASP",
    description:
      "استكشف أخطر 10 مخاطر للنماذج اللغوية (OWASP LLM Top 10 لعام 2025) وأخطر 10 مخاطر للوكلاء (Agentic Top 10 لعام 2026) عبر 16 مهمة للنماذج و30 مهمة للوكلاء.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Globe,
    title: "لوحة متصدرين مباشرة",
    description:
      "قارن الترتيب في خزنة النماذج ومختبر الوكلاء، أو تابع الترتيب العام للمسارين. التدريب بالمحاكاة لا يدخل في الترتيب.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    icon: BookOpen,
    title: "شرح تعليمي لكل مهمة",
    description:
      "اطّلع على نمط الهجوم، والنتيجة، والضابط الدفاعي الذي يسدّ الثغرة في كل تحدٍ.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
];

export default function HomePage() {
  const [live, setLive] = useState<LiveStats | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [selectedVector, setSelectedVector] = useState(0);
  const vectors = Object.entries(ATTACK_TYPE_INFO);
  const [vectorType, vector] = vectors[selectedVector];
  const vectorMission = CHALLENGES.find((challenge) => challenge.attackType === vectorType);
  const reduceMotion = useReducedMotion();
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 120, damping: 22 });
  const rotateY = useSpring(tiltY, { stiffness: 120, damping: 22 });
  const lightX = useMotionValue(65);
  const lightY = useMotionValue(35);
  const spotlight = useMotionTemplate`radial-gradient(500px circle at ${lightX}% ${lightY}%, rgba(224,176,74,0.09), transparent 75%)`;
  const weeklyId = useSyncExternalStore(subscribeToWeek, getWeeklyId, getInitialWeeklyId);
  const weekly = CHALLENGES.find((challenge) => challenge.id === weeklyId)!;
  useEffect(() => {
    trackEvent("landing", "landing");
    if (localStorage.getItem("ctf_visited")) trackEvent("return_visit", "return_visit");
    localStorage.setItem("ctf_visited", "1");
    fetch("/api/stats/global")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LiveStats | null) => d && setLive(d))
      .catch(() => {});
  }, []);

  const totalMissions = TOTAL_CHALLENGES + AGENTIC_MISSIONS.length;
  const STATS = [
    { label: "مهمة تنتظرك", value: String(totalMissions), icon: Target },
    { label: "مساران للتحدي", value: "2", icon: Network },
    { label: "فئة مخاطر من OWASP", value: `${OWASP_LLM_TOP_10.length} + ${AGENTIC_THREATS.length}`, icon: Shield },
    { label: "للبدء بالتدريب", value: "بدون تسجيل", icon: Zap },
  ];
  const shareUrl = `${SITE_URL}/challenges`;
  const shareCaption = `هل تستطيع خداع سعفان وفتح خزنته؟ ${totalMissions} مهمة في أمن الذكاء الاصطناعي، بين خزنة النماذج ومختبر الوكلاء: ${shareUrl}`;
  const encodedShareCaption = encodeURIComponent(shareCaption);

  async function shareCtf() {
    if (navigator.share) {
      await navigator.share({
        title: BRAND.vault,
        text: shareCaption,
        url: shareUrl,
      }).then(() => trackEvent("share")).catch(() => {});
      return;
    }

    await navigator.clipboard.writeText(shareCaption);
    trackEvent("share");
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  return (
    <div className="home-page">
      <section className="hero-section hero-command" onPointerMove={(event) => {
        if (reduceMotion || event.pointerType !== "mouse") return;
        const bounds = event.currentTarget.getBoundingClientRect();
        lightX.set((event.clientX - bounds.left) / bounds.width * 100);
        lightY.set((event.clientY - bounds.top) / bounds.height * 100);
      }}>
        <motion.div className="hero-spotlight" style={{ background: spotlight }} aria-hidden="true" />
        <div className="hero-halo" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow hero-reveal"><span className="status-dot" /> {BRAND.owner}</div>
              <h1 className="hero-title hero-reveal">اخترق<br /><span>خزنة سعفان.</span></h1>
              <p className="hero-subtitle hero-reveal">وبعدها تعلّم كيف تحميها.</p>
              <p className="hero-description hero-reveal">{BRAND.guardian} حارس الخزنة: نموذج ذكاء اصطناعي يتبع التعليمات، ووكيل ينفّذ الأوامر. اكتشف حدوده عبر {totalMissions} مهمة في خزنة النماذج ومختبر الوكلاء، ثم تعلّم كيف تحمي هذه الحدود.</p>
              <div className="hero-actions hero-reveal">
                <Link href="/challenges" className="lab-button lab-button-primary">ابدأ التحدي <ArrowRight className="h-4 w-4" /></Link>
              </div>
              <div className="hero-proof hero-reveal"><span><Check className="h-3 w-3" /> مجاني</span><span><Check className="h-3 w-3" /> بدون مفتاح API</span><span><Check className="h-3 w-3" /> نتيجة فورية</span></div>
            </div>
            <div className="mission-stage hero-reveal" data-preview={previewStep}>
              <div className="hologram-floor" aria-hidden="true" />
              <svg className="signal-constellation" viewBox="0 0 680 700" fill="none" aria-hidden="true">
                <path className="constellation-route" d="M25 210H85L140 265H200M655 150H585L535 200H470M640 540H570L510 480H455" />
                <path className="constellation-packets" d="M25 210H85L140 265H200M655 150H585L535 200H470M640 540H570L510 480H455" />
                <circle cx="25" cy="210" r="5" /><circle cx="655" cy="150" r="5" /><circle cx="640" cy="540" r="5" />
                <circle className="constellation-ring" cx="340" cy="350" r="305" />
              </svg>
              <div className="signal-chip signal-chip-system" aria-hidden="true"><Lock size={13} /><span>سياسة النظام</span><i /></div>
              <div className="signal-chip signal-chip-user" aria-hidden="true"><Terminal size={13} /><span>مدخل غير موثوق</span><i /></div>
              <div className="signal-chip signal-chip-defense" aria-hidden="true"><Shield size={13} /><span>حدّ الثقة</span><i /></div>
              <div className="mission-orbit" aria-hidden="true"><span /><span /><span /></div>
              <svg className="security-perimeter" viewBox="0 0 600 600" fill="none" aria-hidden="true">
                <circle className="perimeter-track" cx="300" cy="300" r="282" />
                <circle className="perimeter-sweep" cx="300" cy="300" r="282" />
                <path className="perimeter-bracket" d="M72 110V72H110M490 72H528V110M528 490V528H490M110 528H72V490" />
                <g className="perimeter-ticks"><path d="M300 9V24M576 300H591M300 576V591M9 300H24" /></g>
              </svg>
              <motion.div className="mission-window" style={{ rotateX: reduceMotion ? 0 : rotateX, rotateY: reduceMotion ? 0 : rotateY }} onPointerMove={(event) => {
                if (reduceMotion || event.pointerType !== "mouse") return;
                const bounds = event.currentTarget.getBoundingClientRect();
                tiltX.set((0.5 - (event.clientY - bounds.top) / bounds.height) * 7);
                tiltY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 9);
              }} onPointerLeave={() => { tiltX.set(0); tiltY.set(0); }}>
                <div className="console-scan" aria-hidden="true" />
                <div className="mission-window-bar"><div className="window-dots" aria-hidden="true"><i /><i /><i /></div><span>خزنة النماذج / MATHBOT</span><span className="flex items-center gap-1.5 text-emerald-400"><span className="status-dot" /> جاهز</span></div>
                <div className="mission-target"><div className="target-icon shield-scanner"><Shield className="h-7 w-7" /></div><div><p className="eyebrow">لمحة من خزنة النماذج</p><h2>تعرّف على MathBot.</h2></div><span className="mission-level" aria-hidden="true">01<span>/ 16</span></span></div>
                <div className="mission-tabs" role="tablist" aria-label="لمحة عن المهمة">
                  {["راقب", "هاجم", "تعلّم"].map((label, index) => <button key={label} id={`mission-tab-${index}`} role="tab" aria-label={`${label}: لمحة المهمة`} aria-selected={previewStep === index} aria-controls="mission-preview-panel" tabIndex={previewStep === index ? 0 : -1} onClick={() => setPreviewStep(index)} onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const next = (index + (event.key === "ArrowRight" ? 1 : 2)) % 3; setPreviewStep(next); document.getElementById(`mission-tab-${next}`)?.focus(); } }} className={previewStep === index ? "is-active" : ""}><span aria-hidden="true">0{index + 1}</span>{label}</button>)}
                </div>
                <div id="mission-preview-panel" role="tabpanel" aria-labelledby={`mission-tab-${previewStep}`} className="mission-preview-panel" tabIndex={0}>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={previewStep} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
                      <p className="terminal-label">{["قيد النظام", "هدفك", "منظور المدافع"][previewStep]}</p>
                      <p className="terminal-line">{["أجب فقط عن أسئلة الرياضيات.", "اجعل MathBot يجيب عن موضوع خارج الرياضيات.", "افحص النتيجة، وتعلّم أي حماية كانت بتوقف الهجوم."][previewStep]}</p>
                      <div className="terminal-prompt"><span>❯</span><span>{["افحص الحدّ", "اكتب نص الهجوم", "افهم لماذا نجح أو فشل"][previewStep]}</span><span className="terminal-cursor" aria-hidden="true" /></div>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="boundary-map" aria-hidden="true" data-stage={previewStep}>
                  <span className="boundary-node"><Terminal size={15} /> الأمر</span>
                  <span className="boundary-wire prompt-signal" />
                  <span className="boundary-node boundary-shield"><Shield size={18} /> الحدّ</span>
                  <span className="boundary-wire" />
                  <span className="boundary-node"><Target size={15} /> الرد</span>
                </div>
                <div className="mission-window-footer"><span>تدريب بالمحاكاة · مبتدئ</span><Link href="/challenges">ابدأ التحدي <ArrowRight className="h-4 w-4" /></Link></div>
              </motion.div>
              <div className="mission-caption"><span className="h-px w-8 bg-slate-600" /> اكتشف الحدّ، وانطلق في المهمة.</div>
            </div>
          </div>
          <div className="hero-stats">
            {STATS.map((stat) => <div key={stat.label}><div className="stat-value">{stat.value}</div><div className="stat-label">{stat.label}</div></div>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 pt-12 pb-8" aria-label="مسارات التحدي">
        <div className="section-heading mb-8"><p className="eyebrow mb-4">مساران / غرفة عمليات واحدة</p><h2 className="section-title mb-3">النماذج تفكّر. الوكلاء ينفّذون.</h2><p className="text-slate-400">اختر الحدود التي تريد اختبارها.</p></div>
        <div className="grid gap-6 md:grid-cols-2">
          <article className="lab-panel p-7 sm:p-9"><div className="flex items-center justify-between mb-6"><Shield size={30} strokeWidth={1.5} className="text-emerald-400" /><span className="font-mono text-xs text-slate-400">{TOTAL_CHALLENGES} مهمة</span></div><h3 className="text-3xl font-semibold text-white">خزنة النماذج</h3><p className="mt-4 text-slate-400 leading-7">اختبر ما يقوله النموذج. اكتب هجمات حقن الأوامر، واستخرج المعلومات المحمية، وسمّم السياق المسترجَع.</p><p className="mt-6 text-sm text-emerald-300">تحديات أوامر · نتيجة فورية · شرح من منظور المدافع</p><Link href="/challenges?track=llm" className="lab-button lab-button-secondary mt-6">ادخل خزنة النماذج <ArrowRight size={16} /></Link></article>
          <article className="lab-panel p-7 sm:p-9"><div className="flex items-center justify-between mb-6"><Network size={30} strokeWidth={1.5} className="text-blue-400" /><span className="font-mono text-xs text-slate-400">{AGENTIC_MISSIONS.length} مهمة</span></div><h3 className="text-3xl font-semibold text-white">مختبر الوكلاء</h3><p className="mt-4 text-slate-400 leading-7">اختبر ما يفعله الوكيل. استكشف إساءة استخدام الأدوات، وانتحال الهوية، وتسميم الذاكرة، واحتواء الوكيل المارق.</p><p className="mt-6 text-sm text-blue-300">سجل تنفيذ الأدوات · بيئة وهمية جديدة كل مرة · إعادة التشغيل بالدفاع</p><Link href="/agentic" className="lab-button lab-button-secondary mt-6">ادخل مختبر الوكلاء <ArrowRight size={16} /></Link></article>
        </div>
        <div className="mt-8"><Link href="/challenges" className="lab-button lab-button-primary">ابدأ التحدي <ArrowRight size={17} /></Link><Link href="/leaderboard" className="lab-button lab-button-secondary ms-3">المتصدرون <ArrowRight size={17} /></Link><Link href="/community" className="lab-button lab-button-secondary ms-3">المجتمع <ArrowRight size={17} /></Link><p className="mt-4 text-xs leading-6 text-slate-400">تختار خزنة النماذج أو مختبر الوكلاء في الشاشة التالية. التدريب مجاني ولا يدخل في الترتيب. التشغيل المباشر على نموذج حقيقي يحتاج تسجيل دخول موثّق وتوفّر الخادم.</p></div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-12"><div className="home-learning-path"><div><p className="eyebrow">مسار تعلّم أول متكامل</p><h2>{FOUNDATION_PATH.title}</h2><p>{FOUNDATION_PATH.summary}</p><span>{LESSONS.length} دروس · {FOUNDATION_PATH.minutes} دقيقة قراءة · 3 مختبرات دفاع موجّهة</span></div><ol>{LESSONS.slice(0, 3).map((lesson, index) => <li key={lesson.slug}><Link href={`/learn/${lesson.slug}`}><span>0{index + 1}</span>{lesson.title}<ArrowRight size={14} /></Link></li>)}</ol><Link href="/learn" className="lab-button lab-button-secondary">استكشف المسار كامل <ArrowRight size={16} /></Link></div></section>


      <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-12"><div className="section-heading mb-8"><p className="eyebrow mb-4">تدريب دفاعي موجّه</p><h2 className="section-title mb-3">ابنِ دفاعًا فعّالًا.</h2><p className="text-slate-400">جرّب بيئة اصطناعية آمنة بجانب التحديات. بدون حساب وبدون مفتاح API.</p></div><GuidedLabWorkspace lab={GUIDED_LABS[0]} compact /></section>

      {/* Weekly Challenge Banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {(() => {
          const diff = DIFFICULTY_CONFIG[weekly.difficulty];
          return (
            <Link
              href={`/challenges/${weekly.id}`}
              className="weekly-rail group flex items-center justify-between gap-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5 sm:p-6"
            >
              <div className="flex items-center gap-4">
                <CalendarDays className="h-8 w-8 text-yellow-400 flex-shrink-0" />
                <div>
                  <div className="text-xs font-bold text-yellow-400 uppercase tracking-wide mb-1">
                    تحدّي الأسبوع
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-bold text-lg">{weekly.title}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${diff.bg} ${diff.color}`}>
                      {arDifficulty(weekly.difficulty)}
                    </span>
                    <span className="text-slate-400 text-sm">{weekly.basePoints} نقطة</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm group-hover:gap-3 transition-all">
                العب الآن <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          );
        })()}
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 py-16 sm:py-20">
        <div className="section-heading mb-8"><p className="eyebrow mb-4">{vectors.length} نوعًا من الهجمات / ساحة واحدة</p><h2 className="section-title mb-3">تعلّم الهجوم.<br />وفكّر مثل المدافع.</h2><p className="text-slate-400">استكشف الأنماط وراء حقن الأوامر، وإساءة استخدام الأدوات، وكل المخاطر بينهما.</p></div>
        <div className="vector-tabs" role="tablist" aria-label="أنواع الهجمات">
          {vectors.map(([key], index) => <button key={key} id={`vector-tab-${index}`} role="tab" aria-selected={selectedVector === index} aria-controls="vector-panel" tabIndex={selectedVector === index ? 0 : -1} className={selectedVector === index ? "is-active" : ""} onClick={() => setSelectedVector(index)} onKeyDown={(event) => { if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? vectors.length - 1 : (index + (event.key === "ArrowRight" ? 1 : vectors.length - 1)) % vectors.length; setSelectedVector(next); const tab = document.getElementById(`vector-tab-${next}`); tab?.focus({ preventScroll: true }); tab?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" }); } }}><span>{String(index + 1).padStart(2, "0")}</span>{arAttackType(key).name}</button>)}
        </div>
        <div id="vector-panel" className="vector-explorer" role="tabpanel" aria-labelledby={`vector-tab-${selectedVector}`} tabIndex={0}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={vectorType} className="vector-detail" initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
              <div><div className="vector-symbol"><Target className="h-7 w-7" /></div><p className="eyebrow mt-6 mb-3">الهجوم {String(selectedVector + 1).padStart(2, "0")} / {vectors.length}</p><h3 className="text-2xl font-semibold tracking-tight text-white">{arAttackType(vectorType).name}</h3><p className="mt-1 text-xs text-slate-500"><span className="ltr inline-block">{vector.name}</span></p></div>
              <div className="flex flex-col justify-center"><p className="text-sm leading-7 text-slate-300">{arAttackType(vectorType).description}</p><Link href={vectorMission ? `/challenges/${vectorMission.id}` : "/learn"} className="vector-mission-link">{vectorMission ? `جرّب المهمة ${String(vectorMission.level).padStart(2, "0")}` : "استكشف دليل التعلّم"}<ArrowRight className="h-4 w-4" /></Link></div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Recent activity — real solves only, hidden when there's none */}
      {live && live.recentActivity.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="rounded-xl border border-slate-700 bg-[#241f1a] p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-emerald-400">آخر النشاطات</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              {live.recentActivity.map((a, i) => (
                <div
                  key={`${a.username}-${a.lastSolveTime}-${i}`}
                  className="flex items-start gap-2 rounded-lg bg-slate-900 p-3"
                >
                  <span>🏴</span>
                  <div>
                    <div className="text-slate-300">
                      <span className="font-semibold text-white">{a.username}</span> — حلّ {a.completedCount} من {TOTAL_CHALLENGES}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{relativeTime(a.lastSolveTime)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="section-heading mb-10">
          <h2 className="section-title mb-3">هاجم. افحص. افهم.</h2>
          <p className="text-slate-400">
            مبنية على أبحاث حقيقية في أمن الذكاء الاصطناعي. استكشف قيود النماذج وحدود الثقة عند الوكلاء عبر سيناريوهات تدريب معزولة وآمنة.
          </p>
        </div>
        <div className="feature-bento">
          {FEATURES.map((feature, index) => (
            <div
              key={feature.title}
              className={`lab-panel feature-card p-7 flex gap-4 ${index === 0 ? "feature-command" : ""}`}
            >
              <div className={`flex-shrink-0 h-10 w-10 rounded-lg ${feature.bg} flex items-center justify-center`}>
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <div>
                <h3 className="font-bold text-white mb-1.5">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                {index === 0 && <div className="feature-schematic" aria-hidden="true"><span><Terminal size={24} />الأمر</span><i /><span><Shield size={24} />التقييم</span><i /><span><BookOpen size={24} />النتيجة</span></div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-10">
          <div className="mt-8 rounded-2xl border border-emerald-500/25 bg-slate-900/80 p-4 text-start shadow-2xl shadow-emerald-950/20 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">تعرف أحدًا يظن أنه أذكى من سعفان؟</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">أرسل له التحدي. التدريب بدون تسجيل وبدون مفتاح API، ويختار بين خزنة النماذج ومختبر الوكلاء.</p>
                </div>
              </div>
              <button
                onClick={shareCtf}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                {shareCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {shareCopied ? "تم نسخ النص" : "شارك صديقك"}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800 pt-4 sm:grid-cols-4">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodedShareCaption}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                انشر في X
              </a>
              <a
                href={`https://www.threads.net/intent/post?text=${encodedShareCaption}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                Threads
              </a>
              <a
                href={`https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(`${BRAND.vault}: تحدي أمن الذكاء الاصطناعي`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                Reddit
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-700 px-3 py-2 text-center text-xs font-semibold text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                LinkedIn
              </a>
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(shareCaption);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              className="mx-auto mt-3 flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
            >
              {shareCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {shareCopied ? "تم النسخ — الصقه حيث تريد" : "انسخ النص بدلًا من ذلك"}
            </button>
          </div>
      </section>

      {/* About */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800">
        <div className="max-w-3xl mx-auto text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/30 border-2 border-slate-600 flex items-center justify-center text-xl font-bold mx-auto mb-5">
            <Shield className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">{BRAND.owner}</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            بنينا {BRAND.vault} لنجعل مفاهيم أمن الذكاء الاصطناعي ملموسة وقابلة للتجربة، فلفهم حقن الأوامر نظريًا شأن،
            ولكتابة هجوم ينجح فعلًا شأن آخر تمامًا. وبعد كل هجوم تجرّبه هنا، تتعلّم كيف تسدّ ثغرته.
          </p>
          <p className="text-slate-500 text-sm leading-7">
            منطق التقييم وقيود التحديات والمحتوى التعليمي تعكس أنماط هجوم حقيقية موثّقة في OWASP LLM Top 10 و MITRE ATLAS.
            المنصة نسخة عربية مكيّفة من المشروع مفتوح المصدر{" "}
            <a href={BRAND.upstream.url} target="_blank" rel="noopener noreferrer" className="ltr inline-block underline underline-offset-4">{BRAND.upstream.name}</a>{" "}
            من تطوير <span className="ltr inline-block">{BRAND.upstream.author}</span> (ترخيص MIT).
          </p>
        </div>
      </section>
    </div>
  );
}
