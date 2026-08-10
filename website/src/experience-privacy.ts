export function renderExperiencePrivacy(app: HTMLDivElement): void {
  document.documentElement.className = "experience-mode";
  document.documentElement.lang = "nl";
  document.title = "Jouw woorden en privacy — We Build And Design";
  app.innerHTML = `<main class="experience-workspace">
    <header class="experience-brand" aria-label="We Build And Design"><span class="experience-brand__mark" aria-hidden="true"><span>W</span><i></i><span>BD</span></span><span class="experience-brand__name">We Build And Design</span></header>
    <article class="experience-privacy" aria-labelledby="privacy-title">
      <p class="experience-kicker">Jouw woorden</p>
      <h1 id="privacy-title">Een korte en eerlijke uitleg.</h1>
      <section><h2>Wat we bewaren</h2><p>We bewaren alleen de antwoorden die je bewust instuurt, het moment dat je zelf kiest om mee te nemen en feedback die je vrijwillig deelt. Tekst die je nog aan het schrijven bent, wordt niet centraal opgeslagen.</p></section>
      <section><h2>Waarom we dat doen</h2><p>Je antwoorden horen bij jouw persoonlijke ervaring. We gebruiken wat je bewust deelt ook om te leren waar deze ervaring natuurlijk voelt en waar zij beter moet aansluiten.</p></section>
      <section><h2>Wat we niet doen</h2><p>We verkopen je gegevens niet, gebruiken geen advertentietrackers en benaderen je niet commercieel zonder een afzonderlijke, vrijwillige keuze. We maken geen heimelijk gedragsprofiel.</p></section>
      <section><h2>Wie kan dit zien</h2><p>Alleen jij via jouw beveiligde Experience-toegang en We Build And Design in het afgeschermde Observatory voor intern onderzoek, menselijke review en historische Experience-continuïteit. Andere deelnemers kunnen jouw sessie niet openen.</p></section>
      <section><h2>Verwijderen</h2><p>Je kunt vanuit de Experience je volledige sessie verwijderen. Daarmee verdwijnen de antwoorden, je gekozen moment en vrijwillige feedback en wordt de bijbehorende toegang ingetrokken.</p></section>
      <a class="experience-button" href="/e/">Terug naar mijn ervaring</a>
    </article>
  </main>`;
}
