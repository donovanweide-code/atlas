import {
  ARTICLE_CATEGORY,
  type Article,
} from "./article.ts";

/**
 * Volledig fictieve demonstratiedata. De demo://-waarden zijn alleen stabiele
 * referenties en wijzen niet naar uploads, externe opslag of productfoto's.
 */
export const sportpaleisDemoArticles = [
  {
    id: "article-demo-horizon-shirt",
    articleNumber: "SP-DEMO-SH-001",
    name: "Horizon Wedstrijdshirt",
    category: ARTICLE_CATEGORY.SHIRT,
    imageReference: "demo://sportpaleis/articles/horizon-shirt",
    associationReference: "association-demo-horizon",
    personalizationCapabilities: {
      initials: true,
      backNumber: true,
      shortsNumber: false,
    },
    active: true,
    createdAt: "2026-07-29T08:00:00.000Z",
    updatedAt: "2026-07-29T08:00:00.000Z",
  },
  {
    id: "article-demo-horizon-shorts",
    articleNumber: "SP-DEMO-ST-001",
    name: "Horizon Wedstrijdshort",
    category: ARTICLE_CATEGORY.SHORTS,
    imageReference: "demo://sportpaleis/articles/horizon-shorts",
    associationReference: "association-demo-horizon",
    personalizationCapabilities: {
      initials: true,
      backNumber: false,
      shortsNumber: true,
    },
    active: true,
    createdAt: "2026-07-29T08:05:00.000Z",
    updatedAt: "2026-07-29T08:05:00.000Z",
  },
  {
    id: "article-demo-neutral-training-jacket",
    articleNumber: "SP-DEMO-TJ-001",
    name: "Neutraal Trainingsjack",
    category: ARTICLE_CATEGORY.TRAINING_JACKET,
    imageReference: "demo://sportpaleis/articles/neutral-training-jacket",
    personalizationCapabilities: {
      initials: true,
      backNumber: false,
      shortsNumber: false,
    },
    active: true,
    createdAt: "2026-07-29T08:10:00.000Z",
    updatedAt: "2026-07-29T08:10:00.000Z",
  },
] as const satisfies readonly Article[];
