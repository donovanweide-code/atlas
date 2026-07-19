import "./styles/main.css";
import heroImage from "./assets/images/hero.webp";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="page">
    <header class="site-header">
      <a class="brand" href="#">
        <span class="brand__mark">WBD.</span>
        <span class="brand__name">We Build and Design</span>
      </a>

      <nav class="site-nav" aria-label="Hoofdnavigatie">
        <a href="#">Diensten</a>
        <a href="#">Werkwijze</a>
        <a href="#">Projecten</a>
        <a href="#">Over ons</a>
      </nav>

      <a class="button button--primary site-header__cta" href="#">
        Plan een kennismaking
      </a>
    </header>

    <section class="hero">
      <div class="hero__content hero__content--animate">
        <p class="hero__eyebrow">Strategie. Design. Technologie.</p>

        <h1 class="hero__title">
          Wij bouwen digitale fundamenten voor ondernemers met visie.
        </h1>

        <p class="hero__text">
          We combineren strategie, design en technologie om digitale oplossingen
          te bouwen die jouw bedrijf laten groeien.
        </p>

       <div class="hero__actions">
  <a class="button button--primary" href="#">
    Plan een kennismaking
  </a>

  <a class="button button--secondary" href="#">
    Bekijk projecten
  </a>
</div>
<div class="scroll-indicator" aria-hidden="true">
  <span class="scroll-indicator__arrow">↓</span>
  <span>Scroll verder</span>
</div>
      </div>
<div class="hero__visual hero__visual--animate">
  <img
    class="hero__image"
    src="${heroImage}"
    alt="Ondernemer die werkt aan de volgende digitale stap"
  />
</div>
   
    </section>
    <section class="why">
  <div class="why__intro">
    <p class="section-label">Waarom WBD</p>

    <h2 class="why__title">
      Geen losse website. Een digitaal fundament dat met je bedrijf meegroeit.
    </h2>
  </div>

  <div class="why__grid">
    <article class="why-card">
      <span class="why-card__number">01</span>
      <h3>Strategie vóór design</h3>
      <p>
        We beginnen niet bij kleuren of templates, maar bij jouw doelen,
        klanten en toekomst.
      </p>
    </article>

    <article class="why-card">
      <span class="why-card__number">02</span>
      <h3>Technologie die helpt</h3>
      <p>
        Slimme oplossingen verminderen handmatig werk en maken ruimte voor
        groei, aandacht en betere keuzes.
      </p>
    </article>

    <article class="why-card">
      <span class="why-card__number">03</span>
      <h3>Blijven ontwikkelen</h3>
      <p>
        Na de lancering stopt het niet. We blijven meten, verbeteren en
        doorbouwen wanneer jouw bedrijf daar klaar voor is.
      </p>
    </article>
  </div>
</section>

<section class="vision">
  <div class="vision__content">

    <p class="vision__eyebrow">
      Onze visie
    </p>

    <h2 class="vision__title">
      Niet nóg een website.
      Een digitaal fundament.
    </h2>

    <p class="vision__text">
      Veel ondernemers zoeken een nieuwe website.
      Maar een mooie website zonder strategie levert
      zelden nieuwe klanten op.
    </p>

    <p class="vision__text">
      Daarom begint Atlas niet met design.
      Wij beginnen met begrijpen.
      Pas daarna ontwerpen en bouwen we oplossingen
      die jarenlang mee kunnen groeien.
    </p>
<div class="vision__steps">

  <article class="vision-step">
    <span class="vision-step__number">01</span>

    <h3>Analyseren</h3>

    <p>
      We beginnen niet met bouwen.
      We beginnen met begrijpen.
      Jouw bedrijf vormt altijd het vertrekpunt.
    </p>
  </article>

  <article class="vision-step">
    <span class="vision-step__number">02</span>

    <h3>Strategie</h3>

    <p>
      Vanuit de analyse bepalen we samen
      welke digitale oplossing het meeste
      rendement oplevert.
    </p>
  </article>

  <article class="vision-step">
    <span class="vision-step__number">03</span>

    <h3>Realiseren</h3>

    <p>
      Daarna ontwerpen, ontwikkelen
      en blijven we verbeteren zodat
      jouw bedrijf kan doorgroeien.
    </p>
  </article>

</div>
<div class="vision__quote">

  <h2>
    Wij verkopen geen websites.
    Wij bouwen groeiplatformen.
  </h2>

  <p>
    Iedere keuze die wij maken moet bijdragen aan één doel:
    jouw onderneming digitaal sterker maken.
    Niet vandaag, maar ook over vijf jaar.
  </p>

</div>
  </div>
</section>
<section class="challenges">

  <div class="container">

    <p class="section-eyebrow">
      Digitale uitdagingen
    </p>

    <h2 class="section-title">
      Groei begint met het herkennen
      van de juiste uitdaging.
    </h2>

    <p class="section-intro">
      Veel ondernemers lopen tegen dezelfde digitale obstakels aan.
      Niet omdat ze niet willen groeien, maar omdat de juiste
      strategie ontbreekt.
    </p>

    <div class="challenge-grid">

      <article class="challenge-card">
        <span>01</span>
        <h3>Niet zichtbaar</h3>
       <p>
Je website bestaat, maar levert nauwelijks bezoekers,
aanvragen of nieuwe klanten op.
</p>
<a class="challenge-link" href="#">
  Dat hoeft niet zo te blijven →
</a>
</a>
      </article>

      <article class="challenge-card">
        <span>02</span>
        <h3>Geen strategie</h3>
       <p>
Marketing, website en processen werken los van elkaar.
</p>
<a href="#">
Alles begint met één duidelijke richting →

</a>
      </article>

      <article class="challenge-card">
        <span>03</span>
        <h3>Tijdverlies</h3>
        <p>
Handmatig werk kost iedere week uren die je liever
aan je bedrijf besteedt.
</p>

<a class="challenge-link" href="#">
  Slimmer werken begint vandaag →
</a>
      </article>

      <article class="challenge-card">
        <span>04</span>
        <h3>Klaar voor groei</h3>
        <p>
Je onderneming groeit sneller dan je digitale fundament.
</p>

<a class="challenge-link" href="#">
  Bouw mee aan de volgende stap →
</a>
      </article>

    </div>

  </div>

</section>
<section class="connection">

  <div class="container">

    <p class="section-eyebrow">
      Misschien herken je dit
    </p>

    <h2 class="section-title">
      Je hoeft vandaag nog niet te weten
      wat de beste oplossing is.
    </h2>

    <p class="section-intro">
      De meeste ondernemers weten dat er iets moet gebeuren.
      Maar niet waar ze moeten beginnen.
      En eerlijk?
      Dat hoeft ook niet.
    </p>

    <div class="connection-message">

      <p>
        Wij beginnen niet met techniek.
      </p>

      <p>
        Wij beginnen met jouw onderneming.
      </p>

    </div>

  </div>

</section>
  </main>
`;