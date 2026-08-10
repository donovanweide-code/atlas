import {
  createSportpaleisDefaultPreference,
  createSportpaleisPasswordRecord,
  createSportpaleisProductionBootstrap,
  validateSportpaleisPilotState,
} from "./sportpaleis-pilot-foundation.mjs";

function developmentOrders() {
  return [
    {
      id: "SP-2026-0104", revision: 1, customer: "Daniël Wouters", association: "A.S.C. Waterwijk",
      createdAt: "2026-08-07T08:24:00.000Z", updatedAt: "2026-08-07T08:24:00.000Z", promisedAt: "2026-08-08T15:00:00.000Z",
      stage: "CONTROL", owner: "Patrick", totalPieces: 3, attention: "Keeperstrui heeft afwijkend rugnummer 14.",
      items: [
        { id: "shirt-home", product: "Wedstrijdshirt thuis", quantity: 1, personalization: "DW · Rug 10", foilColor: "Wit" },
        { id: "short-home", product: "Wedstrijdshort thuis", quantity: 1, personalization: "DW · Short 10", foilColor: "Wit" },
        { id: "keeper", product: "Keeperstrui", quantity: 1, personalization: "DW · Rug 14", foilColor: "Wit" },
      ],
    },
    {
      id: "SNIJTEST-001", revision: 1, customer: "Interne productietest", association: "Maatvoering volgens Almerer Pioneers",
      createdAt: "2026-08-06T13:10:00.000Z", updatedAt: "2026-08-06T13:10:00.000Z", promisedAt: "2026-08-08T10:00:00.000Z",
      stage: "PRINT", owner: "Patrick", totalPieces: 3, attention: "Fysieke validatie en hardwarevalidatie zijn nog vereist.", productionReference: "SNIJTEST-001",
      items: [
        { id: "number-2", product: "Senior rugnummer", quantity: 1, personalization: "2 · 200 mm", foilColor: "Wit" },
        { id: "number-34", product: "Senior rugnummer", quantity: 1, personalization: "34 · 200 mm", foilColor: "Wit" },
        { id: "number-77", product: "Senior rugnummer", quantity: 1, personalization: "77 · 200 mm", foilColor: "Wit" },
      ],
    },
    ...[
      ["SP-2026-0103", "Sanne de Boer", "A.S.C. Waterwijk", "ORDER", "Wedstrijdshirt thuis", "Wit", 2],
      ["SP-2026-0102", "M. de Jong", "Buitenhout MHC", "CONTROL", "Wedstrijdshirts", "Zwart", 4],
      ["SP-2026-0101", "Noah Smit", "FC Almere", "PRINT", "Presentatiepolo", "Rood", 2],
      ["SP-2026-0100", "Jesse Visser", "A.S.C. Waterwijk", "ORDER", "Trainingsjack", "Wit", 1],
      ["SP-2026-0099", "Lina Bakker", "Buitenhout MHC", "CONTROL", "Wedstrijdshort", "Wit", 3],
      ["SP-2026-0098", "S. Vos", "FC Almere", "DONE", "Presentatiepolo", "Wit", 2],
      ["SP-2026-0097", "Mila Mulder", "A.S.C. Waterwijk", "ORDER", "Keeperstrui", "Rood", 1],
      ["SP-2026-0096", "Daan Meijer", "A.S.C. Waterwijk", "CONTROL", "Inloopshirt", "Wit", 2],
    ].map(([id, customer, association, stage, product, foilColor, quantity], index) => ({
      id, revision: 1, customer, association, associations: [association],
      customerEmail: `${String(customer).toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@example.nl`, customerPhone: "06 12345678",
      createdAt: `2026-08-0${Math.max(1, 7 - index)}T09:30:00.000Z`, updatedAt: `2026-08-0${Math.max(1, 7 - index)}T09:30:00.000Z`,
      promisedAt: `2026-08-${String(10 + index).padStart(2, "0")}T16:00:00.000Z`, stage, owner: index % 2 ? "Sportpaleis collega" : "Patrick",
      totalPieces: quantity, foilStates: [{ color: foilColor, status: foilColor === "Rood" ? "HOLD" : "READY" }],
      items: [{ id: `seed-${index}`, articleId: "home-shirt", articleNumber: "ASC-1001", imageKey: "asc-shirt-home", product, association, size: index % 2 ? "M" : "L", quantity, personalization: `Initialen ${String(customer).split(" ").map((part) => part[0]).join("").slice(0, 2)} · Rug ${10 + index}`, foilColor, productionProfileId: "profile-shirt", productionInstruction: "Development fixture" }],
    })),
  ];
}

export async function createSportpaleisDevelopmentSeed(seedPasswords, now = new Date()) {
  for (const id of ["kevin", "patrick", "collega", "donovan-support"]) {
    if (!seedPasswords?.[id]) throw new Error(`Ontbrekend pilotwachtwoord voor ${id}.`);
  }
  const definitions = [
    { id: "kevin", name: "Kevin", initials: "KV", role: "admin", email: "kevin@sportpaleis.nl", status: "Actief", seatType: "customer", salesNumber: null },
    { id: "patrick", name: "Patrick", initials: "PA", role: "operator", email: "patrick@sportpaleis.nl", status: "Actief", seatType: "customer", salesNumber: null },
    { id: "collega", name: "Winkelmedewerker", initials: "WM", role: "store", email: "collega@sportpaleis.nl", status: "Actief", seatType: "customer", salesNumber: null },
    { id: "donovan-support", name: "Donovan · technische ondersteuning", initials: "DW", role: "support", email: "support@webuildanddesign.nl", status: "Actief", seatType: "support", salesNumber: "45" },
  ];
  const users = [];
  for (const definition of definitions) {
    users.push({ ...definition, password: await createSportpaleisPasswordRecord(seedPasswords[definition.id]) });
  }
  const state = createSportpaleisProductionBootstrap(now);
  state.revision = 1;
  state.nextOrderSequence = 105;
  state.users = users;
  state.orders = developmentOrders();
  state.preferences = Object.fromEntries(users.map(({ id }) => [id, createSportpaleisDefaultPreference()]));
  state.audit = [{ id: "audit-seed", at: now.toISOString(), userId: "system", action: "Development datastore geïnitialiseerd", subject: "Workspace development fixture" }];
  return validateSportpaleisPilotState(state);
}
