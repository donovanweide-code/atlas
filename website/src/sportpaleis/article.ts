export const ARTICLE_CATEGORY = {
  SHIRT: "Shirt",
  SHORTS: "Short",
  TRAINING_PANTS: "Trainingsbroek",
  TRAINING_JACKET: "Trainingsjack",
  OTHER: "Overig",
} as const;

export type ArticleCategory =
  (typeof ARTICLE_CATEGORY)[keyof typeof ARTICLE_CATEGORY];

/**
 * Beschrijft uitsluitend welke invoer een artikel later kan ondersteunen.
 * Waarden voor een specifieke klant of speler horen niet bij Article.
 */
export interface PersonalizationCapabilities {
  initials: boolean;
  backNumber: boolean;
  shortsNumber: boolean;
}

export interface Article {
  id: string;
  articleNumber: string;
  name: string;
  category: ArticleCategory;
  imageReference: string;
  associationReference?: string;
  personalizationCapabilities: PersonalizationCapabilities;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
