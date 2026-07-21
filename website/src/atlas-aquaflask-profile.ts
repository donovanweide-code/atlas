export const aquaFlaskProfile = {
  relationshipSummary: "AquaFlask werkt met een bestaande WordPress- en WooCommerce-omgeving. Atlas kent productdata die in de onderzochte snapshot structureel consistent oogt, naast een geschiedenis waarin updates extra zorg vragen.",
  source: "Database-export van 18 juli 2026 en uitgevoerd productonderzoek",
  currentCase: {
    label: "Actuele productcase",
    title: "Productpublicatie werkt in de eenvoudige test. De oorspronkelijke fout blijft open.",
    summary: "De productmelding is onderzocht en een eenvoudig testproduct kon worden gepubliceerd. Omdat de oorspronkelijke fout niet opnieuw optrad, is de oorzaak nog niet vastgesteld.",
  },
  durableKnowledge: [
    "De omgeving gebruikt WordPress en WooCommerce.",
    "De onderzochte snapshot bevat 190 producten en structureel consistente productdata.",
    "Media- en lookupdata ogen in de snapshot consistent.",
    "Updates zijn bewust uitgesteld na eerdere problemen.",
    "Wijzigingen vereisen daarom een testplan en een herstelbare route.",
    "De databasebron is een momentopname en geen actuele live waarheid.",
  ],
  unknowns: [
    "De exacte oorspronkelijke foutmelding.",
    "Tijdstip en gebruiker of rol tijdens het incident.",
    "Of het probleem alleen bij variabele of uitgebreidere producten speelt.",
    "De volledige merkidentiteit, definitieve kleuren en tone of voice.",
    "De precieze doelgroep.",
  ],
  risks: [
    {
      title: "Onderhoudsruis vraagt controle, geen snelle conclusie.",
      meaning: "De snapshot bevat 1.680 mislukte Action Scheduler-acties, grotendeels uit één image-cleanuphook. Dit verdient apart onderhoudsonderzoek, maar verklaart de klantmelding nog niet.",
    },
    {
      title: "Een wijziging moet herstelbaar zijn.",
      meaning: "Door eerdere problemen bij updates is het wijzigingsrisico verhoogd. Compatibiliteit, testvolgorde en herstel moeten vooraf helder zijn.",
    },
  ],
  opportunities: [
    "Gecontroleerd onderhoud en opschoning.",
    "Compatibiliteitscontrole vóór updates.",
    "Een compact incidentformat voor toekomstige meldingen.",
    "Stabiliteitsverbetering op basis van reproduceerbare signalen.",
  ],
  recommendation: {
    title: "Wacht op een concrete herhaling.",
    summary: "Leg bij herhaling direct de context vast. Daarmee verandert een losse melding in bewijs waarmee Atlas veilig kan handelen.",
    capture: ["tijdstip", "account of rol", "producttype", "gevolgde stappen", "volledige foutmelding"],
  },
} as const;
