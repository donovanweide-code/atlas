import {
  ORDER_SOURCE,
  ORDER_STATUS,
  type AtlasOrder,
} from "./order.ts";

/**
 * Uitsluitend fictieve demonstratiedata. Deze records zijn niet afkomstig uit
 * een winkel, mailbox, webshop of andere externe koppeling.
 */
export const sportpaleisDemoOrders = [
  {
    internalOrderNumber: "SP-2026-0001",
    source: ORDER_SOURCE.STORE,
    customerName: "Noor de Vries",
    association: "VC Horizon",
    status: ORDER_STATUS.NEW,
    createdAt: "2026-07-28T09:15:00.000Z",
    updatedAt: "2026-07-28T09:15:00.000Z",
  },
  {
    internalOrderNumber: "SP-2026-0002",
    externalOrderNumber: "WEB-EMAIL-1042",
    source: ORDER_SOURCE.WEBSHOP,
    customerName: "Sam Jansen",
    association: "SV Blauw-Wit",
    status: ORDER_STATUS.TO_REVIEW,
    createdAt: "2026-07-28T10:42:00.000Z",
    updatedAt: "2026-07-28T11:03:00.000Z",
  },
] as const satisfies readonly AtlasOrder[];
