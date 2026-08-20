const DIRECTORY_SOURCE_ID = "sportpaleis-visible-sales-codes-20260820";

const EMPLOYEE_SOURCE_ROWS = Object.freeze([
  ["1", "Jack Laan"], ["3", "Michel K"], ["7", "Geraldine"], ["13", "Mitchel"],
  ["14", "Jordy"], ["15", "Dané-Sally"], ["18", "Patrick"], ["19", "Hidde"],
  ["20", "Femke"], ["22", "Kenneth"], ["24", "Marino"], ["29", "Rauli"],
  ["32", "Elly-May"], ["33", "Joann"], ["35", "Gillian"],
  ["36", "Alg. verkoper Almere", "FUNCTION"], ["39", "Kevin"], ["45", "Donovan"],
  ["51", "Danielle"], ["52", "Isra"], ["58", "Fabian"], ["62", "Julian"],
  ["63", "Merel"], ["65", "Dain"], ["66", "Linda"], ["69", "Jairho"],
  ["70", "Sylvia"], ["71", "Amy"], ["72", "Jordi van der Veen"], ["73", "Jesse"],
  ["76", "Luuk"], ["77", "Gianny"], ["79", "Milan"], ["80", "Erik"],
  ["81", "Dymon"], ["82", "Robin"], ["83", "Senna"], ["84", "Myron"],
  ["85", "Senna"], ["86", "Sara"], ["87", "Collin"], ["88", "Noa"],
  ["89", "Sem"], ["90", "Sportpaleis OUTLET", "FUNCTION"], ["91", "Bryan Paais"],
  ["95", "Mitchell"], ["97", "To Be Dressed", "FUNCTION"],
  ["98", "Sportpaleis.NL", "SYSTEM"], ["99", "SPORT 2000 WEBSHOP", "SYSTEM"],
  ["100", "Team Sales", "FUNCTION"],
].map(([salesNumber, name, accountType = "HUMAN"]) => Object.freeze({
  salesNumber,
  name,
  accountType,
})));

export const SPORTPALEIS_UNVERIFIED_SALES_CODES = Object.freeze([
  "5", "6", "9", "11", "16", "17", "21", "23", "25", "27", "56", "74",
]);

export const SPORTPALEIS_EMPLOYEE_DIRECTORY_SOURCE = Object.freeze({
  sourceId: DIRECTORY_SOURCE_ID,
  label: "Aangeleverde zichtbare Sportpaleis-verkoopcodes",
  observedAt: "2026-08-20",
  rows: EMPLOYEE_SOURCE_ROWS,
  unverifiedSalesCodes: SPORTPALEIS_UNVERIFIED_SALES_CODES,
});

function normalizedName(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/gu, "")
    .trim().replace(/\s+/gu, " ").toLocaleLowerCase("nl-NL");
}

function compatibleName(current, supplied) {
  const left = normalizedName(current);
  const right = normalizedName(supplied);
  return left === right || left.startsWith(`${right} `) || right.startsWith(`${left} `);
}

export function reconcileSportpaleisEmployeeDirectory(currentEmployees, now = new Date()) {
  const current = Array.isArray(currentEmployees) ? currentEmployees : [];
  const bySalesNumber = new Map(current.map((employee) => [String(employee.salesNumber), employee]));
  const additions = [];
  const matched = [];
  const nameDifferences = [];

  for (const source of EMPLOYEE_SOURCE_ROWS) {
    const existing = bySalesNumber.get(source.salesNumber);
    if (existing) {
      matched.push(source.salesNumber);
      if (!compatibleName(existing.name, source.name)) nameDifferences.push(source.salesNumber);
      continue;
    }
    additions.push({
      id: `employee-sales-${source.salesNumber}`,
      name: source.name,
      salesNumber: source.salesNumber,
      active: true,
      userId: null,
      revision: 1,
      accountType: source.accountType,
      provenance: {
        sourceId: DIRECTORY_SOURCE_ID,
        observedAt: SPORTPALEIS_EMPLOYEE_DIRECTORY_SOURCE.observedAt,
        importedAt: now.toISOString(),
      },
    });
  }

  return {
    additions,
    matched,
    nameDifferences,
    unverifiedSalesCodes: [...SPORTPALEIS_UNVERIFIED_SALES_CODES],
    summary: {
      sourceId: DIRECTORY_SOURCE_ID,
      comparedAt: now.toISOString(),
      suppliedNamedCodes: EMPLOYEE_SOURCE_ROWS.length,
      matched: matched.length,
      added: additions.length,
      preservedNameDifferences: nameDifferences.length,
      unverified: SPORTPALEIS_UNVERIFIED_SALES_CODES.length,
    },
  };
}
