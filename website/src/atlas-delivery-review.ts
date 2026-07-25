export type DeliveryEvidenceStrength = "live-verified" | "source-supported" | "unverified";

export interface DeliveryEvidenceItem {
  title: string;
  finding: string;
  boundary: string;
  strength: DeliveryEvidenceStrength;
}

export interface DeliverySource {
  label: string;
  location: string;
  kind: "live" | "local";
}

export interface DeliveryScopeItem {
  title: string;
  originallyRequested: string;
  liveFinding: string;
  open: string;
  acceptanceEvidence: string;
  strength: DeliveryEvidenceStrength;
}

export interface DeliveryReview {
  subject: string;
  reviewedAt: string;
  status: "progress-update-ready";
  formalCompletion: string;
  scopeSource: {
    status: "confirmed";
    date: string;
    subject: string;
    finding: string;
    sourcePath: string;
    boundary: string;
  };
  scopeItems: readonly DeliveryScopeItem[];
  realized: readonly DeliveryEvidenceItem[];
  openItems: readonly string[];
  blockers: readonly string[];
  uncertainties: readonly string[];
  feedback: {
    timing: string;
    scope: string;
    message: string;
    completionDate: string;
  };
  sources: readonly DeliverySource[];
}

const noAcceptance = "Niet aanwezig in deze e-mail of in de gecontroleerde live werkelijkheid.";

export const bijCeesDeliveryReview = {
  subject: "Bij Cees",
  reviewedAt: "2026-07-25",
  status: "progress-update-ready",
  formalCompletion:
    "De scope is nu per genoemd onderdeel herleidbaar. Geen onderdeel kan op basis van deze bron echter als formeel geaccepteerd af worden aangemerkt.",
  scopeSource: {
    status: "confirmed",
    date: "2026-01-29T12:23:46+01:00",
    subject: "Menubalk + teksten bijcees website",
    finding:
      "De e-mail legt de aangeleverde SEO-teksten en menustructuur vast, plus verzoeken over Woonstore, kleuren en Klarna. Verzendkosten bleven in de bron bewust onbeslist.",
    sourcePath: "docs/atlas/sources/bij-cees/EMAIL-SCOPE-2026-01-29.md",
    boundary:
      "De bron bewijst oorspronkelijke scope, geen latere acceptatie. De inhoud van de genoemde SEO-bijlage is niet meegeleverd en wordt niet gereconstrueerd.",
  },
  scopeItems: [
    {
      title: "SEO-teksten",
      originallyRequested:
        "De e-mail levert SEO-teksten per categorie en subcategorie aan via de bijlage ‘SEO teksten BijCees webshop.docx’.",
      liveFinding:
        "De homepage bevat inhoudelijke SEO-tekst. In de gecontroleerde subcategorie Pannen was geen zichtbare categorie-intro of afsluitende SEO-tekst aanwezig.",
      open:
        "De inhoud van de bijlage ontbreekt. Daardoor kan niet worden vastgesteld welke teksten op welke categorie- en subcategoriepagina horen of volledig live staan.",
      acceptanceEvidence: noAcceptance,
      strength: "unverified",
    },
    {
      title: "Menubalk",
      originallyRequested:
        "Vijf hoofdgroepen met de categorieën en subcategorieën uit de meegestuurde menubalk: Keuken, Tafelen, Woonstyling, Drinkflessen en Merken.",
      liveFinding:
        "De vijf hoofdgroepen staan live. Woonstyling en Merken volgen de bron; Keuken heeft extra ‘Overige’, Tafelen gebruikt ‘Serveerplanken’ en extra ‘Tafel accessoires’, en Drinkflessen heeft extra ‘Tumbler’.",
      open:
        "Bevestigen of de live aanvullingen en het gewijzigde label ‘Serveerplanken’ bewuste, geaccepteerde afwijkingen van de bron zijn.",
      acceptanceEvidence: noAcceptance,
      strength: "source-supported",
    },
    {
      title: "Woonstore verwijderen",
      originallyRequested: "‘Woonstore’ verwijderen bij de verkooppunten.",
      liveFinding:
        "Op de live pagina Onze verkooppunten is ‘Woonstore’ niet zichtbaar; de pagina noemt Depot 7 en vijf Loods 5-vestigingen.",
      open: "Geen technische afwijking aangetroffen; alleen menselijke acceptatie ontbreekt.",
      acceptanceEvidence: noAcceptance,
      strength: "live-verified",
    },
    {
      title: "Layoutkleuren",
      originallyRequested: "Zwart en kraft met kleurcode #D5B59C als richting voor de layout.",
      liveFinding:
        "De live stylesheet gebruikt #D5B59C voor onder meer de footer en productranden en zwart voor footerlinks.",
      open:
        "De bron bevat geen schermspecifiek ontwerp of acceptatiecriterium waarmee de volledige layout kan worden afgetekend.",
      acceptanceEvidence: noAcceptance,
      strength: "live-verified",
    },
    {
      title: "Verzendkosten",
      originallyRequested:
        "Geen definitieve wijziging: Cees en Isa schreven dat zij nog over de verzendkosten nadachten.",
      liveFinding:
        "De live webshop communiceert gratis verzending vanaf €49,95 en een levertijd van 1–3 werkdagen.",
      open: "Een definitief klantbesluit of gewenst tarief na deze e-mail is niet aangetroffen.",
      acceptanceEvidence: noAcceptance,
      strength: "source-supported",
    },
    {
      title: "Klarna bij Bij Cees",
      originallyRequested: "Klarna toevoegen aan het betaalsysteem van Bij Cees.",
      liveFinding: "Klarna staat live als geselecteerde betaalmethode in de checkout van Bij Cees.",
      open:
        "De betaal- en orderketen na ‘Plaats bestelling’ is niet uitgevoerd; menselijke acceptatie ontbreekt.",
      acceptanceEvidence: noAcceptance,
      strength: "live-verified",
    },
    {
      title: "Klarna bij AquaFlask",
      originallyRequested: "Klarna ook toevoegen aan het betaalsysteem van AquaFlask.",
      liveFinding:
        "In de live AquaFlask-checkout werden iDEAL, kaart, overboeking en Bancontact aangeboden; Klarna was niet zichtbaar.",
      open: "Klarna bij AquaFlask staat op basis van de actuele live controle nog open.",
      acceptanceEvidence: noAcceptance,
      strength: "unverified",
    },
  ],
  realized: [
    {
      title: "Banners",
      finding:
        "Nieuwe Gusta-, Puhlmann-, Cabanaz- en AquaFlask-banners zijn live; voor Gusta is ook een mobiele variant aangetroffen.",
      boundary:
        "De nieuwe scopebron noemt banners niet. Live zichtbaarheid bewijst daarom geen scope of menselijke acceptatie voor dit onderdeel.",
      strength: "live-verified",
    },
    {
      title: "Menu en categorieën",
      finding:
        "De vijf gevraagde hoofdgroepen staan live; meerdere subcategorieën volgen de bron en enkele labels of aanvullingen wijken aantoonbaar af.",
      boundary:
        "De live afwijkingen zijn niet als geaccepteerde wijziging vastgelegd.",
      strength: "source-supported",
    },
    {
      title: "Productpagina",
      finding:
        "Een representatieve Cabanaz-productpagina toont prijs, acht afbeeldingen, zeven kleurvarianten, productinformatie en een werkende winkelwagenhandeling.",
      boundary:
        "De nieuwe scopebron noemt productpagina-aanpassingen niet; één steekproef bewijst bovendien geen volledige dekking.",
      strength: "live-verified",
    },
    {
      title: "Winkelwagen en Klarna",
      finding:
        "Bij Cees doorliep een product de winkelwagen tot checkout en werd Klarna aangeboden. Bij AquaFlask was Klarna in de gecontroleerde checkout niet zichtbaar.",
      boundary:
        "Er is geen bestelling geplaatst of betaling uitgevoerd; de keten na checkout blijft onbewezen.",
      strength: "source-supported",
    },
    {
      title: "Filters",
      finding:
        "Categorie-, sorteer-, productaantal- en prijsfiltering zijn live zichtbaar.",
      boundary:
        "Filters worden in de nieuwe scopebron niet genoemd. De herkomst en het acceptatiecriterium van de eerder genoemde filterverbetering blijven dus onbewezen.",
      strength: "live-verified",
    },
  ],
  openItems: [
    "Verkrijg de inhoud van de oorspronkelijke SEO-bijlage en vergelijk die per categorie en subcategorie met de live webshop.",
    "Laat Cees en Isa de live menuaanvullingen en het label ‘Serveerplanken’ bevestigen of corrigeren.",
    "Verkrijg het definitieve besluit over verzendkosten dat na de e-mail van 29 januari 2026 is genomen.",
    "Voeg of herstel Klarna bij AquaFlask en controleer daarna opnieuw de checkout.",
    "Leg menselijke acceptatie per scopeonderdeel vast.",
    "Valideer checkout, betaling, orderbevestiging en verzending via een veilige end-to-end route.",
  ],
  blockers: [
    "De inhoud van de SEO-bijlage is niet beschikbaar voor vergelijking.",
    "Klarna is bij AquaFlask niet live aangetroffen.",
    "De menuafwijkingen en het definitieve verzendkostenbesluit zijn niet door de opdrachtgever bevestigd.",
    "De volledige orderketen na checkout is niet veilig bewezen.",
    "Menselijke acceptatie van Cees of Isa op de actuele uitkomst is niet vastgelegd.",
  ],
  uncertainties: [
    "Of de live menuafwijkingen bewuste verbeteringen of onbedoelde afwijkingen zijn.",
    "Welke aangeleverde SEO-tekst op iedere categorie en subcategorie hoort.",
    "Welk verzendkostenbesluit na 29 januari 2026 is genomen.",
    "Waarom Klarna bij AquaFlask niet zichtbaar is en of het eerder wel actief is geweest.",
    "Welke onderdelen Cees en Isa zelf nog als onaf ervaren.",
  ],
  feedback: {
    timing: "Nu",
    scope: "Betrouwbare voortgangsupdate — geen opleverbevestiging",
    message:
      "De oorspronkelijke scope is nu grotendeels herleidbaar. Woonstore is verwijderd, de gevraagde kleuren zijn toegepast en Klarna staat bij Bij Cees live. Voor afronding moeten de SEO-teksten worden vergeleken, menuafwijkingen en verzendkosten worden bevestigd, Klarna bij AquaFlask worden hersteld en acceptatie worden vastgelegd.",
    completionDate:
      "Nog niet verantwoord te noemen; eerst moeten de ontbrekende SEO-bron, AquaFlask-Klarna, menuafwijkingen, verzendkosten en acceptatie worden opgelost of bevestigd.",
  },
  sources: [
    {
      label: "E-mail en menubalk — eerste scopebron",
      location: "docs/atlas/sources/bij-cees/EMAIL-SCOPE-2026-01-29.md",
      kind: "local",
    },
    { label: "Live homepage", location: "https://www.bijcees.nl/", kind: "live" },
    {
      label: "Live subcategorie Pannen",
      location: "https://www.bijcees.nl/product-categorie/keuken/pannen/",
      kind: "live",
    },
    {
      label: "Live verkooppunten",
      location: "https://www.bijcees.nl/onze-verkooppunten/",
      kind: "live",
    },
    { label: "Live Bij Cees-checkout", location: "https://www.bijcees.nl/afrekenen/", kind: "live" },
    { label: "Live AquaFlask-checkout", location: "https://aquaflask.nl/afrekenpagina/", kind: "live" },
    {
      label: "Volledige praktijkreview",
      location: "docs/atlas/PRAKTIJKREVIEW-BIJ-CEES-LEVERING-2026-07-25.md",
      kind: "local",
    },
  ],
} as const satisfies DeliveryReview;

export function deliveryEvidenceLabel(strength: DeliveryEvidenceStrength): string {
  switch (strength) {
    case "live-verified":
      return "Live bevestigd";
    case "source-supported":
      return "Deels bevestigd";
    case "unverified":
      return "Nog open";
  }
}
