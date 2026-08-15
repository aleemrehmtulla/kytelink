export type BrandSector = "telecom" | "bank" | "shipping" | "marketplace" | "crypto" | "tech";

export interface MajorBrand {
  name: string;
  sector: BrandSector;
  /** Whole-word forms as they appear in profile text. */
  tokens: string[];
  /** Domains the brand actually owns — a destination on one of these is never impersonation. */
  domains: string[];
}

/**
 * Only brands whose support desk is worth impersonating at scale. Telecom leads
 * because that is what real Kytelink phishing imitates; a name outside this list
 * is somebody's business, not a target.
 */
export const MAJOR_BRANDS: MajorBrand[] = [
  { name: "AT&T", sector: "telecom", tokens: ["at&t", "att"], domains: ["att.com"] },
  { name: "Verizon", sector: "telecom", tokens: ["verizon"], domains: ["verizon.com"] },
  { name: "T-Mobile", sector: "telecom", tokens: ["t-mobile", "tmobile"], domains: ["t-mobile.com"] },
  { name: "Sprint", sector: "telecom", tokens: ["sprint"], domains: ["sprint.com"] },
  { name: "Bell", sector: "telecom", tokens: ["bell", "bell canada"], domains: ["bell.ca"] },
  { name: "Rogers", sector: "telecom", tokens: ["rogers"], domains: ["rogers.com"] },
  { name: "Telus", sector: "telecom", tokens: ["telus"], domains: ["telus.com"] },
  { name: "Fido", sector: "telecom", tokens: ["fido"], domains: ["fido.ca"] },
  { name: "Koodo", sector: "telecom", tokens: ["koodo"], domains: ["koodomobile.com"] },
  { name: "Freedom Mobile", sector: "telecom", tokens: ["freedom mobile"], domains: ["freedommobile.ca"] },
  { name: "Virgin Mobile", sector: "telecom", tokens: ["virgin mobile"], domains: ["virginplus.ca"] },
  { name: "Vodafone", sector: "telecom", tokens: ["vodafone"], domains: ["vodafone.com"] },
  { name: "Xfinity", sector: "telecom", tokens: ["xfinity"], domains: ["xfinity.com"] },
  { name: "Comcast", sector: "telecom", tokens: ["comcast"], domains: ["comcast.com"] },
  { name: "Spectrum", sector: "telecom", tokens: ["spectrum"], domains: ["spectrum.com"] },
  { name: "PayPal", sector: "bank", tokens: ["paypal"], domains: ["paypal.com"] },
  { name: "Chase", sector: "bank", tokens: ["chase"], domains: ["chase.com"] },
  { name: "Wells Fargo", sector: "bank", tokens: ["wells fargo", "wellsfargo"], domains: ["wellsfargo.com"] },
  { name: "Bank of America", sector: "bank", tokens: ["bank of america"], domains: ["bankofamerica.com"] },
  { name: "HSBC", sector: "bank", tokens: ["hsbc"], domains: ["hsbc.com"] },
  { name: "RBC", sector: "bank", tokens: ["rbc", "royal bank"], domains: ["rbcroyalbank.com", "rbc.com"] },
  { name: "TD", sector: "bank", tokens: ["td bank", "td canada trust"], domains: ["td.com", "tdbank.com"] },
  { name: "Scotiabank", sector: "bank", tokens: ["scotiabank"], domains: ["scotiabank.com"] },
  { name: "BMO", sector: "bank", tokens: ["bmo"], domains: ["bmo.com"] },
  { name: "Citibank", sector: "bank", tokens: ["citibank"], domains: ["citibank.com", "citi.com"] },
  { name: "Barclays", sector: "bank", tokens: ["barclays"], domains: ["barclays.co.uk"] },
  { name: "Revolut", sector: "bank", tokens: ["revolut"], domains: ["revolut.com"] },
  { name: "FedEx", sector: "shipping", tokens: ["fedex"], domains: ["fedex.com"] },
  { name: "DHL", sector: "shipping", tokens: ["dhl"], domains: ["dhl.com"] },
  { name: "USPS", sector: "shipping", tokens: ["usps"], domains: ["usps.com"] },
  { name: "Canada Post", sector: "shipping", tokens: ["canada post"], domains: ["canadapost.ca"] },
  { name: "Amazon", sector: "marketplace", tokens: ["amazon"], domains: ["amazon.com", "amazon.ca"] },
  { name: "Netflix", sector: "marketplace", tokens: ["netflix"], domains: ["netflix.com"] },
  { name: "Coinbase", sector: "crypto", tokens: ["coinbase"], domains: ["coinbase.com"] },
  { name: "Binance", sector: "crypto", tokens: ["binance"], domains: ["binance.com"] },
  { name: "Kraken", sector: "crypto", tokens: ["kraken"], domains: ["kraken.com"] },
  { name: "MetaMask", sector: "crypto", tokens: ["metamask"], domains: ["metamask.io"] },
  { name: "Apple", sector: "tech", tokens: ["apple id", "icloud"], domains: ["apple.com", "icloud.com"] },
  { name: "Microsoft", sector: "tech", tokens: ["microsoft"], domains: ["microsoft.com"] },
  { name: "Google", sector: "tech", tokens: ["google"], domains: ["google.com"] },
];

/**
 * Claiming to *be* a support desk. Only counts when it sits immediately beside a
 * major brand — on its own this is a small business answering its own customers.
 */
export const SUPPORT_CLAIM_TERMS = [
  "customer support",
  "customer service",
  "customer care",
  "client support",
  "tech support",
  "technical support",
  "live support",
  "official support",
  "support team",
  "support desk",
  "support centre",
  "support center",
  "help desk",
  "helpdesk",
  "account recovery",
  "account verification",
  "account services",
  "billing support",
  "billing department",
  "refund department",
  "refunds department",
  "support",
] as const;

/** Host segments that turn a brand-bearing domain into a credential-capture domain. */
export const PHISH_HOST_SEGMENTS = new Set([
  "support",
  "secure",
  "security",
  "login",
  "signin",
  "verify",
  "verification",
  "account",
  "accounts",
  "billing",
  "refund",
  "refunds",
  "recovery",
  "recover",
  "unlock",
  "helpdesk",
  "customercare",
  "update",
  "alert",
]);

/** Path shapes a credential-capture page uses once the profile claims to be a brand. */
export const CAPTURE_PATH_HINTS = [
  "login",
  "signin",
  "sign-in",
  "verify",
  "verification",
  "account",
  "recover",
  "recovery",
  "unlock",
  "reactivate",
  "billing",
  "payment",
  "refund",
  "claim",
  "confirm",
  "secure",
] as const;

/** Direct-contact schemes and hosts — the "call this number" half of a support scam. */
export const CONTACT_LINK_HOSTS = new Set(["wa.me", "api.whatsapp.com", "t.me", "telegram.me"]);

/** Advisory only. A Gmail address on a business account is not evidence of anything. */
export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "mail.com",
  "gmx.com",
]);

/**
 * Advisory only, and trimmed to registrars that hand out throwaway domains — the
 * older list included .xyz/.link/.support, which is where half of small-business
 * and creator domains live.
 */
export const HIGH_ABUSE_TLDS = new Set(["tk", "ml", "ga", "cf", "gq", "zip", "mov"]);

/** Advisory only. Shorteners are how ordinary people share links. */
export const URL_SHORTENERS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "is.gd",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "rb.gy",
  "buff.ly",
  "ow.ly",
  "s.id",
  "tiny.cc",
]);

/** IP-grabber and visitor-deanonymising services — no legitimate use in a bio link. */
export const URL_BLOCKLIST_PATTERNS = [
  "grabify.link",
  "iplogger.org",
  "iplogger.com",
  "2no.co",
  "blasze.com",
  "yip.su",
] as const;
