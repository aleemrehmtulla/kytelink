import type { DnsRecord } from "@kytelink/schemas";

// Mock-client fixture only. The real records come from the API, which derives
// them from CUSTOM_DOMAIN_A_RECORD / CUSTOM_DOMAIN_CNAME_TARGET — never hardcode
// them on a client, or a self-hoster's users get told to point at Vercel.
export const SAMPLE_DNS_RECORDS: readonly DnsRecord[] = [
  { type: "A", name: "@", value: "76.76.21.21" },
  { type: "CNAME", name: "www", value: "cname.vercel-dns.com" },
];
