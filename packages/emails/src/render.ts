import type { ReactElement } from "react";
import { render } from "@react-email/components";

export interface RenderedEmail {
  html: string;
  text: string;
}

export async function renderEmail(element: ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { html, text };
}
