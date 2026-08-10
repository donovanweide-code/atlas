/**
 * De gedeelde orderstatussen. Nieuwe statussen kunnen hier worden toegevoegd
 * zonder het ordermodel of een bronadapter te veranderen.
 */
export const ORDER_STATUS = {
  NEW: "Nieuw",
  TO_REVIEW: "Te controleren",
  IN_PRODUCTION: "In productie",
  READY: "Gereed",
  CLOSED: "Afgesloten",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/**
 * Herkomst is uitsluitend metadata. Een Atlas Order krijgt geen bronafhankelijk
 * gedrag of bronafhankelijke statusstructuur.
 */
export const ORDER_SOURCE = {
  STORE: "Winkel",
  WEBSHOP: "Webshop",
} as const;

export type OrderSource = (typeof ORDER_SOURCE)[keyof typeof ORDER_SOURCE];

/**
 * Minimale, typeveilige brug naar Article. Dit is nog geen OrderItem: aantallen,
 * prijzen en ingevoerde personalisatie horen pas bij een volgende fase.
 */
export interface AtlasOrderArticleReference {
  articleId: string;
}

/**
 * Bewust kleine uitbreidingsplaatsen. Alleen de relatie waarmee meerdere
 * artikelen later aan een order kunnen hangen is in fase 2 typeveilig gemaakt.
 */
export interface OrderExpansionSlots {
  customer?: never;
  items?: readonly AtlasOrderArticleReference[];
  personalization?: never;
  communication?: never;
  sourceMetadata?: never;
}

export interface AtlasOrder extends OrderExpansionSlots {
  internalOrderNumber: string;
  externalOrderNumber?: string;
  source: OrderSource;
  customerName: string;
  association: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
