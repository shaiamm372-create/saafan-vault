"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildIsolatedHtmlSandboxDocument, findActiveHtml } from "@/lib/active-html";

interface Props {
  response: string;
}

interface SandboxSignal {
  kind: string;
  detail: string;
}

export default function IsolatedHtmlSandboxView({ response }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [signal, setSignal] = useState<SandboxSignal | null>(null);
  const evidence = findActiveHtml(response);
  const sandboxDocument = useMemo(() => buildIsolatedHtmlSandboxDocument(response), [response]);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.source !== "ctf-xss-sandbox") return;
      setSignal({
        kind: String(event.data.kind ?? "execution"),
        detail: String(event.data.detail ?? "").slice(0, 200),
      });
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  return (
    <div className="space-y-2">
      <div className="ltr whitespace-pre-wrap break-all">{response}</div>
      <div className="rounded-md border border-fuchsia-500/25 bg-fuchsia-500/5 p-3 font-sans">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-400">
          معاينة تنفيذ HTML معزولة
        </div>
        <iframe
          ref={frameRef}
          title="بيئة معزولة لعرض هجوم XSS"
          sandbox="allow-scripts"
          srcDoc={sandboxDocument}
          className="h-20 w-full rounded border border-slate-700 bg-slate-950"
        />
        <div
          role="status"
          className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300"
        >
          {signal
            ? `التقطت البيئة المعزولة ${signal.kind}(${signal.detail}). نُفّذت الشفرة النشطة.`
            : evidence
              ? `حُمّل ${evidence.kind} نشط داخل بيئة معزولة بأصل فريد وبلا شبكة.`
              : "لم تُرصد أي شفرة HTML نشطة."}
          {" "}لا تستطيع الحمولة الوصول إلى صفحة التطبيق أو ملفات تعريف الارتباط أو التخزين أو الشبكة.
        </div>
      </div>
    </div>
  );
}
