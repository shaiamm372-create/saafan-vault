"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND } from "@/lib/brand";
import { robotPoseFor, type StopId, type TourControls } from "./tourScene";
import type { RobotControls } from "./robot3d";
import { TOUR_MEDIA } from "./tourMedia";

/** The tour: where the camera goes and what Hasawi says there. Edit freely. */
const STEPS: { stop: StopId; place?: string; text: string }[] = [
  { stop: "welcome", text: `مرحبًا بكم في بوث ${BRAND.nameAr}! أنا ${BRAND.mascot.nameAr}، وراح آخذكم في جولة على الأحساء والذكاء الاصطناعي.` },
  { stop: "oasis", place: "واحة الأحساء · Al-Ahsa Oasis", text: "الأحساء أكبر واحة نخيل في العالم، ومسجّلة في قائمة التراث العالمي لليونسكو، ويزورها ناس من كل مكان." },
  { stop: "qarah", place: "السياحة · Tourism", text: "واليوم الزائر يسأل الذكاء الاصطناعي عن تاريخ الأحساء وأماكنها، ويخطط رحلته، ويترجم بأي لغة." },
  { stop: "oasis", place: "الزراعة · Agriculture", text: "وفي الزراعة، الذكاء الاصطناعي يساعد المزارع يراقب نخيله، ويكتشف الآفات بدري، ويوفّر في مياه الري." },
  { stop: "city", place: "الصحة · Healthcare", text: "وفي المستشفيات، يساعد الأطباء يقرؤون الأشعة ويشخّصون أسرع، ويسهّل على المريض مواعيده." },
  { stop: "university", place: "التعليم · Education", text: "وفي التعليم، صار الطالب يتعلّم ويبحث ويبني مشاريعه بالذكاء الاصطناعي." },
  { stop: "city", place: "الحياة اليومية · Daily life", text: "وحتى في يومنا: في الشغل، والتسوّق، والخدمات الحكومية، الذكاء الاصطناعي صار معنا في كل مكان." },
  { stop: "challenge", text: "بس زي ما نحمي نخيلنا من السوسة، لازم نحمي الذكاء الاصطناعي من المخترقين… لأنه ممكن ينخدع بكلمة وحدة." },
  { stop: "challenge", text: "ودّك تجرّب تخترقني؟" },
];

/** At the booth: if nobody answers the final question, start the tour again. */
const RESTART_AFTER_MS = 45_000;
const SEEN_KEY = "robot_intro_seen";

// ── Voice ──────────────────────────────────────────────────────────────────
/** Picks the most natural Arabic voice the device offers, preferring a male Saudi voice. */
function pickVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ar"));
    const score = (v: SpeechSynthesisVoice) =>
      (/natural|online|neural/i.test(v.name) ? 8 : 0) +
      (/hamed|naayf|maged|tarik|shakir|male/i.test(v.name) ? 4 : 0) +
      (/google/i.test(v.name) ? 3 : 0) +
      (v.lang.toLowerCase() === "ar-sa" ? 2 : 0);
    return voices.sort((a, b) => score(b) - score(a))[0] ?? null;
  } catch {
    return null;
  }
}

function speak(text: string, onStart: () => void, onEnd: () => void): boolean {
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    utterance.lang = voice?.lang ?? "ar-SA";
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 0.95;
    utterance.onstart = onStart;
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

const stopSpeaking = () => {
  try { window.speechSynthesis.cancel(); } catch { /* speech unsupported */ }
};

// ── Real photo or video behind Hasawi ────────────────────────────────────────
function StopMedia({ stop }: { stop: StopId }) {
  const media = TOUR_MEDIA[stop];
  const [failed, setFailed] = useState<string | null>(null);
  if (!media || failed === media.src) return null;
  const video = /\.(mp4|webm|mov)$/i.test(media.src);
  return (
    <div key={media.src} className="robot-intro-media">
      {video ? (
        <video src={media.src} autoPlay muted loop playsInline onError={() => setFailed(media.src)} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.src} alt="" onError={() => setFailed(media.src)} />
      )}
      <div className="robot-intro-hud" aria-hidden="true"><i /><i /><i /><i /><b /></div>
      {media.credit && <small>{media.credit}</small>}
    </div>
  );
}

export default function RobotIntro() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const [started, setStarted] = useState(false);
  const [line, setLine] = useState(-1);
  const [chars, setChars] = useState(0);
  const [voice, setVoice] = useState(true);
  const [webglFailed, setWebglFailed] = useState(false);
  const worldRef = useRef<HTMLCanvasElement>(null);
  const robotCanvasRef = useRef<HTMLCanvasElement>(null);
  const worldControls = useRef<TourControls | null>(null);
  const robotControls = useRef<RobotControls | null>(null);
  const voiceRef = useRef(true);

  // Show once per browser session; the replay button opens it again.
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1" && !/^#tour-/.test(window.location.hash); } catch { /* storage blocked */ }
    const show = window.setTimeout(() => { setReady(true); if (!seen) setOpen(true); }, 0);
    const replay = () => { setLine(-1); setChars(0); setStarted(false); setClosing(false); setOpen(true); };
    window.addEventListener("robot-intro:open", replay);
    // Voices load in the background on some browsers.
    try { window.speechSynthesis.getVoices(); } catch { /* speech unsupported */ }
    return () => { window.clearTimeout(show); window.removeEventListener("robot-intro:open", replay); };
  }, []);

  // Start both 3D scenes while the intro is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.style.overflow = "hidden";
    Promise.all([import("./tourScene"), import("./robot3d")])
      .then(([{ startTour }, { startRobot }]) => {
        if (cancelled || !worldRef.current || !robotCanvasRef.current) return;
        worldControls.current = startTour(worldRef.current, BRAND.emblem, reduceMotion);
        robotControls.current = startRobot(robotCanvasRef.current, "/tour/robot.glb", BRAND.emblem, reduceMotion);
      })
      .catch(() => setWebglFailed(true));
    // #tour-N in the address jumps straight to step N (handy for rehearsing the booth).
    const jump = /^#tour-(\d+)$/.exec(window.location.hash);
    const autoStart = jump ? window.setTimeout(() => { voiceRef.current = false; setVoice(false); setStarted(true); setLine(Math.min(Number(jump[1]), STEPS.length - 1)); }, 1500) : 0;
    return () => {
      cancelled = true;
      window.clearTimeout(autoStart);
      worldControls.current?.dispose();
      robotControls.current?.dispose();
      worldControls.current = null;
      robotControls.current = null;
      document.body.style.overflow = "";
      stopSpeaking();
    };
  }, [open]);

  // Each step: move the camera, speak, type the subtitle, then go on.
  useEffect(() => {
    if (line < 0 || line >= STEPS.length) return;
    const step = STEPS[line];
    const last = line === STEPS.length - 1;
    worldControls.current?.goTo(step.stop);
    robotControls.current?.setPose(robotPoseFor(step.stop));

    let index = 0;
    let advance = 0;
    let fallback = 0;
    let typer = 0;
    const typeMs = voiceRef.current ? 62 : 38;
    const startTyping = () => {
      window.clearInterval(typer);
      typer = window.setInterval(() => {
        index += 1;
        setChars((current) => Math.max(current, index));
        if (index >= step.text.length) window.clearInterval(typer);
      }, typeMs);
    };
    const goNext = (pause: number) => {
      window.clearTimeout(advance);
      robotControls.current?.setTalking(false);
      if (!last) advance = window.setTimeout(() => { setChars(0); setLine((current) => current + 1); }, pause);
    };

    robotControls.current?.setTalking(true);
    // Give the camera a moment to start flying before speaking at a new place.
    const delay = line > 0 && STEPS[line - 1].stop !== step.stop ? 700 : 150;
    const begin = window.setTimeout(() => {
      startTyping();
      const spoken = voiceRef.current && speak(step.text, () => robotControls.current?.setTalking(true), () => goNext(900));
      // Without voice (or if the voice never finishes), move on after a reading pause.
      fallback = window.setTimeout(() => goNext(0), spoken ? step.text.length * 110 + 5000 : step.text.length * typeMs + 3200);
      if (!spoken) window.setTimeout(() => robotControls.current?.setTalking(false), step.text.length * typeMs);
    }, delay);
    const restart = last ? window.setTimeout(() => { setChars(0); setLine(0); }, RESTART_AFTER_MS) : 0;

    return () => {
      window.clearTimeout(begin);
      window.clearTimeout(advance);
      window.clearTimeout(fallback);
      window.clearTimeout(restart);
      window.clearInterval(typer);
    };
  }, [line]);

  const close = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocked */ }
    stopSpeaking();
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, 600);
  }, []);

  const start = (withVoice: boolean) => {
    voiceRef.current = withVoice;
    setVoice(withVoice);
    // Speaking once inside the tap unlocks the voice for the whole tour.
    if (withVoice) speak(" ", () => {}, () => {});
    setStarted(true);
    setChars(0);
    setLine(0);
  };

  const skipLine = () => {
    if (line < 0 || line >= STEPS.length - 1) return;
    stopSpeaking();
    setChars(0);
    setLine(line + 1);
  };

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    voiceRef.current = next;
    if (!next) stopSpeaking();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return ready ? createPortal(<RobotIntroReplay />, document.body) : null;
  const step = line >= 0 ? STEPS[line] : null;
  const finished = line === STEPS.length - 1;
  const typed = step ? step.text.slice(0, chars) : "";

  return createPortal(
    <div className={`robot-intro${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={`Meet ${BRAND.mascot.name}`}>
      {webglFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="robot-intro-fallback" src={BRAND.emblem} alt="" />
      ) : (
        <canvas ref={worldRef} className="robot-intro-canvas" aria-hidden="true" />
      )}
      {step && <StopMedia key={step.stop} stop={step.stop} />}
      <div className="robot-intro-lines" aria-hidden="true" />
      {!webglFailed && <canvas ref={robotCanvasRef} className="robot-intro-canvas robot-intro-robot" aria-hidden="true" />}

      <header className="robot-intro-top">
        <span className="robot-intro-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.emblem} alt="" /> {BRAND.platform}
        </span>
        <div className="robot-intro-actions">
          {started && <button type="button" onClick={toggleVoice} aria-pressed={voice}>{voice ? "Voice on" : "Voice off"}</button>}
          <button type="button" onClick={close}>Skip intro</button>
        </div>
      </header>

      {!started && (
        <div className="robot-intro-gate">
          <p className="robot-intro-gate-kicker">{BRAND.owner}</p>
          <h1 data-text={BRAND.mascot.name}>{BRAND.mascot.name}</h1>
          <p className="font-arabic robot-intro-gate-ar">جولة {BRAND.mascot.nameAr} في الأحساء والذكاء الاصطناعي</p>
          <button type="button" className="robot-intro-start" onClick={() => start(true)}>
            <span className="font-arabic">ابدأ الجولة</span> · Start the tour
          </button>
          <button type="button" className="robot-intro-mute" onClick={() => start(false)}>Start without sound</button>
        </div>
      )}

      {step?.place && <div key={step.place} className="robot-intro-place font-arabic">{step.place}</div>}

      {step && (
        <div className="robot-intro-dialog">
          <button type="button" className="robot-intro-bubble" onClick={skipLine} aria-live="polite">
            <span className="robot-intro-speaker">{BRAND.mascot.nameAr} · {BRAND.mascot.name}</span>
            <span dir="rtl" lang="ar" className="font-arabic robot-intro-text">
              {typed}
              <i className="robot-intro-caret" aria-hidden="true" />
            </span>
            <span className="robot-intro-progress" aria-hidden="true">
              {STEPS.map((_, i) => <b key={i} className={i <= line ? "on" : ""} />)}
            </span>
          </button>
          {finished && (
            <div className="robot-intro-cta">
              <Link href="/challenges" onClick={close} className="robot-intro-start">
                <span className="font-arabic">إيه، أبي أجرّب!</span> · Hack me →
              </Link>
              <button type="button" onClick={close} className="robot-intro-explore">Explore the platform</button>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}

/** Small floating button that replays the intro. */
function RobotIntroReplay() {
  return (
    <button type="button" className="robot-intro-replay" onClick={() => window.dispatchEvent(new Event("robot-intro:open"))}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BRAND.emblem} alt="" />
      <span>Talk to {BRAND.mascot.name}</span>
    </button>
  );
}
