export type WbdAttentionState = "Afgerond" | "Actief" | "Wacht op bevestiging" | "Verdient vandaag aandacht" | "Horizon";

export interface WbdProject {
  id: "001A" | "001B" | "002";
  title: string;
  roadmapState: "Afgerond" | "Actief" | "Hierna";
  attentionState: WbdAttentionState;
  phase: string;
  latestMilestone: string;
  nextValidatedStep: string;
  blockers: string;
  result?: readonly string[];
}

export const wbdProjects: readonly WbdProject[] = [
  {
    id: "001A",
    title: "WBD Factuur Foundation",
    roadmapState: "Afgerond",
    attentionState: "Afgerond",
    phase: "GO / Afgerond",
    latestMilestone: "Eerste definitieve factuur F00248 is vergrendeld en als PDF beschikbaar.",
    nextValidatedStep: "Geen uitbreiding; alleen regressieherstel wanneer dat noodzakelijk blijkt.",
    blockers: "Geen.",
    result: [
      "Herbruikbaar WBD-factuursjabloon",
      "Workspace-invoer met inclusief- en exclusief-btwberekeningen",
      "Conceptopslag en opnieuw bewerken",
      "Definitief maken met server-side vergrendeling en verplaatsing naar Verzonden",
      "PDF openen, downloaden en printen",
    ],
  },
  {
    id: "001B",
    title: "WBD Workspace Foundation",
    roadmapState: "Afgerond",
    attentionState: "Afgerond",
    phase: "GO / Afgerond",
    latestMilestone: "De WBD Workspace Foundation is officieel goedgekeurd en afgesloten.",
    nextValidatedStep: "Geen uitbreiding; alleen regressieherstel wanneer dat noodzakelijk blijkt.",
    blockers: "Geen.",
  },
  {
    id: "002",
    title: "WBD Infrastructure Foundation",
    roadmapState: "Hierna",
    attentionState: "Wacht op bevestiging",
    phase: "Volgende uitvoeringsfase na Experience Polish",
    latestMilestone: "De Atlas Workspace Sync is met GO / Afgerond afgesloten; Project 002 is nog niet inhoudelijk gestart.",
    nextValidatedStep: "Na GO op Experience Polish een afzonderlijke Codex-chat openen en Project 002 opnieuw afbakenen.",
    blockers: "Bewust uitgesteld totdat Experience Polish is afgerond en goedgekeurd.",
  },
] as const;

export const currentWorkstream = {
  id: "experience-polish",
  title: "Experience Polish",
  attentionState: "Verdient vandaag aandacht",
  phase: "Actieve werkstroom",
  summary: "De bestaande Experience behouden en verfijnen op visuele kwaliteit, inhoud en de gevalideerde WBD-werkelijkheid.",
  nextStep: "De Experience Polish als afzonderlijke, begrensde werkstroom openen; deze sync voert nog geen polish uit.",
  boundaries: "Geen herontwerp vanaf nul en geen inhoudelijke start van Project 002.",
} as const;

export const firstDevelopmentPartner = {
  id: "sportpaleis",
  name: "Sport 2000 Sportpaleis B.V.",
  role: "Eerste officiële ontwikkelpartner",
  collaboration: "Ontwikkeling en praktijkvalidatie",
  practiceContext: "Sportpaleis Workspace en bedrukkingsmodule",
  status: "Actief",
  meaning: "Eerste organisatie die de toekomstige Workspace in de praktijk gaat gebruiken.",
  relationship: "Ontwikkelpartner, geen eigenaar van de WBD- of Atlas-fundering.",
} as const;

export const developmentHistory = [
  { order: "01", moment: "Eerdere fase", title: "WBD-website live", meaning: "De publieke basis van We Build And Design is bereikbaar." },
  { order: "02", moment: "Eerdere fase", title: "Eerste officiële ontwikkelpartner", meaning: "Sport 2000 Sportpaleis B.V. brengt echte praktijkvalidatie in de ontwikkeling." },
  { order: "03", moment: "Eerdere fase", title: "Start bedrukkingsmodule", meaning: "De samenwerking krijgt een concrete actieve werkstroom." },
  { order: "04", moment: "5 augustus 2026", title: "Project 001A afgerond", meaning: "De WBD Factuur Foundation heeft de status GO / Afgerond." },
  { order: "05", moment: "4 augustus 2026", title: "Factuur F00248 definitief", meaning: "De eerste officiële factuur staat vergrendeld onder Verzonden." },
  { order: "06", moment: "5 augustus 2026", title: "Project 001B afgerond", meaning: "De WBD Workspace Foundation heeft de status GO / Afgerond." },
  { order: "07", moment: "5 augustus 2026", title: "Atlas Workspace Sync afgerond", meaning: "De synchronisatie heeft de status GO / Afgerond gekregen." },
  { order: "08", moment: "Actief", title: "Experience Polish", meaning: "De bestaande Experience wordt de volgende afzonderlijke werkstroom; Project 002 blijft hierna." },
] as const;

export const horizonItems = [
  "Knab- en bankkoppeling",
  "Automatische betaalherkenning",
  "Factuurexport voor de boekhouder per maand, kwartaal of jaar",
  "E-mailen van een exportpakket naar de boekhouder",
  "Verdere financiële automatisering",
  "Dossier Experience",
] as const;

export const workspaceInsights = [
  "De WBD Workspace is de centrale interne werkplek van We Build And Design.",
  "De factuurworkflow is de eerste praktisch gebruikte Workspace-module.",
  "Modules zijn de werkvorm; connectoren verbinden de Workspace met externe systemen.",
  "WBD wil modules later afzonderlijk commercieel kunnen aanbieden.",
  "Ontwikkelpartnerprijzen zijn niet automatisch marktprijzen; een toekomstig Value & Pricing Framework blijft nodig.",
] as const;

export const infrastructureItems = [
  { label: "Workspace", status: "Lokaal actief", tone: "active" },
  { label: "Online omgeving", status: "Nog niet live", tone: "waiting" },
  { label: "Toekomstige hosting", status: "TransIP", tone: "planned" },
  { label: "Servermonitoring", status: "Binnen Project 002 te beoordelen", tone: "planned" },
  { label: "Zakelijke e-mailintegratie", status: "Binnen Project 002 te beoordelen", tone: "planned" },
  { label: "Inkomende TransIP-informatie en facturen", status: "Binnen Project 002 te beoordelen", tone: "planned" },
  { label: "Back-ups, SSL en domeinen", status: "Te valideren tijdens Project 002", tone: "waiting" },
] as const;
