"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BRAND } from "@/lib/brand";
import type { RobotControls } from "./robot3d";

type Turn = { role: "user" | "assistant"; content: string };
type Status = "idle" | "recording" | "listening" | "thinking" | "speaking";

const MAX_RECORDING_MS = 15_000;
export const openHasawi = () => window.dispatchEvent(new Event("hasawi:open"));

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * Talk to Hasawi: the visitor speaks (or types), Hasawi answers out loud.
 * Voice in → /api/hasawi/listen, reply → /api/hasawi/chat, voice out → /api/hasawi/speak.
 */
export default function HasawiChat() {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [greeting, setGreeting] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const robot = useRef<RobotControls | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stopTimer = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/hasawi/chat").then((r) => r.json()).then((data) => { setAvailable(data.available === true); setGreeting(data.greeting ?? ""); }).catch(() => {});
    const show = () => { setClosing(false); setOpen(true); };
    window.addEventListener("hasawi:open", show);
    return () => window.removeEventListener("hasawi:open", show);
  }, []);

  useEffect(() => { turnsRef.current = turns; listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [turns]);

  const stopAudio = () => {
    audio.current?.pause();
    audio.current = null;
    try { window.speechSynthesis.cancel(); } catch { /* unsupported */ }
    robot.current?.setTalking(false);
  };

  /** Plays Hasawi's voice; falls back to the browser's Arabic voice if needed. */
  const say = useCallback(async (text: string) => {
    stopAudio();
    setStatus("speaking");
    robot.current?.setTalking(true);
    const done = () => { robot.current?.setTalking(false); setStatus((s) => (s === "speaking" ? "idle" : s)); };
    try {
      const response = await fetch("/api/hasawi/speak", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      if (!response.ok) throw new Error("voice");
      const url = URL.createObjectURL(await response.blob());
      const player = new Audio(url);
      audio.current = player;
      player.onended = () => { URL.revokeObjectURL(url); done(); };
      player.onerror = () => { URL.revokeObjectURL(url); done(); };
      await player.play();
    } catch {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "ar-SA";
        utterance.onend = done;
        utterance.onerror = done;
        window.speechSynthesis.speak(utterance);
      } catch { done(); }
    }
  }, []);

  // Start the 3D Hasawi and greet the visitor when the chat opens.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    document.body.style.overflow = "hidden";
    import("./robot3d").then(({ startRobot }) => {
      if (cancelled || !canvasRef.current) return;
      robot.current = startRobot(canvasRef.current, "/tour/robot.glb", BRAND.emblem, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      robot.current.setPose("center");
    }).catch(() => {});
    if (turnsRef.current.length === 0 && greeting) {
      setTurns([{ role: "assistant", content: greeting }]);
      void say(greeting);
    }
    return () => {
      cancelled = true;
      robot.current?.dispose();
      robot.current = null;
      document.body.style.overflow = "";
    };
  }, [open, greeting, say]);

  const ask = useCallback(async (question: string) => {
    const text = question.trim().slice(0, 800);
    if (!text) return;
    setError("");
    const next = [...turnsRef.current, { role: "user" as const, content: text }];
    setTurns(next);
    setStatus("thinking");
    try {
      const response = await fetch("/api/hasawi/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-12) }) });
      const data = await response.json();
      if (!response.ok || !data.reply) throw new Error(data.error ?? "حساوي ما رد، جرّب مرة ثانية.");
      setTurns([...next, { role: "assistant", content: data.reply }]);
      await say(data.reply);
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "صار خطأ، جرّب مرة ثانية.");
    }
  }, [say]);

  const stopRecording = () => {
    window.clearTimeout(stopTimer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const startRecording = async () => {
    stopAudio();
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1500) { setStatus("idle"); setError("ما سمعت شي، اضغط وتكلّم."); return; }
        setStatus("listening");
        try {
          const response = await fetch("/api/hasawi/listen", { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "ما قدرت أسمعك.");
          if (!data.text) { setStatus("idle"); setError("ما سمعت شي واضح، عيد مرة ثانية."); return; }
          await ask(data.text);
        } catch (caught) {
          setStatus("idle");
          setError(caught instanceof Error ? caught.message : "ما قدرت أسمعك.");
        }
      };
      recorder.current = rec;
      rec.start();
      setStatus("recording");
      stopTimer.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch {
      setStatus("idle");
      setError("ما قدرت أفتح المايك. اسمح للمتصفح يستخدم المايك، أو اكتب سؤالك.");
    }
  };

  const toggleMic = () => {
    if (status === "recording") stopRecording();
    else if (status === "idle" || status === "speaking") void startRecording();
  };

  const newVisitor = () => {
    stopAudio();
    setError("");
    setDraft("");
    const first = greeting ? [{ role: "assistant" as const, content: greeting }] : [];
    setTurns(first);
    if (greeting) void say(greeting);
  };

  const close = useCallback(() => {
    stopRecording();
    stopAudio();
    setClosing(true);
    window.setTimeout(() => { setOpen(false); setClosing(false); setStatus("idle"); }, 500);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!available) return null;
  if (!open) {
    return (
      <button type="button" className="robot-intro-replay" onClick={() => setOpen(true)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BRAND.emblem} alt="" />
        <span>Talk to {BRAND.mascot.name}</span>
      </button>
    );
  }

  const busy = status === "listening" || status === "thinking";
  const statusText: Record<Status, string> = {
    idle: "اضغط المايك وتكلّم",
    recording: "أسمعك… اضغط مرة ثانية إذا خلصت",
    listening: "لحظة، أفهم كلامك…",
    thinking: "أفكر…",
    speaking: "يتكلم…",
  };

  return createPortal(
    <div className={`robot-intro hasawi-chat${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={`Talk to ${BRAND.mascot.name}`}>
      <canvas ref={canvasRef} className="robot-intro-canvas hasawi-chat-robot" aria-hidden="true" />
      <div className="robot-intro-lines" aria-hidden="true" />

      <header className="robot-intro-top">
        <span className="robot-intro-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.emblem} alt="" /> {BRAND.platform}
        </span>
        <div className="robot-intro-actions">
          <button type="button" onClick={newVisitor}><span className="font-arabic">زائر جديد</span></button>
          <button type="button" onClick={close}>Close</button>
        </div>
      </header>

      <section className="hasawi-chat-panel">
        <div ref={listRef} className="hasawi-chat-list" aria-live="polite">
          {turns.map((turn, index) => (
            <p key={index} dir="auto" className={`font-arabic hasawi-bubble is-${turn.role}`}>
              {turn.role === "assistant" && <b>{BRAND.mascot.nameAr}</b>}
              {turn.content}
            </p>
          ))}
          {busy && <p className="font-arabic hasawi-bubble is-assistant is-typing"><b>{BRAND.mascot.nameAr}</b><i /><i /><i /></p>}
        </div>

        {error && <p className="font-arabic hasawi-chat-error" dir="rtl">{error}</p>}

        <div className="hasawi-chat-controls">
          <button
            type="button"
            className={`hasawi-mic is-${status}`}
            onClick={toggleMic}
            disabled={busy}
            aria-label={status === "recording" ? "Stop recording" : "Talk to Hasawi"}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" fill="currentColor" /></svg>
          </button>
          <p className="font-arabic hasawi-chat-status">{statusText[status]}</p>
        </div>

        <form className="hasawi-chat-form" onSubmit={(event) => { event.preventDefault(); if (!busy) { void ask(draft); setDraft(""); } }}>
          <input dir="auto" className="font-arabic" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={800} placeholder="أو اكتب سؤالك هنا…" disabled={busy} />
          <button type="submit" disabled={busy || !draft.trim()}>Send</button>
        </form>

        <Link href="/challenges" onClick={close} className="robot-intro-start hasawi-chat-hack">
          <span className="font-arabic">جرّب تخترقني!</span> · Hack me →
        </Link>
      </section>
    </div>,
    document.body,
  );
}
