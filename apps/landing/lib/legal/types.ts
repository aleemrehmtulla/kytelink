interface LegalSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  slot?: string;
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}
