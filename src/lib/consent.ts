/**
 * Bump this whenever the Privacy Policy or Terms change materially — users are
 * asked to accept again on their next visit and a fresh record is stored.
 */
export const CONSENT_VERSION = "2026-09-02";

export const CONTROLLER = {
  name: { en: "Jonathan Shamir", he: "יונתן שמיר" },
  country: { en: "Israel", he: "ישראל" },
  email: "joeshamir@gmail.com",
} as const;

export type ConsentInput = {
  marketingOptIn: boolean;
  locale: string;
};
