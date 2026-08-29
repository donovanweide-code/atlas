import path from "node:path";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../../scripts/mail-foundation.mjs";

export function createTestMailFoundation(root) {
  return new MailFoundation({
    organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }),
    store: new MemoryMailStore(),
    transport: new CaptureTransport({ captureDirectory: path.join(root, "mail-captures") }),
  });
}

export async function captureReceipt(service, actor, order, idempotencyKey) {
  let current = order;
  if (!String(current.customerEmail ?? "").trim()) {
    current = await service.updateOrder(actor.token, actor.csrfToken, current.id, { customerEmail: `${String(current.id).replace(/[^a-z0-9]+/giu, "-").toLocaleLowerCase("nl-NL")}@example.test` }, current.revision);
  }
  const attempt = await service.captureOrderMail(actor.token, actor.csrfToken, current.id, { templateKey: "ORDER_RECEIVED" }, idempotencyKey);
  if (attempt.status !== "CAPTURED") throw new Error(`Testmail is niet veilig vastgelegd: ${attempt.status}`);
  return service.order(actor.token, current.id);
}
