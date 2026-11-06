"use client";

import Link from "next/link";
import { LogOut, Archive, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useCohortPlayer } from "@/hooks/useCohortPlayer";
import { isClientFirebaseConfigured } from "@/lib/firebase-client";

const START = Date.parse(process.env.NEXT_PUBLIC_AISYWLC_STARTS_AT ?? "2026-10-02T04:12:08Z");
const END = Date.parse(process.env.NEXT_PUBLIC_AISYWLC_ENDS_AT ?? "2026-10-03T08:30:00Z");
const aoeDate = (utc: number) => new Date(utc - 12 * 3600_000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function countdown(target: number, now: number) {
  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days} يوم ${hours} س ${minutes} د`;
}

export default function AisywlcPage() {
  const [now, setNow] = useState<number | null>(null);
  const cohortPlayer = useCohortPlayer();
  const [error, setError] = useState("");

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (now !== null && now > END) {
    return (
      <div className="cohort-closed min-h-screen pt-16">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="archive-panel">
            <div className="archive-status"><span className="archive-status-dot" /> AISYWLC 2026 <span className="ms-auto">انتهت المسابقة</span></div>
            <div className="archive-content">
              <div className="archive-emblem" aria-hidden="true"><Archive size={40} strokeWidth={1.2} /></div>
              <p className="eyebrow mt-8 mb-4">تحدٍّ منزلي / مكتمل</p>
              <h1 className="font-semibold">انتهت المسابقة.<br /><span>شكرًا لمشاركتك.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">انتهت دفعة AISYWLC 2026 (من المشروع الأصلي)، والحلول الجديدة لم تعد تُحتسب في ترتيبها. وما زال بإمكانك استكشاف المهام الست عشرة نفسها في خزنة النماذج.</p>
              <Link href="/leaderboard?board=aisywlc" className="archive-standings">اعرض الترتيب النهائي لـ AISYWLC <ArrowRight size={14} /></Link>
            </div>
            <div className="archive-footer"><span>احتساب الدفعة / مغلق</span><span>16 مهمة</span></div>
          </div>
          <div className="regular-ctf-invite">
            <div><p className="eyebrow mb-3">تحدّيك التالي</p><h2 className="text-xl font-semibold tracking-tight text-white">الساحة ما زالت مفتوحة.</h2><p className="mt-2 text-sm leading-6 text-slate-400">واصل التعلّم، والعب في خزنة النماذج بدون تسجيل أو مفتاح API.</p></div>
            <Link href="/challenges" className="lab-button lab-button-primary regular-ctf-button">العب في خزنة النماذج <ArrowRight size={18} /></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pt-16 text-white">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="mb-5 inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-300">
          AISYWLC 2026 · Take-home CTF
        </div>
        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
          Break the prompt. Learn the defense.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
          Work through 16 simulated AI security missions, see instant feedback, and compare progress with your AISYWLC cohort. The default evaluator checks published patterns, so scores show mission completion, not a verified measure of security skill.
        </p>

        <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">دفعة AISYWLC</p>
          {!isClientFirebaseConfigured() ? (
            <>
              <p className="mt-2 text-2xl font-bold">التسجيل يُفتح قريبًا</p>
              <p className="mt-2 text-sm text-slate-300">يمكنك استكشاف المهام الآن دون حساب. سيظهر هنا تسجيل الدخول بـ Google والتسجيل في الدفعة عند جاهزيتهما.</p>
            </>
          ) : cohortPlayer.loading ? (
            <p className="mt-2 text-sm text-slate-300">{cohortPlayer.user ? "جارٍ ضمّك إلى الدفعة…" : "جارٍ التحقق من تسجيل الدخول…"}</p>
          ) : !cohortPlayer.user ? (
            <>
              <p className="mt-2 text-sm text-slate-300">سجّل الدخول بـ Google لتنضم إلى AISYWLC 2026 تلقائيًا، ويمكنك اللعب دون حساب أيضًا.</p>
              <button onClick={() => void cohortPlayer.signIn().catch(() => setError("تعذّر بدء تسجيل الدخول بـ Google"))}
                className="mt-4 min-h-11 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950">تابع بـ Google</button>
              <p className="mt-3 text-xs text-slate-400">تسجيل الدخول بـ Google يضمّك إلى الدفعة. ويُحفظ بريدك بشكل خاص لإدارة الدفعة والسحب على الجوائز، ويظهر اسمك الأول في Google علنًا في لوحة المتصدرين.</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-slate-300">{cohortPlayer.handle ? `انضممت باسم ${cohortPlayer.handle} (اسمك الأول في Google، ويظهر علنًا). حلولك الآن تُحتسب في ترتيب AISYWLC.` : "ملفك في الدفعة غير جاهز بعد."}</p>
              {!cohortPlayer.handle && <button onClick={cohortPlayer.retryJoin} className="mt-4 rounded-lg border border-emerald-400/50 px-4 py-2 text-sm text-emerald-300">أعد محاولة التسجيل</button>}
            </>
          )}
          {(error || cohortPlayer.error) && <p role="alert" className="mt-3 text-sm text-red-300">{error || cohortPlayer.error}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <Link href="/challenges" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-300">
              Explore the 16 missions →
            </Link>
            {cohortPlayer.user && (
              <button onClick={() => void cohortPlayer.signOut()}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["مبتدئ · المستوى 3", "أكمل المستويات 1–3"],
            ["أساسي · المستوى 8", "أكمل أي 8 مهام"],
            ["كامل · المستوى 16", "أكمل المهام الست عشرة كلها"],
          ].map(([tier, rule]) => (
            <div key={tier} className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
              <h2 className="text-xl font-bold text-emerald-300">{tier}</h2>
              <p className="mt-2 text-sm text-slate-300">{rule}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 rounded-xl border border-slate-700 p-5 sm:grid-cols-2 sm:p-7">
          <div>
            <h2 className="text-xl font-bold">فترة المسابقة</h2>
            <p className="mt-2 text-sm text-slate-300">{aoeDate(START)} through {aoeDate(END)}, Anywhere on Earth (AoE).</p>
            <p className="mt-3 font-mono text-lg text-emerald-300" aria-live="off">
              {now === null ? "جارٍ تحميل العد التنازلي…" : now < START ? `تبدأ بعد ${countdown(START, now)}` : now <= END ? `تنتهي بعد ${countdown(END, now)}` : "انتهت فترة المسابقة"}
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold">القواعد والخصوصية</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">هاجم هذه المنصة فقط، ولا تختبر الأوامر على أنظمة حقيقية أو حسابات أشخاص آخرين أبدًا. تسجيل الدخول بـ Google يضمّك إلى الدفعة، ويُحفظ بريدك بشكل خاص لإدارة الجوائز ولا يظهر أبدًا في لوحة المتصدرين، ويمكنك طلب حذفه من المنظّم.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
