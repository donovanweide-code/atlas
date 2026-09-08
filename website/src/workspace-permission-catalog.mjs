// Generic authorization vocabulary. Display labels and presets are configuration, not identity rules.
const domains = {
  orders: ["Orders", { view: "Bekijken", create: "Invoeren", edit: "Aanpassen", complete: "Afronden", delete: "Verwijderen", record_communication: "Communicatie vastleggen zonder verzending" }],
  production: ["Productie", { view: "Bekijken", create: "Opdracht maken", edit: "Opdracht aanpassen", execute: "Produceren / PlotJob maken", complete: "Bedrukt bevestigen", reprint: "Opnieuw produceren", history: "Historie bekijken", replace_source: "Productiebron vervangen" }],
  planning: ["Planning", { view: "Module bekijken", create: "Eigen werk maken", create_for_others: "Werk voor collega maken", edit: "Aanpassen", assign: "Toewijzen", share: "Delen", note: "Notitie toevoegen", complete: "Afronden", delete: "Verwijderen" }],
  mail: ["Mail", { view: "Bekijken", reply: "Beantwoorden", send: "Nieuw bericht versturen", send_supplier: "Leveranciersmail versturen", archive: "Archiveren", delete: "Verwijderen", manage_templates: "Sjablonen beheren" }],
  suppliers: ["Leveranciers", { view: "Context bekijken" }],
  teamwear: ["Teamwear", { view: "Catalogus bekijken", create: "Voorstel maken", edit: "Voorstel aanpassen", add_asset: "Asset toevoegen", approve: "Asset goedkeuren", send: "Voor review versturen" }],
  documents: ["Documenten", { view: "Bekijken", create: "Toevoegen", edit: "Aanpassen", share: "Delen", delete: "Verwijderen" }],
  management: ["Beheer", { view: "Beheer bekijken", users: "Gebruikers beheren", presets: "Presets beheren", permissions: "Rechten beheren", settings: "Instellingen beheren", delete: "Medewerker definitief verwijderen" }],
  product_truth: ["Product Truth", { view: "Bekijken", propose: "Wijziging voorstellen", approve: "Authoritatieve wijziging goedkeuren" }],
  connectors: ["Connectors", { view: "Status bekijken", manage: "Connectors en credentials beheren" }],
  developer: ["Developer", { view: "Technische omgeving bekijken", manage: "Technische configuratie beheren", execute: "Release / deployment uitvoeren" }],
  webshop_intake: ["Webshop Bedrukking", { view: "Batch bekijken", edit: "Operationele correcties", execute: "PlotJob voorbereiden" }],
};
const critical = new Set(["developer.view", "developer.manage", "developer.execute", "connectors.manage", "product_truth.approve", "production.replace_source"]);
const management = new Set(["management.users", "management.presets", "management.permissions", "management.settings", "mail.manage_templates"]);
const semantics = { create_for_others: "create", reprint: "execute", history: "view", replace_source: "manage", reply: "send", send_supplier: "send", archive: "edit", manage_templates: "manage", add_asset: "create", users: "manage", presets: "manage", permissions: "manage", settings: "manage", propose: "create", record_communication: "edit" };
export const CAPABILITIES = Object.freeze(Object.fromEntries(Object.entries(domains).flatMap(([domain, [displayDomain, actions]]) => Object.entries(actions).map(([suffix, label]) => {
  const id = `${domain}.${suffix}`; const action = semantics[suffix] || suffix;
  return [id, Object.freeze({ id, domain, action, scope: critical.has(id) || management.has(id) ? "tenant" : "object-or-tenant", risk: critical.has(id) ? "critical" : action === "delete" ? "destructive" : action === "view" ? "read" : "write", displayDomain, label, description: `${displayDomain}: ${label.toLowerCase()}.`, objectGrantAllowed: !critical.has(id) && !management.has(id) && action !== "delete" && !["management", "connectors", "developer", "product_truth"].includes(domain) })];
}))));
export const CAPABILITY_IDS = Object.freeze(Object.keys(CAPABILITIES));
const employee = ["orders.view", "orders.create", "orders.record_communication"];
const production = [...employee, "orders.edit", "orders.complete", "production.view", "production.create", "production.edit", "production.execute", "production.complete", "production.reprint", "production.history"];
const planning = CAPABILITY_IDS.filter(id => id.startsWith("planning.") && id !== "planning.delete");
const operations = [...production, ...planning, "mail.view", "mail.reply", "mail.send", "mail.send_supplier", "mail.archive", "suppliers.view"];
const owner = CAPABILITY_IDS.filter(id => !critical.has(id) && !id.startsWith("webshop_intake.") && !id.startsWith("teamwear.") && CAPABILITIES[id].risk !== "destructive");
export const DEFAULT_PERMISSION_PRESETS = Object.freeze({
  employee: Object.freeze({ id: "employee", label: "Werknemer", capabilities: employee }),
  production: Object.freeze({ id: "production", label: "Productie", capabilities: production }),
  operations: Object.freeze({ id: "operations", label: "Productie & Operatie", capabilities: operations }),
  owner: Object.freeze({ id: "owner", label: "Eigenaar / Beheerder", capabilities: owner }),
  developer: Object.freeze({ id: "developer", label: "Developer / Admin", capabilities: CAPABILITY_IDS }),
});
