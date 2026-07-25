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

export interface DeliveryReview {
  subject: string;
  reviewedAt: string;
  status: "progress-update-ready";
  formalCompletion: string;
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

export const bijCeesDeliveryReview = {
  subject: "Bij Cees",
  reviewedAt: "2026-07-25",
  status: "progress-update-ready",
  formalCompletion:
    "Geen afzonderlijk werkitem kan op basis van de beschikbare bronnen formeel als geaccepteerd af worden aangemerkt.",
  realized: [
    {
      title: "Banners",
      finding:
        "Nieuwe Gusta-, Puhlmann-, Cabanaz- en AquaFlask-banners zijn live; voor Gusta is ook een mobiele variant aangetroffen.",
      boundary:
        "Live zichtbaarheid bewijst nog geen menselijke acceptatie of volledige viewportcontrole.",
      strength: "live-verified",
    },
    {
      title: "Menu en categorieën",
      finding:
        "Het hoofdmenu toont Keuken, Tafelen, Woonstyling, Drinkflessen en Merken met onderliggende categorieën; de mobiele structuur is eveneens aanwezig.",
      boundary:
        "De oorspronkelijke gewenste indeling en volledige linkdekking ontbreken als acceptatiebron.",
      strength: "live-verified",
    },
    {
      title: "Productpagina",
      finding:
        "Een representatieve Cabanaz-productpagina toont prijs, acht afbeeldingen, zeven kleurvarianten, productinformatie en een werkende winkelwagenhandeling.",
      boundary:
        "Eén steekproef bewijst niet dat iedere productpagina volledig of consistent is.",
      strength: "live-verified",
    },
    {
      title: "Winkelwagen en Klarna",
      finding:
        "Een product doorliep de winkelwagen tot aan checkout; Klarna, iDEAL/Wero, kaart, Bancontact en PayPal werden aangeboden.",
      boundary:
        "Er is geen bestelling geplaatst of betaling uitgevoerd; de keten na checkout blijft onbewezen.",
      strength: "live-verified",
    },
    {
      title: "Filters",
      finding:
        "Categorie-, sorteer-, productaantal- en prijsfiltering zijn live zichtbaar.",
      boundary:
        "De bedoelde filterverbetering en aanvullende attribuutfilters konden niet uit de beschikbare scope worden bevestigd.",
      strength: "source-supported",
    },
  ],
  openItems: [
    "Vind de oorspronkelijke klantvraag of een andere herleidbare scopebron.",
    "Bepaal per genoemd werkitem welk acceptatiecriterium bij af hoort.",
    "Maak de bedoelde filterverbetering expliciet en toets die gericht.",
    "Controleer de dekking van categorieën, productpagina's en menuverbindingen breder.",
    "Valideer checkout, betaling, orderbevestiging en verzending via een veilige end-to-end route.",
    "Verbind Donovans eerder ervaren fricties aan concrete pagina's, handelingen en bronnen.",
  ],
  blockers: [
    "Scope en acceptatie zijn niet per werkitem herleidbaar.",
    "De filterbedoeling en het bijbehorende acceptatiecriterium zijn onbekend.",
    "De volledige orderketen na checkout is niet veilig bewezen.",
    "Menselijke acceptatie van Cees op de actuele uitkomst is niet vastgelegd.",
  ],
  uncertainties: [
    "Wat Cees oorspronkelijk precies vroeg.",
    "Welke fricties Donovan tijdens de eerdere controle zag.",
    "Welke filterwerking aantoonbaar moest verbeteren.",
    "Of de opdracht technisch live, inhoudelijk geaccepteerd of end-to-end bewezen moest zijn.",
    "Welke onderdelen Cees zelf nog als onaf ervaart.",
  ],
  feedback: {
    timing: "Nu",
    scope: "Betrouwbare voortgangsupdate — geen opleverbevestiging",
    message:
      "De belangrijkste wijzigingen zijn aantoonbaar live. Oplevering blijft open totdat acceptatie per onderdeel, de bedoelde filterverbetering en de volledige orderketen zijn gecontroleerd.",
    completionDate:
      "Nog niet verantwoord te noemen; eerst moeten scope, filtercriterium en veilige end-to-end validatie bekend zijn.",
  },
  sources: [
    { label: "Live homepage", location: "https://www.bijcees.nl/", kind: "live" },
    {
      label: "Live categorie",
      location: "https://www.bijcees.nl/product-categorie/koken-en-tafelen/",
      kind: "live",
    },
    {
      label: "Live productsteekproef",
      location: "https://www.bijcees.nl/product/cabanaz-tea-coffee-pot-theepot/",
      kind: "live",
    },
    { label: "Live winkelwagen en checkout", location: "https://www.bijcees.nl/afrekenen/", kind: "live" },
    { label: "Lokale implementatie-assets", location: "Desktop/Bijcees", kind: "local" },
    {
      label: "WordPress/WooCommerce-dump",
      location: "Desktop/Bijcees/tb-nl01-linweb532_srv_teamblue-ops_net.sql · 18 juli 2026 20:18",
      kind: "local",
    },
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
      return "Bronondersteund";
    case "unverified":
      return "Nog niet bevestigd";
  }
}
