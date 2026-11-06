"use client";

import { useState } from "react";
import { X, Copy, Check, ExternalLink, Download, Share2 } from "lucide-react";
import { CHALLENGES } from "@/lib/challenges";
import { getRank, getEarnedBadges } from "@/lib/scoring";
import { cn, trackEvent } from "@/lib/utils";
import { SITE_URL, SITE_HOST, BRAND } from "@/lib/brand";
import { arBadge, arRank } from "@/lib/i18n/ar";

interface Props {
  challengeTitle: string;
  challengeLevel: number;
  pointsEarned: number;
  executionLabel: string;
  totalPoints: number;
  solvedIds: string[];
  username?: string;
  onClose: () => void;
}

const BASE_URL = SITE_URL;

function challengeUrl(level: number, username?: string): string {
  const challenge = CHALLENGES.find((item) => item.level === level)!;
  return `${BASE_URL}/challenges/${challenge.id}${username ? `?ref=${encodeURIComponent(username)}` : ""}`;
}

function buildGrid(solvedIds: string[]): string {
  return CHALLENGES.map((c) => (solvedIds.includes(c.id) ? "🟩" : "⬛")).join("");
}

function buildShareText({
  challengeTitle,
  challengeLevel,
  pointsEarned,
  executionLabel,
  solvedIds,
  username,
}: Omit<Props, "onClose">): string {
  const grid = buildGrid(solvedIds);
  const lines = [
    `أنجزت المستوى ${challengeLevel} في ${BRAND.vault}: ${challengeTitle}.`,
    executionLabel,
    pointsEarned ? `+${pointsEarned} نقطة مسجّلة على الخادم` : "نتيجة تعلّم غير محتسبة",
    "",
    `${grid} ${solvedIds.length}/${CHALLENGES.length} إنجاز على هذا الجهاز`,
    "",
    username ? `— ${username}` : "",
    "",
    `هل تستطيع تجاوز هذا المستوى؟ ${challengeUrl(challengeLevel, username)}`,
    "#خزنة_سعفان #أمن_الذكاء_الاصطناعي #الفريق_الأحمر",
  ];
  return lines.filter((l) => l !== "" || lines.indexOf(l) !== lines.lastIndexOf(l)).join("\n").trim();
}

export default function ShareResultCard(props: Props) {
  const { onClose } = props;
  const [copied, setCopied] = useState(false);
  const shareText = buildShareText(props);
  const rank = getRank(props.totalPoints);
  const badges = getEarnedBadges(props.solvedIds, props.totalPoints).filter((b) => b.earned);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(shareText);
    trackEvent("share");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadCard() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const context = canvas.getContext("2d");
    if (!context) return;
    const background = context.createLinearGradient(0, 0, 1200, 630);
    background.addColorStop(0, "#17130f");
    background.addColorStop(1, "#2a2410");
    context.fillStyle = background;
    context.fillRect(0, 0, 1200, 630);
    context.strokeStyle = "#3d4a2c";
    context.lineWidth = 2;
    context.strokeRect(42, 42, 1116, 546);
    const FONT = '"Plex Arabic", "Reem Kufi", Tahoma, Arial, sans-serif';
    const RIGHT = 1122;
    context.direction = "rtl";
    context.textAlign = "right";
    context.fillStyle = "#ecc664";
    context.font = `bold 27px ${FONT}`;
    context.fillText(`${BRAND.vault}  /  اكتملت المهمة`, RIGHT, 108);
    context.fillStyle = "#ffffff";
    context.font = `bold 62px ${FONT}`;
    context.fillText(`اكتمل المستوى ${props.challengeLevel.toString().padStart(2, "0")}`, RIGHT, 212);
    context.font = `34px ${FONT}`;
    context.fillText(props.challengeTitle.slice(0, 50), RIGHT, 266);
    context.fillStyle = "#ecc664";
    context.font = `bold 72px ${FONT}`;
    context.fillText(props.pointsEarned ? `+${props.pointsEarned} نقطة مسجّلة` : "تعلّم غير محتسب", RIGHT, 388);
    context.font = `22px ${FONT}`;
    context.fillStyle = "#ab9e8b";
    context.fillText(props.executionLabel, RIGHT, 425);
    CHALLENGES.forEach((challenge, index) => {
      context.fillStyle = props.solvedIds.includes(challenge.id) ? "#e0b04a" : "#4d443a";
      context.fillRect(RIGHT - 42 - index * 54, 447, 42, 42);
    });
    context.fillStyle = "#ab9e8b";
    context.font = `25px ${FONT}`;
    context.fillText(`${props.solvedIds.length}/${CHALLENGES.length} إنجاز على هذا الجهاز${props.username ? `  ·  ${props.username.slice(0, 24)}` : ""}`, RIGHT, 547);
    context.direction = "ltr";
    context.textAlign = "left";
    context.font = `22px ${FONT}`;
    context.fillText(SITE_HOST, 78, 547);
    const link = document.createElement("a");
    link.download = `saafan-vault-level-${props.challengeLevel}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    trackEvent("share");
  }

  async function nativeShare() {
    if (!navigator.share) return;
    await navigator.share({ title: BRAND.vault, text: shareText, url: challengeUrl(props.challengeLevel, props.username) })
      .then(() => trackEvent("share"))
      .catch(() => {});
  }

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(challengeUrl(props.challengeLevel, props.username))}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="شارك نتيجتك">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#241f1a] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-bold text-white text-lg">شارك نتيجتك</h3>
          <button onClick={onClose} aria-label="أغلق نافذة المشاركة" className="text-slate-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Card preview */}
        <div className="mx-5 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 to-emerald-950 p-5 shadow-[0_0_30px_rgba(224,176,74,0.08)]">
          <div className="mb-4 font-mono text-[10px] font-bold tracking-[0.18em] text-emerald-300">{BRAND.vault} / اكتملت المهمة</div>
          <div className="text-emerald-400 font-bold text-sm mb-1">
            🔓 المستوى {props.challengeLevel}: {props.challengeTitle}
          </div>
          <div className="text-white text-2xl font-extrabold mb-1">{props.pointsEarned ? `+${props.pointsEarned} نقطة مسجّلة` : "تعلّم غير محتسب"}</div>
          <p className="text-xs text-slate-400 mb-3">{props.executionLabel}</p>
          <div className={cn("text-sm mb-4", rank.color)}>
            {rank.icon} {arRank(rank.name)} · شارة تقدّم محلية
          </div>
          <div className="mb-3 grid max-w-[16rem] grid-cols-8 gap-1" role="img" aria-label={`حُلّت ${props.solvedIds.length} من ${CHALLENGES.length} مهمة`}>
            {CHALLENGES.map((challenge) => (
              <span key={challenge.id} className={cn("aspect-square rounded-sm border", props.solvedIds.includes(challenge.id)
                ? "border-emerald-300 bg-emerald-400 shadow-[0_0_8px_rgba(224,176,74,0.45)]"
                : "border-slate-700 bg-slate-950")} />
            ))}
          </div>
          <div className="text-xs text-slate-500">
            {props.solvedIds.length}/{CHALLENGES.length} إنجاز على هذا الجهاز
          </div>
          {badges.length > 0 && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {badges.map((b) => (
                <span key={b.id} className="text-xs bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5" title={arBadge(b.id, b).name}>
                  {b.icon} {b.name}
                </span>
              ))}
            </div>
          )}
          {props.username && (
            <div className="text-xs text-slate-400 mt-2">— {props.username}</div>
          )}
          <div className="mt-4 border-t border-emerald-500/20 pt-3 font-mono text-[10px] text-slate-400">{SITE_HOST}</div>
        </div>

        {/* Actions */}
        <div className="p-5 flex flex-col gap-3">
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <button onClick={nativeShare} className="flex items-center justify-center gap-2 w-full rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">
              <Share2 className="h-4 w-4" /> شارك عبر تطبيق
            </button>
          )}
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "تم النسخ!" : "انسخ النص"}
          </button>
          <button onClick={downloadCard} className="flex items-center justify-center gap-2 w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-emerald-400/50">
            <Download className="h-4 w-4" /> نزّل بطاقة النتيجة
          </button>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={twitterUrl}
              onClick={() => trackEvent("share")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Twitter / X
            </a>
            <a
              href={linkedInUrl}
              onClick={() => trackEvent("share")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-white text-sm transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export { buildGrid, buildShareText };
