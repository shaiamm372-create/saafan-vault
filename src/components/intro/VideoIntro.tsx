"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND } from "@/lib/brand";
import { INTRO_VIDEO } from "./tourMedia";
import { openHasawi } from "./HasawiChat";

/** At the booth: if nobody answers the final question, play the video again. */
const REPLAY_AFTER_MS = 45_000;
const SEEN_KEY = "robot_intro_seen";

type Phase = "gate" | "playing" | "question";

/**
 * Hasawi's video introduction: a start button (one tap so the sound can play),
 * the video, then "ودّك تجرّب تخترقني؟" with a button to the challenges.
 */
export default function VideoIntro() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [phase, setPhase] = useState<Phase>("gate");
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Show once per browser session; the replay button opens it again.
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* storage blocked */ }
    const show = window.setTimeout(() => { if (!seen) setOpen(true); }, 0);
    const replay = () => { setPhase("gate"); setProgress(0); setClosing(false); setOpen(true); };
    window.addEventListener("robot-intro:open", replay);
    return () => { window.clearTimeout(show); window.removeEventListener("robot-intro:open", replay); };
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    setPhase("playing");
    video.play().catch(() => {
      // If the browser still blocks sound, play muted rather than not at all.
      video.muted = true;
      video.play().catch(() => setPhase("question"));
    });
  }, []);

  // At the booth, start again by itself if nobody answers.
  useEffect(() => {
    if (phase !== "question") return;
    const timer = window.setTimeout(play, REPLAY_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [phase, play]);

  const close = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocked */ }
    videoRef.current?.pause();
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); }, 600);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!INTRO_VIDEO) return null;
  if (!open) return null;

  return createPortal(
    <div className={`robot-intro video-intro${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={`Meet ${BRAND.mascot.name}`}>
      <video
        ref={videoRef}
        className={`video-intro-player is-${phase}`}
        src={INTRO_VIDEO}
        playsInline
        preload="auto"
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (video.duration) setProgress(video.currentTime / video.duration);
        }}
        onEnded={() => setPhase("question")}
      />
      <div className="robot-intro-lines" aria-hidden="true" />

      <header className="robot-intro-top">
        <span className="robot-intro-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.emblem} alt="" /> {BRAND.platform}
        </span>
        <div className="robot-intro-actions">
          <button type="button" onClick={close}>Skip intro</button>
        </div>
      </header>

      {phase === "gate" && (
        <div className="robot-intro-gate video-intro-center">
          <p className="robot-intro-gate-kicker">{BRAND.owner}</p>
          <h1 data-text={BRAND.mascot.name}>{BRAND.mascot.name}</h1>
          <p className="font-arabic robot-intro-gate-ar">جولة {BRAND.mascot.nameAr} في الأحساء والذكاء الاصطناعي</p>
          <button type="button" className="robot-intro-start" onClick={play}>
            <span className="font-arabic">ابدأ الجولة</span> · Start the tour
          </button>
        </div>
      )}

      {phase === "question" && (
        <div className="robot-intro-gate video-intro-center">
          <p className="font-arabic video-intro-question">ودّك تجرّب تخترقني؟</p>
          <div className="robot-intro-cta">
            <Link href="/challenges" onClick={close} className="robot-intro-start">
              <span className="font-arabic">إيه، أبي أجرّب!</span> · Hack me →
            </Link>
            <button type="button" onClick={() => { close(); window.setTimeout(openHasawi, 650); }} className="robot-intro-explore"><span className="font-arabic">تكلّم مع حساوي</span> 🎤</button>
            <button type="button" onClick={close} className="robot-intro-explore">Explore the platform</button>
          </div>
          <button type="button" className="robot-intro-mute" onClick={play}>Watch again</button>
        </div>
      )}

      {phase === "playing" && (
        <div className="video-intro-progress" aria-hidden="true"><b style={{ transform: `scaleX(${progress})` }} /></div>
      )}
    </div>,
    document.body,
  );
}
