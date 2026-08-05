export const atlasDailyBrief = {
  reviewedAt: "2026-08-05",
  status: "completed",
  statusLabel: "GO / AFGEROND · Workspace Sync",
  title: "Experience Polish verdient nu aandacht.",
  subtitle: "De Workspace Sync is afgerond; Project 002 blijft bewust de fase hierna.",
  summary:
    "Atlas en de WBD Workspace vertellen weer hetzelfde verhaal. De bestaande Experience wordt de volgende begrensde werkstroom en blijft het vertrekpunt voor verdere verfijning.",
  why: [
    "Project 001A · WBD Factuur Foundation is GO / Afgerond; F00248 is de eerste definitieve WBD-factuur.",
    "Project 001B · WBD Workspace Foundation is GO / Afgerond.",
    "Sport 2000 Sportpaleis B.V. is de eerste officiële ontwikkelpartner.",
    "De factuurworkflow is de eerste praktisch gebruikte module; connectoren blijven verbindingen met externe systemen.",
    "Ontwikkelpartnerprijzen zijn geen marktprijzen; een Value & Pricing Framework blijft toekomstig werk.",
  ],
  evidenceSource: "Atlas Workspace Sync · GO / Afgerond · 2026-08-05",
  externalDependency: "Geen",
  returnTrigger:
    "Open Experience Polish als afzonderlijke werkstroom; Project 002 keert pas terug na afronding en goedkeuring daarvan.",
  focus: {
    title: "Open Experience Polish als volgende werkstroom.",
    summary:
      "Behoud de bestaande Experience en verfijn alleen visuele kwaliteit, inhoud en aansluiting op de gevalideerde WBD-werkelijkheid.",
    nextStep: "Start de polish in een afzonderlijk afgebakende opdracht; deze afronding voert nog geen Experience-wijzigingen uit.",
    actionLabel: "Bekijk de afgeronde synchronisatie",
    actionHref: "#werkelijkheid",
    explanation: [
      "De WBD Workspace is inmiddels de centrale interne werkplek.",
      "001A en 001B zijn afgesloten en mogen alleen nog noodzakelijk regressieherstel krijgen.",
      "Experience Polish is nu de actieve werkstroom; Project 002 blijft bewust hierna.",
    ],
  },
  silence: [
    {
      title: "Nog geen Project 002",
      why: "TransIP, SMTP, IMAP, connectors en monitoring starten pas na GO op Experience Polish en een nieuwe afzonderlijke chat.",
    },
    {
      title: "Geen nieuwe Finance-functionaliteit",
      why: "Bankkoppeling, betaalherkenning, boekhouderexport en verdere automatisering blijven Horizon.",
    },
    {
      title: "Geen commercieel prijsbesluit",
      why: "Ontwikkelpartnerprijzen worden niet als marktprijzen gebruikt; het Value & Pricing Framework bestaat nog niet.",
    },
  ],
  horizon: [
    {
      title: "Bij Cees als praktijkbron",
      summary:
        "Een echte situatie waarin Atlas kan leren van observatie, keuzes en aantoonbaar resultaat.",
      trigger: "Zodra er nieuw, herleidbaar praktijkbewijs beschikbaar is.",
    },
    {
      title: "Atlas Experience Preview",
      summary:
        "Een toekomstige eerste ervaring met de methode — niet als marketingdemo, maar als praktijktoepassing.",
      trigger:
        "Pas nadat de publieke Experience representatief is en praktijkgebruik de volgende vraag rechtvaardigt.",
    },
    {
      title: "Workspace 003",
      summary:
        "Geen vooraf bedachte featurelijst, maar een volgende evolutie vanuit daadwerkelijk dagelijks gebruik.",
      trigger:
        "Wanneer terugkerende gebruiksobservaties aantonen wat structureel ontbreekt.",
    },
    {
      title: "Financiële automatisering",
      summary:
        "Knab, betaalherkenning, boekhouderexport en verdere financiële automatisering blijven buiten de actieve werkstroom.",
      trigger: "Pas na afzonderlijke prioritering en een gevalideerde praktische noodzaak.",
    },
    {
      title: "Dossier Experience",
      summary: "Een toekomstige Experience-richting die niet door Project 002 wordt geactiveerd.",
      trigger: "Pas na een afzonderlijke opdracht en inhoudelijke beoordeling.",
    },
  ],
  changedSinceLast:
    "De Workspace Sync is GO / Afgerond; Experience Polish is actief en Project 002 blijft hierna.",
} as const;
