import { Fragment } from "react";

/**
 * Arabic text that contains English fragments (attack phrases, tool names,
 * URLs). Each English fragment is isolated so its quotes, parentheses and
 * punctuation keep left-to-right order inside the right-to-left sentence.
 */
const QUOTED_LATIN = /"[A-Za-z0-9<!\[(.][^"]*"/;
const LATIN_RUN = /[A-Za-z0-9<!\[(][A-Za-z0-9 _.'\-:\/<>=$@!?…,()|\[\]{}*+&;%#~^]*[A-Za-z0-9)\]>…}*]/;
const SPLIT = new RegExp(`(${QUOTED_LATIN.source}|${LATIN_RUN.source})`, "g");

export default function ArabicText({ text }: { text: string }) {
  const raw = text.split(SPLIT);
  // Merge English fragments separated only by spaces, so they stay in one left-to-right run.
  const parts: string[] = [raw[0]];
  for (let i = 1; i < raw.length; i += 2) {
    const latin = raw[i];
    const after = raw[i + 1] ?? "";
    if (parts.length > 1 && /^\s*$/.test(parts[parts.length - 1]) && parts.length % 2 === 1) {
      const gap = parts.pop()!;
      parts[parts.length - 1] += gap + latin;
    } else {
      parts.push(latin);
    }
    parts.push(after);
  }
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <bdi key={index} dir="ltr">{part}</bdi>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
