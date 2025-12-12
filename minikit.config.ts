const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjE1NTU4NzMsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg5QjQ0NzdCMDdiOTIxRjJGNTc3ZTY1NzdmNjk3OWE5ZEE4MjQ3NGY3In0",
    payload: "eyJkb21haW4iOiJ0ZW1wLmNhcmRzLXRjZy1zdG9yZS52ZXJjZWwuYXBwIn0",
    signature: "MHhkNGU1OTBmMTI0NWRiNzlkZDNhZTM5MTBiNjAxZmNkYzkxMTUyMGM5ZTAyNTdkYzFlZDU4ZjQ3NTU5NmEwNmQxNWNlOWUyNDhkZDdjYjZmN2MwZmYwZmQxOTMzY2M3MDYyMjdhMDg4YTNiNWU1NTU1ZDU3YjU5OTZkZWM0MTBlNDFj",
  },
  baseBuilder: {
    ownerAddress: "",
  },
  miniapp: {
    version: "1",
    name: "cards-tcg-store",
    subtitle: "",
    description: "",
    screenshotUrls: [],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "utility",
    tags: ["example"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/hero.png`,
  },
} as const;
