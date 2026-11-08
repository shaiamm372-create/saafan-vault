"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND } from "@/lib/brand";
import type { StopId, TourControls } from "./tourScene";

/** The tour: where the camera goes and what Hasawi says there. Edit freely. */
const STEPS: { stop: StopId; place?: string; text: string }[] = [
  { stop: "welcome", text: `مرحبًا بكم في بوث ${BRAND.nameAr}! أنا ${BRAND.mascot.nameAr}.` },
  { stop: "welcome", text: "وراح آخذكم في جولة على تطوّر الأحساء في الذكاء الاصطناعي. يلا نبدأ!" },
  { stop: "oasis", place: "واحة الأحساء · Al-Ahsa Oasis", text: "هذي واحة الأحساء، أكبر واحة نخيل في العالم، ومسجّلة في قائمة التراث العالمي لليونسكو." },
  { stop: "oasis", place: "واحة الأحساء · Al-Ahsa Oasis", text: "واليوم الدرون والذكاء الاصطناعي يكشفون سوسة النخيل الحمراء بدري، قبل ما تخرب النخلة." },
  { stop: "factory", place: "مصانع التمور · Date factories", text: "وفي مصانع التمور، كاميرات ذكية تفرز التمور حسب الجودة والنوع، أسرع من أي إنسان." },
  { stop: "qarah", place: "جبل القارة · Al-Qarah Mountain", text: "وهذا جبل القارة. الأحساء كانت عاصمة السياحة العربية ٢٠١٩، والذكاء الاصطناعي يقدر يكون مرشد سياحي يتكلم كل اللغات." },
  { stop: "university", place: "جامعة الملك فيصل · King Faisal University", text: "وفي جامعة الملك فيصل، الطلاب يتعلّمون الذكاء الاصطناعي ويبنون فيه مشاريعهم، ونادي الأمن السيبراني يعلّمهم كيف يحمونه." },
  { stop: "city", place: "الأحساء الذكية · Smart Al-Ahsa", text: "وأهل الأحساء يستخدمونه كل يوم: في الدراسة والشغل والتجارة والمحلات. كل شي صار متصل." },
  { stop: "challenge", text: "بس انتبهوا… أي ذكاء اصطناعي ممكن ينخدع بكلمة وحدة، وهنا يجي دور الأمن السيبراني." },
  { stop: "challenge", text: "ودّك تجرّب تخترقني؟" },
];
const LINES = STEPS.map((step) => step.text);

/** At the booth: if nobody answers the final question, start the tour again. */
const RESTART_AFTER_MS = 45_000;

const SEEN_KEY = "robot_intro_seen";
const TYPE_MS = 38;

function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar-SA";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("ar"));
    if (voice) utterance.voice = voice;
    utterance.rate = 1.02;
    synth.speak(utterance);
  } catch {
    /* speech is optional */
  }
}

export default function RobotIntro() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const [line, setLine] = useState(-1);
  const [chars, setChars] = useState(0);
  const [voice, setVoice] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const robotRef = useRef<TourControls | null>(null);
  const voiceRef = useRef(false);

  // Show once per browser session; the replay button opens it again.
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1" && !/^#tour-/.test(window.location.hash); } catch { /* storage blocked */ }
    const show = window.setTimeout(() => { setReady(true); if (!seen) setOpen(true); }, 0);
    const replay = () => { setLine(-1); setChars(0); setClosing(false); setOpen(true); };
    window.addEventListener("robot-intro:open", replay);
    return () => { window.clearTimeout(show); window.removeEventListener("robot-intro:open", replay); };
  }, []);

  // Start the 3D scene while the intro is open.
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    let cancelled = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.body.style.overflow = "hidden";
    import("./tourScene")
      .then(({ startTour }) => {
        if (cancelled || !canvasRef.current) return;
        robotRef.current = startTour(canvasRef.current, BRAND.emblem, reduceMotion);
      })
      .catch(() => setWebglFailed(true));
    // #tour-N in the address opens the tour at step N (handy for rehearsing the booth).
    const jump = Number(/^#tour-(\d+)$/.exec(window.location.hash)?.[1] ?? 0);
    const firstLine = window.setTimeout(() => setLine(Math.min(jump, STEPS.length - 1)), reduceMotion ? 200 : 2200);
    return () => {
      cancelled = true;
      window.clearTimeout(firstLine);
      robotRef.current?.dispose();
      robotRef.current = null;
      document.body.style.overflow = "";
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    };
  }, [open]);

  // Type the current line letter by letter, then move on.
  useEffect(() => {
    if (line < 0 || line >= LINES.length) return;
    const text = LINES[line];
    robotRef.current?.goTo(STEPS[line].stop);
    let index = 0;
    robotRef.current?.setTalking(true);
    if (voiceRef.current) speak(text);
    const typer = window.setInterval(() => {
      index += 1;
      setChars((current) => Math.max(current, index));
      if (index >= text.length) {
        window.clearInterval(typer);
        robotRef.current?.setTalking(false);
      }
    }, TYPE_MS);
    const last = line === LINES.length - 1;
    const next = last ? 0 : window.setTimeout(() => { setChars(0); setLine((current) => current + 1); }, text.length * TYPE_MS + 3200);
    const restart = last ? window.setTimeout(() => { setChars(0); setLine(0); }, RESTART_AFTER_MS) : 0;
    return () => { window.clearInterval(typer); window.clearTimeout(next); window.clearTimeout(restart); };
  }, [line]);

  const close = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocked */ }
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, 600);
  }, []);

  const advance = () => {
    if (line < 0) return;
    if (chars < LINES[line].length) setChars(LINES[line].length);
    else if (line < LINES.length - 1) { setChars(0); setLine(line + 1); }
  };

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    voiceRef.current = next;
    if (next && line >= 0) speak(LINES[line]);
    if (!next) try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open) return ready ? createPortal(<RobotIntroReplay />, document.body) : null;
  const finished = line === LINES.length - 1;
  const typed = line >= 0 ? LINES[line].slice(0, chars) : "";

  return createPortal(
    <div className={`robot-intro${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={`Meet ${BRAND.mascot.name}`}>
      {webglFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="robot-intro-fallback" src={BRAND.emblem} alt="" />
      ) : (
        <canvas ref={canvasRef} className="robot-intro-canvas" aria-hidden="true" />
      )}
      <div className="robot-intro-lines" aria-hidden="true" />

      <header className="robot-intro-top">
        <span className="robot-intro-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.emblem} alt="" /> {BRAND.platform}
        </span>
        <div className="robot-intro-actions">
          <button type="button" onClick={toggleVoice} aria-pressed={voice}>{voice ? "Voice on" : "Voice off"}</button>
          <button type="button" onClick={close}>Skip intro</button>
        </div>
      </header>

      <div className="robot-intro-title" aria-hidden={line >= 0}>
        <p>{BRAND.owner}</p>
        <h1 data-text={BRAND.mascot.name}>{BRAND.mascot.name}</h1>
        <span>AI tour of Al-Ahsa</span>
      </div>

      {line >= 0 && STEPS[line].place && (
        <div key={STEPS[line].place} className="robot-intro-place font-arabic">{STEPS[line].place}</div>
      )}

      {line >= 0 && (
        <div className="robot-intro-dialog">
          <button type="button" className="robot-intro-bubble" onClick={advance} aria-live="polite">
            <span className="robot-intro-speaker">{BRAND.mascot.nameAr} · {BRAND.mascot.name}</span>
            <span dir="rtl" lang="ar" className="font-arabic robot-intro-text">
              {typed}
              <i className="robot-intro-caret" aria-hidden="true" />
            </span>
            <span className="robot-intro-progress" aria-hidden="true">
              {LINES.map((_, i) => <b key={i} className={i <= line ? "on" : ""} />)}
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
