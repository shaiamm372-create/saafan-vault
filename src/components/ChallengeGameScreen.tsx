"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock, Lightbulb, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  AlertTriangle, Terminal, Info, Shield, Eye, EyeOff, Swords,
  ArrowRight, LayoutGrid, Share2, Trophy, Bot,
} from "lucide-react";
import Link from "next/link";
import { Challenge, AttackResult, AttemptRecord, ConversationMessage } from "@/types";
import { CHALLENGES, DIFFICULTY_CONFIG } from "@/lib/challenges";
import { formatTime } from "@/lib/scoring";
import { ATTACK_TYPE_INFO } from "@/lib/attack-metadata";
import { cn, trackEvent } from "@/lib/utils";
import { usePlayer } from "@/hooks/usePlayer";
import { useCohortPlayer } from "@/hooks/useCohortPlayer";
import {
  type LlmSettings,
  getLlmSettings,
  isLlmGradingActive,
  gradeAttackWithLLM,
} from "@/lib/llm-grading-client";

import ChatInterface from "./ChatInterface";
import AttackVisualizer from "./AttackVisualizer";
import DefenseView from "./DefenseView";
import { saveLearningProgress } from "@/lib/learning-progress";
import ShareResultCard from "./ShareResultCard";
import SafeMarkdownExfiltrationView from "./SafeMarkdownExfiltrationView";
import IsolatedHtmlSandboxView from "./IsolatedHtmlSandboxView";
import CopyTextButton from "./CopyTextButton";
import LlmKeySettings from "./LlmKeySettings";
import { SITE_URL } from "@/lib/brand";
import { arAttackType, arDifficulty } from "@/lib/i18n/ar";

interface Props {
  challenge: Challenge;
  challengerName?: string;
}

const PERSONA_NAMES: Record<string, string> = {
  "level-1-basic-injection": "MathBot",
  "level-2-roleplay-jailbreak": "SafeGuard AI",
  "level-3-intent-drift": "WealthGuard",
  "level-4-token-smuggling": "CorpBot",
  "level-5-multi-vector": "UltraBot",
  "level-6-indirect-injection": "DocuBot",
  "level-7-agent-tool-abuse": "AgentX",
};

const COHORT_START = Date.parse(process.env.NEXT_PUBLIC_AISYWLC_STARTS_AT ?? "2026-10-02T04:12:08Z");
const COHORT_END = Date.parse(process.env.NEXT_PUBLIC_AISYWLC_ENDS_AT ?? "2026-10-03T08:30:00Z");

export default function ChallengeGameScreen({ challenge, challengerName }: Props) {
  const [prompt, setPrompt] = useState("");
  const [timeLeft, setTimeLeft] = useState(challenge.timeLimit);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AttackResult | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showDefense, setShowDefense] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rankedAvailable, setRankedAvailable] = useState(false);
  const [modeError, setModeError] = useState("");
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [cohortCounted, setCohortCounted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [llmSettings, setLlmSettings] = useState<LlmSettings | null>(null);
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  // Hydrate the per-viewer LLM key setting from localStorage after mount
  // (unavailable during SSR) — same external-store sync pattern as usePlayer.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLlmSettings(getLlmSettings());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Start on the first submitted attempt so a new player can read the mission.
  const startTimeRef = useRef<number | null>(null);
  const sessionExpiryRef = useRef(0);
  const { player, solvedIds, markSolved, isSolved, loaded } = usePlayer();
  const cohortPlayer = useCohortPlayer();
  const cohortHandle = cohortPlayer.user ? cohortPlayer.handle : null;
  const [contestOpen] = useState(() => { const now = Date.now(); return now >= COHORT_START && now <= COHORT_END; });
  const cohortSignInNeeded = contestOpen && !cohortPlayer.loading && !cohortHandle;

  const diff = DIFFICULTY_CONFIG[challenge.difficulty];
  const isMultiTurn = challenge.isMultiTurn ?? false;
  const solved = result?.success === true;
  const persona = PERSONA_NAMES[challenge.id] ?? "المساعد";
  const alreadySolved = loaded && isSolved(challenge.id);
  const winningAttempt = [...attempts].reverse().find((attempt) => attempt.success);
  const successfulExchange = result?.success && winningAttempt
    ? `PROMPT\n${winningAttempt.prompt}\n\nAI RESPONSE\n${result.aiResponse}`
    : "";

  // Next challenge
  const currentIndex = CHALLENGES.findIndex((c) => c.id === challenge.id);
  const nextChallenge = CHALLENGES[currentIndex + 1] ?? null;

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    trackEvent("challenge_open", `challenge_${challenge.id}`);
    if (challengerName) trackEvent("referral_visit", `referral_${challenge.id}`);
  }, [challenge.id, challengerName]);

  const startTimer = useCallback(() => {
    if (startTimeRef.current !== null) return;
    startTimeRef.current = Date.now();
    setTimerStarted(true);
    timerRef.current = setInterval(() => {
      setTimeLeft(() => {
        const remaining = Math.max(0, Math.ceil((sessionExpiryRef.current - Date.now()) / 1000));
        if (remaining === 0) { stopTimer(); setGameOver(true); }
        return remaining;
      });
      setTimeElapsed(Math.floor((Date.now() - (startTimeRef.current ?? Date.now())) / 1000));
    }, 1000);
  }, [stopTimer]);

  useEffect(() => stopTimer, [stopTimer]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/attack/evaluate", { signal: controller.signal }).then((r) => r.json()).then((data) => setRankedAvailable(data.rankedAvailable === true)).catch(() => {});
    return () => controller.abort();
  }, []);

  async function startRanked() {
    setModeError("");
    setIsSubmitting(true);
    try {
      if (!cohortPlayer.user) { await cohortPlayer.signIn(); return; }
      const token = await cohortPlayer.token();
      const response = await fetch("/api/attack/evaluate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ challengeId: challenge.id, action: "start" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      stopTimer(); startTimeRef.current = null;
      setSessionId(data.sessionId); setConversation([]); setResult(null); setAttempts([]); setGameOver(false); setTimeLeft(20 * 60); setTimerStarted(false); setScoreSubmitted(false);
      sessionExpiryRef.current = data.expiresAt;
      startTimer();
      setLlmSettings(null);
    } catch (error) { setModeError(error instanceof Error ? error.message : "تعذّر بدء التشغيل المحتسب."); }
    finally { setIsSubmitting(false); }
  }

  async function handleSubmit(userMessage?: string) {
    const text = (userMessage ?? prompt).trim();
    if (!text || isSubmitting || (gameOver && !solved)) return;
    if (sessionId) startTimer();
    setIsSubmitting(true);

    if (isMultiTurn) {
      setConversation((prev) => [...prev, { role: "user", content: text, timestamp: Date.now() }]);
    }

    const active = !sessionId && isLlmGradingActive(llmSettings) ? llmSettings : null;
    try {
      let data: AttackResult;
      if (active) {
        // Live grading — runs in the browser with the user's key, never hits our server.
        try {
          data = await gradeAttackWithLLM({
            challenge,
            prompt: text,
            history: isMultiTurn ? conversation : [],
            settings: active,
            timeElapsed,
            hintsUsed,
          });
        } catch (err) {
          data = {
            success: false,
            aiResponse: "",
            attackType: null,
            feedback: err instanceof Error ? err.message : "فشل التقييم المباشر.",
            explanation:
              "فشل التقييم المباشر بمفتاحك. تحقّق من المفتاح والمزوّد في إعدادات \"التقييم بمفتاحك\"، أو أوقفه لاستخدام المقيّم الافتراضي.",
            isLiveBackend: true,
          };
        }
      } else {
        const token = await cohortPlayer.token();
        const res = await fetch("/api/attack/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            challengeId: challenge.id,
            ...(sessionId ? { sessionId } : {}),
            prompt: text,
            timeElapsed,
            hintsUsed,
            ...(!sessionId ? { history: isMultiTurn ? conversation : [] } : {}),
            userId: player?.userId,
            username: player?.username,
            avatar: player?.avatar,
          }),
        });
        data = await res.json();
        if (!res.ok) throw new Error((data as AttackResult & { error?: string }).error ?? "فشل التنفيذ.");
      }
      if (active) data.pointsEarned = 0;
      setResult(data);

      if (isMultiTurn) {
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: data.aiResponse, timestamp: Date.now() },
        ]);
      }

      setAttempts((prev) => [
        ...prev,
        { prompt: text, success: data.success, attackType: data.attackType, timestamp: Date.now() },
      ]);

      if (data.success) {
        stopTimer();
        markSolved(challenge.id);
        saveLearningProgress(challenge.id, active ? "viewer-live" : sessionId ? "server-live" : "simulated", "/challenges/" + challenge.id);
        setScoreSubmitted(data.scoreRecorded === true);
        setCohortCounted(data.cohortRecorded === true);
      }
    } catch (error) {
      setModeError(error instanceof Error ? error.message : "فشل التنفيذ. أعد المحاولة.");
    } finally {
      setIsSubmitting(false);
      setPrompt("");
    }
  }

  function revealHint(index: number) {
    if (revealedHints.includes(index)) return;
    setRevealedHints((prev) => [...prev, index]);
    setHintsUsed((prev) => prev + 1);
  }

  const timerFraction = timeLeft / challenge.timeLimit;
  const timerColor =
    timerFraction > 0.5 ? "text-emerald-400" : timerFraction > 0.25 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="game-workspace min-h-[calc(100vh-64px)] pt-16 bg-transparent" data-evaluating={isSubmitting}>
      {result?.success === false && result.aiResponse && (
        <div key={attempts.length} className="failure-screen-pulse" aria-hidden="true" />
      )}
      {/* Share result modal */}
      {showShareModal && result?.success && (
        <ShareResultCard
          challengeTitle={challenge.title}
          challengeLevel={challenge.level}
          pointsEarned={result.scoreRecorded ? result.pointsEarned ?? 0 : 0}
          executionLabel={sessionId ? "تقييم مباشر على الخادم" : result.isLiveBackend ? "مباشر بمفتاحك · غير محتسب" : "تدريب بالمحاكاة · غير محتسب"}
          totalPoints={CHALLENGES.filter((c) => solvedIds.includes(c.id)).reduce((sum, c) => sum + c.basePoints, 0)}
          solvedIds={solvedIds}
          username={player?.username}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Live LLM grading settings */}
      <LlmKeySettings
        open={showLlmSettings}
        onClose={() => setShowLlmSettings(false)}
        onSaved={(s) => setLlmSettings(s)}
      />

      {/* Top bar */}
      <div className="game-toolbar px-5 py-5">
        <div className="mx-auto max-w-7xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/challenges?track=llm" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              → مهام خزنة النماذج
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-sm text-slate-400">المستوى {challenge.level}</span>
            <h1 className="game-title text-white font-bold">{challenge.title}</h1>
            <span className={cn("px-2 py-0.5 rounded text-xs font-semibold border", diff.bg, diff.color)}>
              {arDifficulty(challenge.difficulty)}
            </span>
            {isMultiTurn && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold border border-blue-400/30 bg-blue-400/10 text-blue-400">
                محادثة متعددة الرسائل
              </span>
            )}
            {challenge.level >= 6 && (
              <span className="px-2 py-0.5 rounded text-xs font-bold border border-pink-400/30 bg-pink-400/10 text-pink-400 animate-pulse">
                🔥 2025/26
              </span>
            )}
            {alreadySolved && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold border border-emerald-400/30 bg-emerald-400/10 text-emerald-400">
                ✓ محلولة
              </span>
            )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-4">
            {/* Player badge */}
            {player && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  {player.avatar}
                </div>
                {player.username}
              </div>
            )}
            {/* Live LLM grading */}
            <button
              onClick={() => setShowLlmSettings(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all",
                !sessionId && isLlmGradingActive(llmSettings)
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/40"
              )}
              title="قيّم بمفتاح OpenAI أو Anthropic الخاص بك، ويبقى المفتاح في متصفحك"
            >
              <Bot className="h-3.5 w-3.5" />
              {sessionId ? "مباشر على الخادم" : isLlmGradingActive(llmSettings) ? "مباشر بمفتاحك" : "التقييم بمفتاحك"}
            </button>
            {/* Defender toggle */}
            <button
              aria-pressed={showDefense}
              onClick={() => setShowDefense(!showDefense)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all",
                showDefense
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-500/40"
              )}
            >
              {showDefense ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <Shield className="h-3.5 w-3.5" />
              المدافع
            </button>
            <div className={cn("flex items-center gap-1.5 font-mono font-bold text-lg", timerColor)}>
              <Clock className="h-4 w-4" />
              {sessionId ? formatTime(timeLeft) : <span className="font-sans text-base">بلا توقيت</span>}
              {sessionId && !timerStarted && <span className="font-sans text-[10px] font-normal text-slate-400">يبدأ عند الإرسال</span>}
            </div>
            <div className="text-sm text-slate-400">
              <span className="text-white font-semibold">{attempts.length}</span> محاولة
            </div>
            <div className="text-sm text-slate-400">
              <span className="text-white font-semibold">{challenge.basePoints}</span> نقطة
            </div>
          </div>
        </div>
      </div>

      {/* Challenger banner */}
      {challengerName && (
        <div className="border-b border-yellow-400/20 bg-yellow-400/5 px-4 py-3">
          <div className="mx-auto max-w-7xl text-center text-sm">
            <span className="text-yellow-400 font-bold">@{challengerName}</span>
            <span className="text-slate-400"> يتحدّاك أن تتجاوز المستوى {challenge.level}. هل تستطيع؟ </span>
            <span className="text-yellow-400">⚔️</span>
          </div>
        </div>
      )}

      {cohortSignInNeeded && (
        <div className="border-b border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <div className="mx-auto max-w-7xl text-center text-sm text-amber-200">
            {cohortPlayer.user
              ? "لم يكتمل تسجيلك في AISYWLC، لذا لن تُحتسب حلولك في المسابقة. "
              : "لم تسجّل الدخول، لذا لن تُحتسب حلولك في مسابقة AISYWLC. "}
            <Link href="/aisywlc" className="font-semibold underline">{cohortPlayer.user ? "أكمل التسجيل" : "سجّل الدخول بـ Google"}</Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="mission-objective mb-6 rounded-2xl border border-emerald-500/30 bg-[#241f1a] p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-400">
            <span className="objective-beacon" aria-hidden="true"><Shield className="h-4 w-4" /></span> هدف المهمة
          </div>
          <p className="text-sm leading-relaxed text-white">{challenge.goal}</p>
          {challenge.level === 1 && (
            <p className="mt-3 border-t border-slate-700 pt-3 text-xs leading-relaxed text-slate-400">
              <span className="font-semibold text-emerald-300">مهمتك الأولى:</span> اكتب أمرًا (بالإنجليزية) يحاول إخراج المعلّم عن موضوعه، ثم أرسله. شاهد الرد وسبب نجاحه أو فشله. التدريب بلا توقيت، أما الوضع المحتسب فيعدّ تنازليًا حتى انتهاء جلسة الخادم.
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            {sessionId ? "نموذج مباشر محتسب · جلسة خادم مع تسجيل الدخول · نقاط أساسية فقط · تلميحات مجانية. تنتهي الجلسة بعد 20 دقيقة." : isLlmGradingActive(llmSettings) ? "نموذج مباشر بمفتاحك · غير محتسب · تذهب الطلبات مباشرة إلى مزوّدك." : "تدريب بالمحاكاة · بلا توقيت · غير محتسب. الحل بالمحاكاة ليس دليلًا على اختراق نموذج حقيقي."}
          </p>
        </div>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link href="/learn/trust-boundaries" className="lab-button lab-button-secondary">اقرأ الدرس التأسيسي</Link>
          <button className="lab-button lab-button-secondary" disabled={!rankedAvailable || isSubmitting} onClick={() => void startRanked()}>{sessionId ? "ابدأ جلسة محتسبة جديدة" : rankedAvailable ? cohortPlayer.user ? "ابدأ جلسة مباشرة محتسبة" : "سجّل الدخول للعب المحتسب" : "اللعب المحتسب غير متاح"}</button>
          {sessionId && <button className="lab-button lab-button-secondary" disabled={isSubmitting} onClick={() => { stopTimer(); setSessionId(null); setGameOver(false); setResult(null); setConversation([]); }}>عُد إلى التدريب بلا توقيت</button>}
          <Link href="/docs#grading" className="text-xs text-slate-400 underline">كيف يتم التقييم</Link>
        </div>
        {modeError && <p role="alert" className="mb-6 text-sm text-amber-300">{modeError}</p>}
        <div className={cn("grid gap-6", showDefense ? "xl:grid-cols-3 lg:grid-cols-2" : "lg:grid-cols-5")}>

          {/* ── Left: Context panel ── */}
          <div className={cn("order-2 flex flex-col gap-4 lg:order-1", showDefense ? "" : "lg:col-span-2")}>

            {/* System prompt */}
            <div className="game-panel rounded-2xl border border-slate-700 bg-[#241f1a] p-5">
              <button
                aria-expanded={showSystemPrompt}
                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                className="flex items-center justify-between w-full text-sm font-semibold text-blue-400"
              >
                <span className="flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  تعليمات النظام (للذكاء المستهدف)
                </span>
                {showSystemPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showSystemPrompt && (
                <pre className="mt-3 text-xs text-slate-300 bg-slate-900 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-slate-700">
                  {challenge.systemPrompt}
                </pre>
              )}
              {!showSystemPrompt && (
                <p className="text-xs text-slate-500 mt-1">اضغط للكشف</p>
              )}
            </div>

            {/* Hints */}
            {challenge.hints.length > 0 && (
              <div className="game-panel rounded-2xl border border-slate-700 bg-[#241f1a] p-5">
                <button
                  aria-expanded={showHints}
                  onClick={() => setShowHints(!showHints)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-yellow-400"
                >
                  <span className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    التلميحات (استخدمت {hintsUsed} من {challenge.hints.length})
                  </span>
                  {showHints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showHints && (
                  <div className="mt-3 flex flex-col gap-2">
                    {challenge.hints.map((hint, i) => (
                      <div key={i}>
                        {revealedHints.includes(i) ? (
                          <div className="text-xs text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-2.5">
                            💡 {hint}
                          </div>
                        ) : (
                          <button
                            onClick={() => revealHint(i)}
                            className="w-full text-xs text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-lg p-2.5 text-start border border-slate-700 transition-colors"
                          >
                            اكشف التلميح {i + 1} <span className="text-slate-500">(مجانًا)</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Attack type card */}
            <div className="game-panel rounded-2xl border border-slate-700 bg-[#241f1a] p-5">
              <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                فئة الهجوم المستهدفة
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{ATTACK_TYPE_INFO[challenge.attackType]?.icon}</span>
                <div>
                  <div className={cn("font-semibold text-sm", ATTACK_TYPE_INFO[challenge.attackType]?.color)}>
                    {arAttackType(challenge.attackType).name}
                    {ATTACK_TYPE_INFO[challenge.attackType]?.owaspRef && (
                      <span className="ms-2 text-xs text-slate-600 font-normal">
                        {ATTACK_TYPE_INFO[challenge.attackType].owaspRef}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {arAttackType(challenge.attackType).description}
                  </p>
                </div>
              </div>
            </div>

            {/* Attempt history */}
            {attempts.length > 0 && (
              <div className="game-panel rounded-2xl border border-slate-700 bg-[#241f1a] p-5">
                <button
                  aria-expanded={showAttempts}
                  onClick={() => setShowAttempts(!showAttempts)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-slate-400"
                >
                  <span className="flex items-center gap-2">
                    <Swords className="h-4 w-4" />
                    سجل الهجمات ({attempts.length})
                  </span>
                  {showAttempts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showAttempts && (
                  <div className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto pe-1">
                    {[...attempts].reverse().map((a, i) => (
                      <div key={i} className={cn(
                        "rounded-lg p-2.5 text-xs",
                        a.success ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                      )}>
                        <div className="mb-2 flex items-center gap-2">
                          {a.success
                            ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                            : <XCircle className="h-3.5 w-3.5 flex-shrink-0 text-red-400" />}
                          <span className="font-semibold text-slate-400">
                            المحاولة {attempts.length - i}
                          </span>
                          <CopyTextButton text={a.prompt} label="انسخ الأمر" className="ms-auto" />
                        </div>
                        <pre className="select-text whitespace-pre-wrap break-words font-mono leading-relaxed text-slate-300">
                          {a.prompt}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Center: Game area ── */}
          <div className={cn("order-1 flex flex-col gap-4 lg:order-2", showDefense ? "" : "lg:col-span-3")}>

            {/* ── SOLVED STATE ── */}
            {solved && (
              <div className="game-feedback rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-bold text-emerald-400 text-lg">اخترقت المستوى {challenge.level}! 🎉</div>
                    <div className="text-sm text-emerald-300">{result?.feedback}</div>
                  </div>
                  <div className="text-end">
                    <div className="text-2xl font-bold text-emerald-400">{result?.pointsEarned ? `+${result.pointsEarned}` : sessionId ? "سُجّلت" : "غير محتسبة"}</div>
                    <div className="text-xs text-slate-400">نقطة</div>
                  </div>
                </div>

                {/* Full successful exchange */}
                {result && winningAttempt && (
                  <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          الأمر الناجح
                        </div>
                        <CopyTextButton text={winningAttempt.prompt} label="انسخ الأمر" />
                      </div>
                      <pre className="max-h-64 select-text overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-800 bg-slate-950/70 p-3 font-mono text-sm leading-relaxed text-slate-300">
                        {winningAttempt.prompt}
                      </pre>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          رد الذكاء الاصطناعي كاملًا
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <CopyTextButton text={result.aiResponse} label="انسخ الرد" />
                          <CopyTextButton text={successfulExchange} label="انسخ المحادثة" />
                        </div>
                      </div>
                      <pre className="max-h-80 select-text overflow-auto whitespace-pre-wrap break-words rounded-md border border-slate-800 bg-slate-950/70 p-3 font-mono text-sm leading-relaxed text-slate-300">
                        {result.aiResponse}
                      </pre>
                    </div>

                    {!isMultiTurn && challenge.id === "level-9-data-exfiltration" && (
                      <SafeMarkdownExfiltrationView response={result.aiResponse} />
                    )}
                    {!isMultiTurn && challenge.id === "level-10-improper-output-handling" && (
                      <IsolatedHtmlSandboxView response={result.aiResponse} />
                    )}
                  </div>
                )}

                {/* Score submitted badge */}
                  {scoreSubmitted && (player || cohortHandle) && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/40 rounded-lg px-3 py-2">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    {cohortCounted
                      ? <>احتُسبت في AISYWLC باسم <span className="text-white font-semibold">{cohortHandle}</span></>
                      : <>سُجّلت نتيجة موثّقة باسم <span className="text-white font-semibold">{cohortHandle ?? player?.username}</span></>}
                  </div>
                )}
                {solved && contestOpen && !cohortCounted && (
                  <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    هذا الحل لم يُحتسب في AISYWLC. سجّل الدخول بـ Google من <Link href="/aisywlc" className="underline">صفحة AISYWLC</Link>، ثم حلّه مجددًا.
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {nextChallenge ? (
                    <Link
                      href={`/challenges/${nextChallenge.id}`}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm transition-colors"
                    >
                      المستوى التالي: {nextChallenge.title}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/leaderboard"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-semibold text-sm transition-colors"
                    >
                      <Trophy className="h-4 w-4" />
                      لوحة المتصدرين
                    </Link>
                  )}
                  <Link
                    href="/challenges?track=llm"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-colors"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    كل مهام خزنة النماذج
                  </Link>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-semibold transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    شارك النتيجة
                  </button>
                  <button
                    onClick={() => {
                      const name = player?.username ?? "صديق";
                      const url = `${SITE_URL}/challenges/${challenge.id}?ref=${encodeURIComponent(name)}`;
                      navigator.clipboard.writeText(url);
                      setChallengeCopied(true);
                      setTimeout(() => setChallengeCopied(false), 2000);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-400/40 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 text-sm font-semibold transition-colors"
                  >
                    ⚔️ {challengeCopied ? "تم نسخ الرابط!" : "تحدَّ صديقًا"}
                  </button>
                </div>

                {/* Explanation */}
                <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-900/40 rounded-lg p-3">
                  <Info className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                  {result?.explanation}
                </div>
              </div>
            )}

            {/* Time's up banner */}
            {gameOver && !solved && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                  <XCircle className="h-5 w-5" />
                  انتهى مؤقت الجلسة.
                </div>
                <p className="text-sm text-red-300 mb-3">تنتهي جلسة الخادم بعد عشرين دقيقة من إنشائها. ابدأ جلسة جديدة أو عُد إلى التدريب بلا توقيت. انتهاء الوقت لا يعني أن الدفاع صمد.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-sm font-semibold transition-colors"
                >
                  حاول مجددًا
                </button>
              </div>
            )}

            {/* Latest failure feedback (non-multi-turn) */}
            {result && !result.success && !gameOver && !isMultiTurn && (
              <div className="game-feedback rounded-2xl border border-red-500/30 bg-[#241f1a] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="font-semibold text-red-400 text-sm">صمد الدفاع، واصل المحاولة</span>
                  {result.attackType && (
                    <span className="ms-auto text-xs text-slate-400">
                      المرصود: <span className={ATTACK_TYPE_INFO[result.attackType]?.color}>
                        {arAttackType(result.attackType).name}
                      </span>
                    </span>
                  )}
                </div>
                <div className="rounded-lg bg-slate-900/60 p-3 font-mono text-sm text-slate-300 border border-slate-700 mb-3">
                  <div className="text-xs text-slate-500 mb-1 font-sans">رد الذكاء الاصطناعي:</div>
                  <div className="ltr whitespace-pre-wrap">{result.aiResponse}</div>
                </div>
                <p className="text-xs text-slate-400">{result.feedback}</p>
              </div>
            )}

            {/* MULTI-TURN: Chat interface */}
            {isMultiTurn ? (
              <ChatInterface
                history={conversation}
                onSend={handleSubmit}
                isSubmitting={isSubmitting}
                gameOver={gameOver}
                solved={solved}
                inputValue={prompt}
                onInputChange={setPrompt}
                systemPersona={persona}
              />
            ) : (
              /* SINGLE-TURN: Classic textarea */
              !solved && (
                <div className="game-panel rounded-2xl border border-slate-700 bg-[#241f1a] p-5 flex flex-col gap-3">
                  <div className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    اكتب أمر الهجوم (بالإنجليزية)
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                    }}
                    placeholder={
                      gameOver ? "Time's up — press حاول مجددًا to retry"
                      : "Type your attack prompt in English… (Ctrl/⌘+Enter to submit)"
                    }
                    disabled={gameOver && !solved}
                    aria-label="أمر الهجوم"
                    className="attack-composer w-full min-h-[190px] bg-slate-900 rounded-lg border border-slate-700 p-3 text-sm text-white placeholder-slate-600 font-mono resize-none focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{prompt.length} حرف · Ctrl/⌘+Enter للإرسال</span>
                    <button
                      onClick={() => handleSubmit()}
                      disabled={!prompt.trim() || isSubmitting || (gameOver && !solved)}
                      className={cn(
                        "launch-attack flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all",
                        !prompt.trim() || isSubmitting || (gameOver && !solved)
                          ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                          : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"
                      )}
                    >
                      {isSubmitting ? (
                        <><div className="h-4 w-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />جارٍ التقييم...</>
                      ) : (
                        <>أطلق الهجوم</>
                      )}
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Attack Visualizer */}
            <AttackVisualizer prompt={isMultiTurn ? (attempts.at(-1)?.prompt ?? "") : prompt} />
          </div>

          {/* ── Right: Defense View ── */}
          {showDefense && (
            <div className="flex flex-col">
              <DefenseView
                challenge={challenge}
                lastResult={result}
                lastPrompt={attempts.at(-1)?.prompt ?? ""}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
