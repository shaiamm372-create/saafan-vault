/**
 * Brand settings. Change the names here and they update across the whole site.
 */
export const BRAND = {
  /** Club name as shown on the logo. */
  name: "Cybersecurity Club",
  nameAr: "نادي الأمن السيبراني",
  university: "King Faisal University",
  /** The platform itself. */
  platform: "AI Security Challenges",
  /** Title used in the browser tab and share previews. */
  title: "AI Security Challenges · KFU Cybersecurity Club",
  owner: "KFU Cybersecurity Club",
  ownerEmail: "kfucsclub@gmail.com",
  /** Logo files in /public/brand. */
  emblem: "/brand/csc-emblem.png",
  logo: "/brand/csc-logo.png",
  /** The robot character that greets visitors on the home page. */
  mascot: { name: "SAIF", nameAr: "سيف" },
} as const;

/**
 * The public address of the site, used in share links and metadata.
 * On Vercel this is filled in automatically; set NEXT_PUBLIC_SITE_URL to override.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
