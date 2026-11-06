/**
 * Brand settings for the Arabic (Al-Ahsa) edition.
 * Change the names here and they update across the whole site.
 */
export const BRAND = {
  /** Platform name shown in the navigation bar and page titles. */
  name: "كفو",
  /** The guardian character. */
  guardian: "سعفان",
  /** The thing the guardian protects. */
  vault: "خزنة سعفان",
  /** Short tagline under the name. */
  tagline: "خزنة سعفان للذكاء الاصطناعي",
  /** Who runs this edition. */
  owner: "نادي الأمن السيبراني — جامعة الملك فيصل",
  ownerShort: "نادي الأمن السيبراني",
  ownerEmail: "kfucsclub@gmail.com",
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
