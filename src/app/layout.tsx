import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CHALLENGES } from "@/lib/challenges";
import { AGENTIC_MISSIONS } from "@/lib/agentic/catalog";
import { GUIDED_LABS } from "@/lib/guided-labs";
import { BRAND, SITE_URL } from "@/lib/brand";

const DESCRIPTION = `تعلّم أمن الذكاء الاصطناعي عبر مسار تأسيسي كامل، و${CHALLENGES.length + AGENTIC_MISSIONS.length} مهمة، و${GUIDED_LABS.length} مختبرات دفاع موجّهة. حاول تخترق ${BRAND.vault}، وافهم الثغرة، وتعلّم كيف تسدّها. التدريب مجاني وبدون تسجيل.`;

const BASE_URL = SITE_URL;
const TITLE = `${BRAND.name} — ${BRAND.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: `%s | ${BRAND.name}`,
  },
  description:
    DESCRIPTION,
  keywords: [
    "prompt injection",
    "prompt injection CTF",
    "AI security playground",
    "LLM jailbreak",
    "jailbreak LLM",
    "AI red teaming",
    "red teaming AI",
    "LLM security",
    "AI CTF",
    "OWASP LLM Top 10",
    "indirect prompt injection",
    "AI agent attack",
    "agent tool abuse",
    "machine learning security",
    "ChatGPT jailbreak",
    "Claude jailbreak",
    "AI attack",
    "token smuggling",
    "intent drift",
    "MITRE ATLAS",
    "adversarial AI",
    "AI security training",
    "LLM red team",
    "generative AI security",
  ],
  authors: [{ name: BRAND.owner }, { name: BRAND.upstream.author, url: BRAND.upstream.url }],
  creator: BRAND.owner,
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: BASE_URL,
    siteName: BRAND.name,
    title: TITLE,
    description:
      DESCRIPTION,
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      DESCRIPTION,
    images: [`${BASE_URL}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: TITLE,
  inLanguage: "ar",
  url: BASE_URL,
  description:
    DESCRIPTION,
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Organization", name: BRAND.owner },
  isBasedOn: BRAND.upstream.url,
  keywords: "prompt injection, AI security, CTF, jailbreak, red teaming, LLM security",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-sans bg-transparent text-white antialiased flex flex-col min-h-screen">
        <div className="cyber-field" aria-hidden="true">
          <svg viewBox="0 0 1440 900" fill="none" preserveAspectRatio="xMidYMid slice">
            <g className="cyber-circuits">
              <path d="M0 210H90L150 150H300L360 210V360L430 430H510" />
              <path d="M1440 300H1350L1290 240H1160L1100 300V460L1040 520H960" />
              <path d="M0 730H180L240 670H350V570L420 500" />
              <path d="M1440 760H1280L1210 690H1090L1030 750H880" />
              <path d="M140 0V60L210 130H410M1300 0V100L1230 170H1120" />
            </g>
            <g className="cyber-flows">
              <path d="M0 210H90L150 150H300L360 210V360L430 430H510" />
              <path d="M1440 760H1280L1210 690H1090L1030 750H880" />
            </g>
            <g className="cyber-nodes">
              <circle cx="150" cy="150" r="4" /><circle cx="360" cy="360" r="4" />
              <circle cx="1290" cy="240" r="4" /><circle cx="1090" cy="690" r="4" />
              <circle cx="240" cy="670" r="4" /><circle cx="1230" cy="170" r="4" />
            </g>
            <g className="cyber-node-rings">
              <circle cx="150" cy="150" r="13" /><circle cx="1290" cy="240" r="13" /><circle cx="240" cy="670" r="13" />
            </g>
            <g className="cyber-labels">
              <text x="158" y="137">مدخلات غير موثوقة</text><text x="1140" y="225">حدّ الثقة</text>
              <text x="250" y="657">السياق / السياسة</text><text x="1100" y="677">صلاحيات الأدوات</text>
            </g>
          </svg>
        </div>
        <Navigation />
        <a href="#main-content" className="skip-content-link">تخطَّ إلى المحتوى</a>
        <main id="main-content" className="flex-1" tabIndex={-1}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
