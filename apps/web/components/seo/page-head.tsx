import Head from "next/head";
import { KYTELINK_ORIGIN } from "@kytelink/ui";

export interface PageHeadProps {
  title: string;
  description?: string;
  canonicalPath?: string;
  noindex?: boolean;
}

export function PageHead({ title, description, canonicalPath, noindex = false }: PageHeadProps) {
  return (
    <Head>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      {canonicalPath ? <link rel="canonical" href={`${KYTELINK_ORIGIN}${canonicalPath}`} /> : null}
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
    </Head>
  );
}
