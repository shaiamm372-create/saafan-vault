/** Checks Firebase settings from environment variables only (no SDK import). */
export function isFirebaseConfigured(): boolean {
  const key = !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const gcp = !!(process.env.K_SERVICE || process.env.FIREBASE_APP_HOSTING) && !!process.env.FIREBASE_PROJECT_ID;
  return key || gcp;
}
