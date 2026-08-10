import "./styles/experience-workspace.css";
import { hasPersonalExperienceToken, shouldRedirectMissingPersonalAccess } from "./experience-entry";
import { experienceApi, ExperienceApiError } from "./experience-validation-api";
import {
  clearCheckpoint,
  experienceVersion,
  flowRecompositionVersion,
  deriveFirstInsight,
  flowPromptFor,
  loadCheckpoint,
  livingResearchLoopVersion,
  saveCheckpoint,
  selectedSummaryItem,
  stepById,
  stepsForSession,
  summaryItems,
  type InsightExplorationTopic,
  type InsightRecognition,
  type ExperienceSession,
  type ExperienceStepId,
  type ParticipantState,
} from "./experience-store";

function isLivingVersion(version: string): boolean {
  return version === experienceVersion || version === flowRecompositionVersion || version === livingResearchLoopVersion;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brand(): string {
  return `<header class="experience-brand" aria-label="We Build And Design">
    <span class="experience-brand__mark" aria-hidden="true"><span>W</span><i></i><span>BD</span></span>
    <span class="experience-brand__name">We Build And Design</span>
  </header>`;
}

function footer(session?: ExperienceSession): string {
  return `<footer class="experience-footer">
    <a href="/privacy">Hoe we met je woorden omgaan</a>
    ${session ? '<button data-action="open-feedback" type="button">Dit voelde vreemd</button>' : ""}
    ${session ? '<button data-action="open-delete" type="button">Mijn sessie verwijderen</button>' : ""}
  </footer>`;
}

function feedbackDialog(): string {
  return `<dialog class="experience-feedback" data-testid="feedback-dialog" aria-labelledby="experience-feedback-title">
    <form data-form="experience-feedback">
      <button class="experience-feedback__close" data-action="close-feedback" type="button" aria-label="Sluiten">×</button>
      <p class="experience-kicker">Help ons beter luisteren</p>
      <h2 id="experience-feedback-title">Dit voelde vreemd</h2>
      <p>Vertel alleen wat je zelf ervaarde. Een goed antwoord is belangrijker dan een aardig antwoord.</p>
      <label>Wat verwachtte je?<textarea data-testid="feedback-expected" name="expected" maxlength="1600" required></textarea></label>
      <label>Wat gebeurde er?<textarea data-testid="feedback-happened" name="happened" maxlength="1600" required></textarea></label>
      <label>Wat zou natuurlijker voelen?<textarea data-testid="feedback-natural" name="natural" maxlength="1600" required></textarea></label>
      <button class="experience-button" data-testid="submit-feedback" type="submit">Deel mijn ervaring</button>
    </form>
  </dialog>`;
}

function deleteDialog(): string {
  return `<dialog class="experience-feedback experience-delete" data-testid="delete-session-dialog" aria-labelledby="experience-delete-title">
    <form data-form="delete-session">
      <button class="experience-feedback__close" data-action="close-delete" type="button" aria-label="Sluiten">×</button>
      <p class="experience-kicker">Jouw keuze</p>
      <h2 id="experience-delete-title">Je sessie verwijderen?</h2>
      <p>Je ingestuurde antwoorden, gekozen moment en feedback worden verwijderd. De toegang op dit apparaat wordt daarna afgesloten. Dit kan niet ongedaan worden gemaakt.</p>
      <div class="experience-dialog-actions">
        <button class="experience-text-action" data-action="close-delete" type="button">Laat mijn sessie staan</button>
        <button class="experience-button experience-button--danger" data-testid="confirm-delete-session" type="submit">Ja, verwijder mijn sessie</button>
      </div>
    </form>
  </dialog>`;
}

function leaveDialog(): string {
  return `<dialog class="experience-feedback experience-leave" data-testid="leave-experience-dialog" aria-labelledby="experience-leave-title">
    <form method="dialog">
      <p class="experience-kicker">Even checken</p>
      <h2 id="experience-leave-title">Wil je dit gesprek verlaten?</h2>
      <p>Je woorden zijn bewaard. Je kunt nu verdergaan of bewust terug naar waar je vandaan kwam.</p>
      <div class="experience-dialog-actions">
        <button class="experience-button" data-action="stay-experience" type="button">Blijf in het gesprek</button>
        <button class="experience-text-action" data-action="leave-experience" type="button">Verlaat het gesprek</button>
      </div>
    </form>
  </dialog>`;
}

function frame(content: string, session?: ExperienceSession): string {
  return `<main class="experience-workspace">
    ${brand()}
    ${content}
    ${footer(session)}
    ${session ? feedbackDialog() + deleteDialog() + leaveDialog() : ""}
  </main>`;
}

function renderWelcome(): string {
  return frame(`<section class="experience-welcome" aria-labelledby="experience-welcome-title">
    <p class="experience-kicker">Welkom.</p>
    <h1 id="experience-welcome-title">Laten we beginnen bij één moment uit je werkdag.</h1>
    <p class="experience-welcome__statement">Vertel wat er gebeurde. We kijken met je mee, leggen voorzichtig mogelijke verbanden voor en laten jou bepalen welke richting iets waard is.</p>
    <div class="experience-expectation" data-testid="experience-transparency">
      <p><strong>Jij houdt de regie.</strong> Iedere gedachte is een mogelijkheid, nooit een conclusie. Je kunt altijd stoppen.</p>
      <p>Je ingestuurde antwoorden worden veilig bij deze persoonlijke Experience-toegang bewaard. We gebruiken wat je bewust deelt ook om te leren hoe deze ervaring beter bij mensen kan aansluiten. We verkopen je gegevens niet en benaderen je niet zonder jouw afzonderlijke toestemming.</p>
      <a href="/privacy">Lees de korte privacy-uitleg</a>
    </div>
    <button class="experience-button" data-testid="start-experience" type="button">Begin bij vandaag</button>
    <p class="experience-decline">Je kunt deze pagina ook sluiten zonder iets te delen.</p>
  </section>`);
}

function renderOrganicWelcome(referralId?: string): string {
  return frame(`<section class="experience-welcome experience-organic-welcome" aria-labelledby="experience-welcome-title">
    <p class="experience-kicker">Welkom.</p>
    <h1 id="experience-welcome-title">Laten we beginnen bij één moment uit je werkdag.</h1>
    <p class="experience-welcome__statement">Vertel wat er gebeurde. We kijken met je mee, leggen voorzichtig mogelijke verbanden voor en laten jou bepalen welke richting iets waard is.</p>
    <div class="experience-expectation" data-testid="experience-transparency">
      <p><strong>Jij houdt de regie.</strong> Iedere gedachte is een mogelijkheid, nooit een conclusie. Je kunt altijd stoppen.</p>
      <p>Je woorden worden veilig bij jouw eigen Experience bewaard. Dit apparaat onthoudt alleen een beveiligde toegangssleutel, zodat je later verder kunt. We gebruiken wat je bewust deelt ook om te leren hoe deze ervaring beter bij mensen kan aansluiten.</p>
      <a href="/privacy">Lees de korte privacy-uitleg</a>
    </div>
    <form class="experience-introduction" data-form="organic-participant"${referralId ? ` data-referral-id="${escapeHtml(referralId)}"` : ""}>
      <p>Hoe mogen we je noemen?</p>
      <label>Naam<input data-testid="organic-name" name="name" maxlength="120" autocomplete="name" required></label>
      <div>
        <label>Functie <span>(optioneel)</span><input data-testid="organic-role" name="role" maxlength="120" autocomplete="organization-title"></label>
        <label>Bedrijf <span>(optioneel)</span><input data-testid="organic-organization" name="organization" maxlength="160" autocomplete="organization"></label>
      </div>
      <button class="experience-button" data-testid="start-organic-experience" type="submit">Begin bij vandaag</button>
    </form>
    <p class="experience-decline">Je kunt deze pagina ook sluiten zonder iets te delen.</p>
  </section>`);
}

function renderOrganicReturn(state: ParticipantState): string {
  const name = state.participantName || "jezelf";
  return frame(`<section class="experience-welcome experience-return-choice" aria-labelledby="experience-return-title">
    <p class="experience-kicker">Fijn dat je er weer bent.</p>
    <h1 id="experience-return-title">Welkom terug, ${escapeHtml(name)}.</h1>
    <p class="experience-welcome__statement">Je woorden zijn er nog. Je kunt rustig verdergaan waar je gebleven was.</p>
    <div class="experience-return-actions">
      <button class="experience-button" data-testid="resume-organic-experience" type="button">Verder als ${escapeHtml(name)}</button>
      <button class="experience-text-action" data-action="new-organic-participant" type="button">Ik ben iemand anders</button>
    </div>
    <p class="experience-decline">Kies je voor iemand anders, dan blijft de eerdere Experience centraal gescheiden bewaard en opent dit apparaat een nieuwe.</p>
  </section>`);
}

function supportsFurtherQuestion(answer?: string): boolean {
  if (!answer) return false;
  const normalized = answer.trim().toLocaleLowerCase("nl-NL");
  return normalized.length >= 12 && !/^(weet ik (nog )?niet|geen idee|onbekend)\b/.test(normalized);
}

function renderQuestionOrigin(session: ExperienceSession): string {
  if (session.version !== livingResearchLoopVersion || session.currentStep === 0) return "";
  const previousStep = stepsForSession(session)[session.currentStep - 1];
  const previousAnswer = previousStep
    ? session.answers.find((answer) => answer.stepId === previousStep.id)?.answer
    : undefined;
  if (!previousAnswer) return "";
  return `<aside class="experience-question__origin" data-testid="question-origin">
    <p>Deze vraag komt voort uit wat je net vertelde</p>
    <blockquote>“${escapeHtml(previousAnswer)}”</blockquote>
  </aside>`;
}

function renderQuestion(session: ExperienceSession): string {
  const baseStep = stepsForSession(session)[session.currentStep];
  const step = session.version === flowRecompositionVersion && baseStep?.id === "attention"
    ? { ...baseStep, ...flowPromptFor(session) }
    : baseStep;
  if (!step) return renderSummary(session);
  const checkpoint = loadCheckpoint();
  const draft = checkpoint?.sessionId === session.id && checkpoint.draftStepId === step.id ? checkpoint.draft ?? "" : "";
  return frame(`<section class="experience-question" aria-labelledby="experience-question-title">
    <p class="experience-kicker">${session.version === flowRecompositionVersion ? (session.currentStep === 0 ? "Jouw moment" : "Een vervolgvraag") : escapeHtml(step.label)}</p>
    ${renderQuestionOrigin(session)}
    <h1 id="experience-question-title">${escapeHtml(step.question)}</h1>
    <p>${escapeHtml(step.prompt)}</p>
    ${step.examples ? `<p class="experience-question__examples">${escapeHtml(step.examples)}</p>` : ""}
    <form data-form="experience-answer" data-step-id="${escapeHtml(step.id)}">
      <label class="experience-answer-label" for="experience-answer">${session.version === flowRecompositionVersion ? "Wat zag je gebeuren?" : "Vertel in je eigen woorden"}</label>
      <textarea id="experience-answer" data-testid="experience-answer" name="answer" maxlength="1600" placeholder="Schrijf zoals je het aan iemand zou vertellen…">${escapeHtml(draft)}</textarea>
      <button class="experience-button" data-testid="continue-experience" type="submit">${escapeHtml(step.action)}</button>
      <button class="experience-text-action" data-action="skip-answer" type="button">Ik weet het nog niet</button>
      ${session.version === flowRecompositionVersion ? '<button class="experience-text-action experience-text-action--quiet" data-action="finish-without-workspace" type="button">Voor nu stoppen</button>' : ""}
    </form>
    <details class="experience-words-so-far"${session.version === flowRecompositionVersion ? ' data-disclosure="true"' : ""}>
      <summary>Mijn eerdere woorden</summary>
      ${summaryItems(session).map((item) => `<blockquote><span>${escapeHtml(item.label)}</span>${escapeHtml(item.answer)}</blockquote>`).join("") || "<p>Dit is je eerste moment.</p>"}
    </details>
  </section>`, session);
}

function firstVisitVisibleCopy(value: string | undefined, firstVisit: boolean): string {
  if (!value || !firstVisit) return value ?? "";
  return value
    .replaceAll("Atlas toetst een mogelijkheid", "Een mogelijkheid om te toetsen")
    .replaceAll("Atlas blijft onderzoeken", "We blijven onderzoeken")
    .replaceAll("Atlas", "Deze Experience");
}

function renderRuntime(session: ExperienceSession, firstVisit = false): string {
  const runtime = session.runtime;
  if (!runtime) return renderUnavailable("Het gesprek kan niet veilig worden geopend.", "De cognitieve toestand ontbreekt. Er is niets gewijzigd; probeer het later opnieuw.");
  const { decision, field } = runtime;
  const checkpoint = loadCheckpoint();
  const draft = checkpoint?.sessionId === session.id && checkpoint.draftStepId === "runtime" ? checkpoint.draft ?? "" : "";
  const priorContacts = field.realityContacts;
  return frame(`<section class="experience-question experience-runtime" aria-labelledby="experience-runtime-title" data-testid="atlas-runtime">
    <p class="experience-kicker">${escapeHtml(firstVisitVisibleCopy(decision.kicker, firstVisit))}</p>
    <h1 id="experience-runtime-title">${escapeHtml(firstVisitVisibleCopy(decision.title, firstVisit))}</h1>
    ${decision.question ? `<p class="experience-runtime__question">${escapeHtml(firstVisitVisibleCopy(decision.question, firstVisit))}</p>` : ""}
    ${decision.prompt ? `<p class="experience-question__examples">${escapeHtml(firstVisitVisibleCopy(decision.prompt, firstVisit))}</p>` : ""}
    ${decision.requiresResponse ? `<form data-form="runtime-contribution">
      <label class="experience-answer-label" for="runtime-contribution">Vertel in je eigen woorden</label>
      <textarea id="runtime-contribution" data-testid="runtime-contribution" name="content" maxlength="1600" placeholder="Schrijf zoals je het aan iemand zou vertellen…">${escapeHtml(draft)}</textarea>
      <button class="experience-button" data-testid="continue-runtime" type="submit">Neem dit mee</button>
      <button class="experience-text-action" data-action="runtime-unknown" type="button">Ik weet het nog niet</button>
      <button class="experience-text-action experience-text-action--quiet" data-action="finish-without-workspace" type="button">Voor vandaag is dit genoeg</button>
    </form>` : '<button class="experience-text-action" data-action="finish-without-workspace" type="button">Voor vandaag is dit genoeg</button>'}
    <details class="experience-words-so-far" data-disclosure="true">
      <summary>Mijn eerdere woorden</summary>
      ${priorContacts.map((contact) => `<blockquote>${escapeHtml(contact.content)}</blockquote>`).join("") || "<p>Dit is je eerste moment.</p>"}
    </details>
    <details class="experience-method-note" data-testid="runtime-trace">
      <summary>Waarom dit nu wordt gevraagd</summary>
      <p>${escapeHtml(firstVisitVisibleCopy(decision.reason, firstVisit))}</p>
    </details>
  </section>`, session);
}

function renderListening(session: ExperienceSession): string {
  const answer = session.answers[session.answers.length - 1];
  const definitions = stepsForSession(session);
  const step = answer ? stepById(answer.stepId, session.version) : definitions[Math.max(0, session.currentStep)];
  const living = isLivingVersion(session.version);
  const grounded = supportsFurtherQuestion(answer?.answer);
  const isLastLivingContribution = living && session.currentStep >= definitions.length - 1;
  const honestLanding = living && !grounded;
  const title = honestLanding
    ? "We hebben nog niet genoeg om hier zorgvuldig op voort te bouwen."
    : step.acknowledgement;
  const transition = honestLanding
    ? isLastLivingContribution
      ? "Daarom vullen we niets in en stellen we nu geen nieuwe inhoudelijke vraag. Je kunt bekijken wat er wel ligt, of het voor vandaag laten rusten."
      : "Daarom vullen we niets in en stellen we nu geen nieuwe inhoudelijke vraag. Voor vandaag mag dit genoeg zijn."
    : step.transition;
  return frame(`<section class="experience-listening" aria-labelledby="experience-listening-title" data-testid="listening-moment">
    <p class="experience-kicker">${honestLanding ? "Eerlijk luisteren" : isLastLivingContribution ? "Ruimte voor terugkijken" : "Dit nemen we mee"}</p>
    <h1 id="experience-listening-title">${escapeHtml(title)}</h1>
    ${answer ? `<blockquote>“${escapeHtml(answer.answer)}”</blockquote>` : ""}
    <p class="experience-listening__transition">${escapeHtml(transition)}</p>
    <div class="experience-landing-actions">
      ${!honestLanding || isLastLivingContribution ? `<button class="experience-button" data-testid="continue-after-listening" type="button">${isLastLivingContribution ? (grounded ? "Kijk eerst terug naar mijn woorden" : "Bekijk wat er wel ligt") : session.currentStep >= definitions.length - 1 ? "Kijk terug naar mijn woorden" : "Onderzoek dit moment verder"}</button>` : ""}
      ${living ? `<button class="${honestLanding && !isLastLivingContribution ? "experience-button" : "experience-text-action"}" data-action="finish-without-workspace" type="button">Voor vandaag is dit genoeg</button>` : ""}
    </div>
  </section>`, session);
}

function renderSummary(session: ExperienceSession): string {
  const items = summaryItems(session);
  const living = isLivingVersion(session.version);
  return frame(`<section class="experience-summary" aria-labelledby="experience-summary-title">
    <p class="experience-kicker">Jouw woorden</p>
    <h1 id="experience-summary-title">Dit heb jij vandaag onder woorden gebracht.</h1>
    <p class="experience-summary__intro">${living ? "Dit is eerst alleen wat jij vertelde en hoe jij het moment verhelderde. Controleer of je woorden nog kloppen. Pas daarna geven we voorzichtig één mogelijk verband terug." : "Dit is eerst alleen jouw verhaal: gebeurtenis, mogelijke oorzaak, gevolg en impact. Controleer of je woorden nog kloppen voordat we voorzichtig teruggeven wat daarin opvalt."}</p>
    <ol class="experience-reflection-list${living ? " experience-reflection-list--conversation" : ""}" data-testid="experience-summary">
      ${items.map((item, index) => `<li>
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div><h2>${escapeHtml(item.label)}</h2><blockquote>“${escapeHtml(item.answer)}”</blockquote><button data-action="edit-answer" data-step-id="${escapeHtml(item.stepId)}" type="button">Pas aan</button></div>
      </li>`).join("")}
    </ol>
    <button class="experience-button" data-testid="confirm-summary" type="button">${living ? "Geef voorzichtig terug wat hierin zichtbaar wordt" : "Ja, dit klopt"}</button>
    <dialog class="experience-feedback experience-edit-answer" data-testid="edit-answer-dialog" aria-labelledby="experience-edit-title">
      <form data-form="edit-answer">
        <button class="experience-feedback__close" data-action="close-edit" type="button" aria-label="Sluiten">×</button>
        <p class="experience-kicker">Jouw woorden</p>
        <h2 id="experience-edit-title">Pas dit moment aan</h2>
        <input name="stepId" type="hidden">
        <label>Zoals jij het bedoelt<textarea name="answer" maxlength="1600" required></textarea></label>
        <button class="experience-button" type="submit">Bewaar mijn woorden</button>
      </form>
    </dialog>
  </section>`, session);
}

function recognitionLabel(recognition?: InsightRecognition): string {
  return ({ yes: "Ja", partly: "Gedeeltelijk", "not-yet": "Nog niet" } as const)[recognition ?? "not-yet"];
}

function renderInsight(session: ExperienceSession): string {
  const insight = deriveFirstInsight(session);
  const flow = session.version === flowRecompositionVersion;
  const living = isLivingVersion(session.version);
  if (!insight.hasEvidence) {
    if (flow) {
      return frame(`<section class="experience-insight" aria-labelledby="experience-insight-title" data-testid="experience-insight-insufficient">
        <p class="experience-kicker">Voorzichtig verwoord</p>
        <h1 id="experience-insight-title">Ik mis nog één concreet aanknopingspunt.</h1>
        <p class="experience-insight__lead">Wil je één detail toevoegen, of is dit voor vandaag genoeg?</p>
        <div class="experience-landing-actions">
          <button class="experience-button" data-recognition="not-yet" data-followup-topic="other" type="button">Voeg één detail toe</button>
          <button class="experience-text-action" data-action="finish-without-workspace" type="button">Voor vandaag is dit genoeg</button>
        </div>
      </section>`, session);
    }
    return frame(`<section class="experience-insight" aria-labelledby="experience-insight-title" data-testid="experience-insight-insufficient">
      <p class="experience-kicker">Eerlijk teruggeven</p>
      <h1 id="experience-insight-title">${escapeHtml(insight.headline)}</h1>
      <p class="experience-insight__lead">${escapeHtml(insight.explanation)}</p>
      ${insight.evidence.length ? `<details class="experience-insight__evidence"><summary>Bekijk welke woorden er wel liggen</summary>${insight.evidence.map((item) => `<blockquote><span>${escapeHtml(item.label)}</span>“${escapeHtml(item.answer)}”</blockquote>`).join("")}</details>` : ""}
      <button class="experience-button" data-action="finish-insight" type="button">Bekijk wat er wel ligt</button>
      ${living ? '<button class="experience-text-action" data-action="finish-without-workspace" type="button">Voor vandaag stoppen</button>' : ""}
      <button class="experience-text-action" data-action="back-summary" type="button">Bekijk mijn woorden opnieuw</button>
    </section>`, session);
  }

  if (flow) {
    return frame(`<section class="experience-insight experience-insight--flow" aria-labelledby="experience-insight-title" data-testid="experience-flow-insight">
      <p class="experience-kicker">Een mogelijke samenhang</p>
      <h1 id="experience-insight-title">${escapeHtml(insight.headline)}</h1>
      <article class="experience-insight-card">
        <p>${escapeHtml(insight.explanation)}</p>
      </article>
      <details class="experience-insight__evidence">
        <summary>Waarom dit opviel</summary>
        ${insight.evidence.map((item) => `<blockquote><span>${escapeHtml(item.label)}</span>“${escapeHtml(item.answer)}”</blockquote>`).join("")}
      </details>
      <fieldset class="experience-recognition" data-testid="insight-recognition">
        <legend>Welke reactie komt het dichtst in de buurt?</legend>
        <button data-recognition="yes" type="button">Dit komt dichtbij</button>
        <button data-recognition="partly" type="button">Deels — er speelt nog iets</button>
        <button data-recognition="not-yet" data-followup-topic="other" type="button">Ik zie het anders</button>
      </fieldset>
      <button class="experience-text-action experience-text-action--quiet" data-action="finish-without-workspace" type="button">Voor vandaag is dit genoeg</button>
    </section>`, session);
  }

  return frame(`<section class="experience-insight" aria-labelledby="experience-insight-title" data-testid="experience-insight">
    <p class="experience-kicker">Een eerste spoor</p>
    <h1 id="experience-insight-title">Dit viel ons op.</h1>
    <article class="experience-insight-card">
      <h2>${escapeHtml(insight.headline)}</h2>
      <p>${escapeHtml(insight.explanation)}</p>
    </article>
    <details class="experience-insight__evidence">
      <summary>Welke uitspraken brachten ons hierbij?</summary>
      ${insight.evidence.map((item) => `<blockquote><span>${escapeHtml(item.label)}</span>“${escapeHtml(item.answer)}”</blockquote>`).join("")}
    </details>
    <fieldset class="experience-recognition" data-testid="insight-recognition">
      <legend>${living ? "Hoe kijk jij hiernaar?" : "Herken je dit?"}</legend>
      <button data-recognition="yes" type="button">Herken ik</button>
      <button data-recognition="partly" type="button">Gedeeltelijk</button>
      <button data-recognition="not-yet" type="button">Nog niet</button>
      ${living ? '<button data-recognition="not-yet" data-followup-topic="other" type="button">Ik zie het anders</button>' : ""}
    </fieldset>
    <p class="experience-method-note"><strong>Zo werkt We Build And Design.</strong> We proberen eerst de organisatie en de keten eromheen te begrijpen. Pas daarna onderzoeken we welke digitale oplossing werkelijk past.</p>
    <button class="experience-text-action" data-action="back-summary" type="button">Bekijk mijn woorden opnieuw</button>
  </section>`, session);
}

const explorationChoices: Array<{ topic: InsightExplorationTopic; label: string }> = [
  { topic: "why", label: "Waarom viel dit op?" },
  { topic: "evidence", label: "Welke uitspraken brachten jullie hierbij?" },
  { topic: "customers", label: "Wat kan dit betekenen voor klanten of leveranciers?" },
  { topic: "colleagues", label: "Wat kan dit betekenen voor collega’s?" },
  { topic: "begin", label: "Waar zou dit kunnen beginnen?" },
  { topic: "other", label: "Ik wil een ander onderwerp onderzoeken" },
];

function explorationChoicesFor(session: ExperienceSession): Array<{ topic: InsightExplorationTopic; label: string }> {
  if (!isLivingVersion(session.version)) return explorationChoices;
  if (session.version === flowRecompositionVersion) {
    if (session.insightRecognition === "not-yet") {
      return [
        { topic: "other", label: "Wat missen we nog?" },
        { topic: "evidence", label: "Bekijk waarom dit opviel" },
      ];
    }
    const signal = flowPromptFor(session).signal;
    const primary = signal === "information"
      ? { topic: "begin" as const, label: "Onderzoek de informatie of systemen" }
      : signal === "handoff"
        ? { topic: "colleagues" as const, label: "Onderzoek de overdracht tussen mensen" }
        : signal === "customer"
          ? { topic: "customers" as const, label: "Onderzoek wat de klant merkte" }
          : { topic: "begin" as const, label: "Onderzoek waar dit begon" };
    const firstChoices: Array<{ topic: InsightExplorationTopic; label: string }> = [
      primary,
      { topic: "why", label: "Waarom viel dit op?" },
      { topic: "other", label: "Een andere verklaring onderzoeken" },
    ];
    if (!(session.reflections ?? []).some((reflection) => reflection.response)) return firstChoices;
    return [
      ...firstChoices,
      ...(primary.topic !== "customers" ? [{ topic: "customers" as const, label: "Wat merkte de klant of leverancier?" }] : []),
      ...(primary.topic !== "colleagues" ? [{ topic: "colleagues" as const, label: "Wat vroeg dit van andere mensen?" }] : []),
    ];
  }
  if (session.insightRecognition === "partly") {
    return [
      { topic: "other", label: "Benoemen wat wel en niet past" },
      { topic: "why", label: "Hier verder naar kijken" },
    ];
  }
  if (session.insightRecognition === "not-yet") {
    return [
      { topic: "evidence", label: "Mijn woorden nog eens bekijken" },
      { topic: "other", label: "Ik zie het anders" },
    ];
  }
  return [
    { topic: "why", label: "Hier verder naar kijken" },
    { topic: "other", label: "Een ander onderwerp uit mijn woorden onderzoeken" },
  ];
}

function answerFor(session: ExperienceSession, stepId: ExperienceStepId): string {
  return session.answers.find((answer) => answer.stepId === stepId)?.answer ?? "";
}

function renderExplorationDetail(session: ExperienceSession, topic: InsightExplorationTopic): string {
  const insight = deriveFirstInsight(session);
  const existing = (session.reflections ?? []).find((reflection) => reflection.topic === topic)?.response ?? "";
  if (topic === "why") {
    return `<article class="experience-exploration-detail" data-testid="exploration-detail"><p class="experience-kicker">${isLivingVersion(session.version) ? "Waarom dit opviel" : "Waarom dit opviel"}</p><h2>${session.version === flowRecompositionVersion ? "Twee details wezen niet vanzelf naar dezelfde verklaring." : isLivingVersion(session.version) ? "Dit mogelijke verband ligt tussen jouw twee antwoorden." : "Omdat je woorden een keten laten zien."}</h2><p>${escapeHtml(insight.explanation)}</p></article>`;
  }
  if (topic === "evidence") {
    return `<article class="experience-exploration-detail" data-testid="exploration-detail"><p class="experience-kicker">Rechtstreeks uit jouw woorden</p><h2>Deze uitspraken vormden het spoor.</h2>${insight.evidence.map((item) => `<blockquote><span>${escapeHtml(item.label)}</span>“${escapeHtml(item.answer)}”</blockquote>`).join("")}</article>`;
  }

  const otherPrompt = isLivingVersion(session.version) && session.insightRecognition === "partly"
    ? {
        context: answerFor(session, "moment"),
        question: "Welk deel herken je wel, en welk deel zou je anders formuleren?",
        placeholder: "Vertel wat wel past en wat volgens jou anders ligt.",
      }
    : isLivingVersion(session.version) && session.insightRecognition === "not-yet"
      ? {
          context: answerFor(session, "moment"),
          question: session.version === flowRecompositionVersion ? "Welk concreet detail mist hier nog?" : "Hoe zie jij het verband tussen dit moment en wat volgens jou meespeelde?",
          placeholder: session.version === flowRecompositionVersion ? "Wat gebeurde er dat nog niet zichtbaar was?" : "Formuleer het verband zoals jij het ziet.",
        }
      : isLivingVersion(session.version)
        ? {
            context: answerFor(session, "attention"),
            question: session.version === flowRecompositionVersion ? "Welke andere verklaring past volgens jou bij dit moment?" : "Welk ander onderwerp uit wat je vertelde verdient volgens jou nog aandacht?",
            placeholder: session.version === flowRecompositionVersion ? "Wat zou er ook kunnen spelen?" : "Noem alleen wat je later misschien wilt onderzoeken.",
          }
        : {
            context: answerFor(session, "moment"),
            question: "Naast deze situatie: welk ander onderwerp in je organisatie verdient volgens jou een rustig eerste onderzoek?",
            placeholder: "Welk ander onderwerp komt bij je op?",
          };
  const prompts: Record<Exclude<InsightExplorationTopic, "why" | "evidence">, { context: string; question: string; placeholder: string }> = {
    customers: {
      context: answerFor(session, "natural"),
      question: session.version === flowRecompositionVersion ? "Wat merkte een klant, leverancier of partner hier als eerste van?" : "Je noemde deze externe impact. Wat zou de klant, leverancier of partner daarvan in de praktijk vooral merken?",
      placeholder: "Wat merkt iemand buiten de organisatie concreet?",
    },
    colleagues: {
      context: answerFor(session, "energy"),
      question: session.version === flowRecompositionVersion ? "Wie moest wachten, opnieuw beginnen of iets extra uitleggen?" : "Je beschreef dit interne gevolg. Wat vraagt dat volgens jou van de betrokken collega’s?",
      placeholder: "Wat verandert er voor collega’s in hun werk?",
    },
    begin: {
      context: answerFor(session, "attention"),
      question: session.version === flowRecompositionVersion ? "Welke plek of overdracht zou je als eerste onderzoeken?" : "Je vermoedt dat dit meespeelde. Waar zou je als eerste beter naar willen kijken, nog zonder een oplossing te kiezen?",
      placeholder: session.version === flowRecompositionVersion ? "Waar zou jij beginnen met kijken?" : "Waar begint volgens jou het onderzoeken?",
    },
    other: otherPrompt,
  };
  const prompt = prompts[topic];
  const savedResponse = session.version === flowRecompositionVersion && existing
    ? `<aside class="experience-new-value" data-testid="flow-new-value"><p>Dit maakt een nieuw onderscheid zichtbaar.</p><strong>${topic === "customers" ? "De impact buiten de organisatie kan een ander tempo hebben dan het interne werk." : topic === "colleagues" ? "Het lijkt de moeite waard om de overgang tussen mensen los te bekijken van het werk zelf." : topic === "begin" ? "Het eerste zichtbare probleem hoeft niet de plek te zijn waar de frictie begint." : "Jouw aanvulling verandert de richting; we houden de eerdere gedachte daarom open."}</strong></aside>`
    : "";
  const responseForm = `<form data-form="insight-reflection" data-topic="${escapeHtml(topic)}">
      <label class="experience-visually-hidden" for="insight-reflection-answer">Jouw verdere gedachte</label>
      <textarea id="insight-reflection-answer" name="response" maxlength="1600" placeholder="${escapeHtml(prompt.placeholder)}" required>${escapeHtml(existing)}</textarea>
      <button class="experience-button" type="submit">${existing && session.version === flowRecompositionVersion ? "Scherp dit aan" : "Neem deze gedachte mee"}</button>
    </form>`;
  return `<article class="experience-exploration-detail" data-testid="exploration-detail">
    <p class="experience-kicker">${session.version === flowRecompositionVersion ? "Nog één stap" : "Deze vraag komt hier vandaan"}</p>
    ${session.version === flowRecompositionVersion ? "" : `<blockquote>“${escapeHtml(prompt.context)}”</blockquote>`}
    <h2>${escapeHtml(prompt.question)}</h2>
    ${savedResponse}
    ${existing && session.version === flowRecompositionVersion ? `<details class="experience-answer-revisit"><summary>Mijn antwoord aanpassen</summary>${responseForm}</details>` : responseForm}
  </article>`;
}

function renderExploration(session: ExperienceSession): string {
  const active = session.activeReflectionTopic;
  const flow = session.version === flowRecompositionVersion;
  const living = isLivingVersion(session.version);
  const choices = explorationChoicesFor(session);
  const livingTitle = session.insightRecognition === "yes"
    ? flow ? "Welke richting is nu iets waard?" : "Dit mogelijke verband herken je."
    : session.insightRecognition === "partly"
      ? flow ? "Wat maakt het beeld completer?" : "Een deel klopt. Jij bepaalt welk deel."
      : flow ? "Wat zien we nog niet?" : "Dit verband nemen we niet als uitgangspunt.";
  return frame(`<section class="experience-explore" aria-labelledby="experience-explore-title" data-testid="experience-exploration">
    <p class="experience-kicker">${flow ? "Jij kiest" : living ? "Een rustig landingsmoment" : "Jij bepaalt de diepte"}</p>
    <h1 id="experience-explore-title">${living ? livingTitle : `Dank je. Je herkent dit ${recognitionLabel(session.insightRecognition).toLocaleLowerCase("nl-NL")}.`}</h1>
    <p class="experience-insight__lead">${flow ? "Kies één spoor dat je nieuwsgierig maakt. Daarna beslis je opnieuw." : living ? "Er volgt niet automatisch nog een vraag. Kies alleen wat nu betekenis heeft. Je kunt verder kijken, je eigen formulering geven, dit laten rusten of voor vandaag stoppen." : "Kies wat je verder wilt onderzoeken. Iedere vraag hieronder komt rechtstreeks uit de woorden die je al deelde. Je mag meerdere onderwerpen bekijken of voor vandaag stoppen."}</p>
    ${active ? renderExplorationDetail(session, active) : ""}
    <div class="experience-exploration-list" aria-label="Mogelijke verdieping">
      ${choices.map((choice) => `<button data-exploration-topic="${escapeHtml(choice.topic)}" data-active="${String(choice.topic === active)}" type="button">${escapeHtml(choice.label)}</button>`).join("")}
    </div>
    <div class="experience-landing-actions">
      <button class="${flow ? "experience-text-action" : "experience-button"}" data-action="finish-insight" type="button">${flow ? "Eén gedachte bewaren" : living ? "Dit voor nu laten rusten" : "Voor vandaag is dit genoeg"}</button>
      ${living ? '<button class="experience-text-action" data-action="finish-without-workspace" type="button">Voor vandaag stoppen</button>' : ""}
    </div>
    ${flow ? "" : '<p class="experience-method-note"><strong>Begrijpen komt vóór adviseren.</strong> Een passende volgende stap kan later een website, webshop, procesverbetering, intern systeem of maatwerksoftware zijn. Welke vorm past, volgt pas uit wat we samen begrijpen.</p>'}
  </section>`, session);
}

function renderChoice(session: ExperienceSession): string {
  const items = summaryItems(session);
  const selected = selectedSummaryItem(session);
  if (!selected) {
    return frame(`<section class="experience-choice" aria-labelledby="experience-choice-title">
      <p class="experience-kicker">Wat verdient je aandacht?</p>
      <h1 id="experience-choice-title">Als je één moment wilt vasthouden, welk moment is dat dan?</h1>
      <p>De betekenis komt van jou. Je hoeft niets te kiezen.</p>
      <div class="experience-choice-list" data-testid="summary-choice">
        ${items.map((item) => `<button data-action="choose-summary" data-step-id="${escapeHtml(item.stepId)}" type="button"><span>${escapeHtml(item.label)}</span><q>${escapeHtml(item.answer)}</q></button>`).join("")}
      </div>
      <button class="experience-text-action" data-action="finish-without-workspace" type="button">Rond af zonder iets te bewaren</button>
      <button class="experience-text-action" data-action="back-summary" type="button">Bekijk mijn woorden opnieuw</button>
    </section>`, session);
  }

  return frame(`<section class="experience-choice experience-choice--selected" aria-labelledby="experience-choice-title">
    <p class="experience-kicker">Dit wil je meenemen</p>
    <h1 id="experience-choice-title">Wil je deze gedachte bewaren en er later op terugkomen?</h1>
    <blockquote>“${escapeHtml(selected.answer)}”</blockquote>
    <p>Je krijgt een rustige persoonlijke plek voor deze ene gedachte. Geen systeem om bij te houden en niets dat je nu moet oplossen.</p>
    <button class="experience-button" data-testid="open-personal-workspace" type="button">Bewaar dit voor later</button>
    <button class="experience-text-action" data-action="back-summary" type="button">Bekijk eerst mijn woorden opnieuw</button>
    <button class="experience-text-action" data-action="finish-without-workspace" type="button">Laat het voor vandaag hierbij</button>
  </section>`, session);
}

function renderWorkspace(session: ExperienceSession): string {
  const selected = selectedSummaryItem(session);
  if (session.version === flowRecompositionVersion) {
    return frame(`<section class="experience-personal" aria-labelledby="experience-personal-title">
      <p class="experience-kicker">Voor later</p>
      <h1 id="experience-personal-title">Deze gedachte blijft hier op je wachten.</h1>
      ${session.returned ? '<p class="experience-returned" data-testid="experience-returned">Fijn dat je terug bent. De draad ligt er nog.</p>' : ""}
      <section class="experience-kept-thought" data-testid="personal-workspace">
        <p>Wat ik niet wil verliezen</p>
        <blockquote>“${escapeHtml(selected?.answer ?? "")}”</blockquote>
      </section>
      <p class="experience-enough">Voor vandaag is dit genoeg. Als je terugkomt, beginnen we hier.</p>
    </section>`, session);
  }
  return frame(`<section class="experience-personal" aria-labelledby="experience-personal-title">
    <p class="experience-kicker">Voor later</p>
    <h1 id="experience-personal-title">Wat jij niet wilt verliezen.</h1>
    ${session.returned ? '<p class="experience-returned" data-testid="experience-returned">Fijn dat je terug bent. Je woorden zijn er nog.</p>' : ""}
    <section class="experience-kept-thought" data-testid="personal-workspace">
      <p>Wat ik wil onthouden</p>
      <blockquote>“${escapeHtml(selected?.answer ?? "")}”</blockquote>
    </section>
    <details class="experience-all-words">
      <summary>Wat ik hierover vertelde</summary>
      ${summaryItems(session).map((item) => `<section><h2>${escapeHtml(item.label)}</h2><blockquote>“${escapeHtml(item.answer)}”</blockquote></section>`).join("")}
    </details>
    <section class="experience-wbd-explanation" aria-labelledby="experience-wbd-title">
      <p class="experience-kicker">Wat We Build And Design doet</p>
      <h2 id="experience-wbd-title">Eerst begrijpen. Daarna pas ontwerpen en bouwen.</h2>
      <p>We helpen organisaties de gebeurtenis, oorzaak, gevolgen en impact eerst helder te krijgen. Daarna kiezen we samen wat werkelijk past: een website, webshop, procesverbetering, intern systeem of maatwerksoftware.</p>
      <a href="https://webuildanddesign.nl/contact">Neem rustig contact op</a>
    </section>
    <p class="experience-enough">Voor vandaag is dit genoeg.</p>
  </section>`, session);
}

function renderCompleted(session: ExperienceSession, entryType: ParticipantState["entryType"]): string {
  if (session.version === experienceVersion) {
    return frame(`<section class="experience-completed" aria-labelledby="experience-completed-title">
      <p class="experience-kicker">Voor nu</p>
      <h1 id="experience-completed-title">Voor vandaag is dit genoeg.</h1>
      <p>${entryType === "organic" ? "Je onderzoek is bewaard. Kom later op dit apparaat terug wanneer je nog één stap verder wilt kijken." : "Je onderzoek is bewaard. Via deze beveiligde persoonlijke toegang kun je later de draad weer oppakken."}</p>
      <button class="experience-button" data-action="resume-runtime" type="button">Ga verder onderzoeken</button>
    </section>`, session);
  }
  return frame(`<section class="experience-completed" aria-labelledby="experience-completed-title">
    <p class="experience-kicker">Dank je.</p>
    <h1 id="experience-completed-title">Voor vandaag is dit genoeg.</h1>
    <p>${entryType === "organic" ? "Je woorden blijven bij jouw Experience bewaard. Open /ervaar later op dit apparaat om terug te komen." : "Je woorden blijven bij jouw Experience bewaard. Open deze beveiligde persoonlijke toegang later opnieuw om terug te komen."}</p>
    <section class="experience-wbd-explanation" aria-labelledby="experience-wbd-title">
      <p class="experience-kicker">Zo werkt We Build And Design</p>
      <h2 id="experience-wbd-title">We begrijpen eerst wat er werkelijk speelt.</h2>
      <p>Daarna ontwerpen en bouwen we de digitale oplossing die het beste past. Dat kan een website, webshop, procesverbetering, intern systeem of maatwerksoftware zijn.</p>
      <p>Heeft deze Experience je aan het denken gezet? Neem gerust contact op. Dan kijken we samen naar een oplossing waar je morgen iets aan hebt.</p>
      <a class="experience-button" href="https://webuildanddesign.nl/contact">Neem rustig contact op</a>
    </section>
    <button class="experience-text-action" data-action="back-summary" type="button">Bekijk mijn woorden nog één keer</button>
  </section>`, session);
}

function renderUnavailable(title: string, message: string): string {
  return frame(`<section class="experience-unavailable" aria-labelledby="experience-unavailable-title">
    <p class="experience-kicker">Persoonlijke toegang</p>
    <h1 id="experience-unavailable-title">${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
  </section>`);
}

function renderLoading(personalTokenEntry = true): string {
  const message = personalTokenEntry
    ? "Je persoonlijke Experience wordt rustig geopend…"
    : "Je Experience wordt rustig geopend…";
  return frame(`<section class="experience-loading" aria-live="polite"><p>${message}</p></section>`);
}

function renderState(state: ParticipantState): string {
  if (state.invitationStatus === "revoked") return renderUnavailable("Deze persoonlijke toegang is niet meer actief.", "Er zijn geen persoonlijke gegevens zichtbaar. Via /ervaar kun je rustig opnieuw beginnen.");
  if (!state.session) return renderWelcome();
  if (state.session.phase === "runtime") return renderRuntime(state.session, state.description === "first-visit-v2");
  if (state.session.phase === "question") return renderQuestion(state.session);
  if (state.session.phase === "listening") return renderListening(state.session);
  if (state.session.phase === "summary") return renderSummary(state.session);
  if (state.session.phase === "insight") return renderInsight(state.session);
  if (state.session.phase === "explore") return renderExploration(state.session);
  if (state.session.phase === "choice") return renderChoice(state.session);
  if (state.session.phase === "workspace") return renderWorkspace(state.session);
  return renderCompleted(state.session, state.entryType);
}

function showStatus(app: HTMLDivElement, message: string, error = false): void {
  app.querySelector(".experience-status")?.remove();
  const status = document.createElement("p");
  status.className = "experience-status";
  status.dataset.state = error ? "error" : "success";
  status.setAttribute("role", error ? "alert" : "status");
  status.textContent = message;
  app.append(status);
  window.setTimeout(() => status.remove(), 5000);
}

function apiMessage(error: unknown): string {
  if (error instanceof ExperienceApiError) return error.message;
  return "De veilige verbinding kon deze handeling niet afronden. Probeer het rustig opnieuw.";
}

function setBusy(element: HTMLElement, busy: boolean): void {
  element.setAttribute("aria-busy", String(busy));
  element.querySelectorAll<HTMLButtonElement>("button").forEach((button) => { button.disabled = busy; });
}

function invitationTokenFromLocation(): string | undefined {
  const raw = window.location.hash.replace(/^#(?:token=)?/, "").trim();
  return raw ? decodeURIComponent(raw) : undefined;
}

function referralIdFromLocation(): string | undefined {
  const match = window.location.hash.match(/^#via=([A-Za-z0-9_-]{1,96})$/);
  return match?.[1];
}

async function loadParticipantState(): Promise<ParticipantState> {
  const token = invitationTokenFromLocation();
  if (token) {
    const state = await experienceApi.exchangeInvitation(token);
    window.history.replaceState({}, "", "/e/");
    return state;
  }
  return experienceApi.currentState();
}

function attachDialogs(app: HTMLDivElement, state: ParticipantState, refresh: (state: ParticipantState) => void): void {
  const feedback = app.querySelector<HTMLDialogElement>("[data-testid='feedback-dialog']");
  app.querySelector<HTMLButtonElement>("[data-action='open-feedback']")?.addEventListener("click", () => feedback?.showModal());
  feedback?.querySelector<HTMLButtonElement>("[data-action='close-feedback']")?.addEventListener("click", () => feedback.close());
  feedback?.querySelector<HTMLFormElement>("[data-form='experience-feedback']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    setBusy(form, true);
    try {
      await experienceApi.feedback({
        expected: String(data.get("expected") ?? ""),
        happened: String(data.get("happened") ?? ""),
        natural: String(data.get("natural") ?? ""),
      });
      form.reset();
      feedback.close();
      showStatus(app, "Dank je. Je ervaring is veilig gedeeld.");
    } catch (error) {
      showStatus(app, apiMessage(error), true);
    } finally {
      setBusy(form, false);
    }
  });

  const deletion = app.querySelector<HTMLDialogElement>("[data-testid='delete-session-dialog']");
  app.querySelector<HTMLButtonElement>("[data-action='open-delete']")?.addEventListener("click", () => deletion?.showModal());
  deletion?.querySelectorAll<HTMLButtonElement>("[data-action='close-delete']").forEach((button) => button.addEventListener("click", () => deletion.close()));
  deletion?.querySelector<HTMLFormElement>("[data-form='delete-session']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    setBusy(form, true);
    try {
      await experienceApi.deleteSession();
      clearCheckpoint();
      deletion.close();
      refresh({ invitationId: "removed", invitationStatus: "revoked", entryType: state.entryType });
    } catch (error) {
      showStatus(app, apiMessage(error), true);
      setBusy(form, false);
    }
  });

  const leaving = app.querySelector<HTMLDialogElement>("[data-testid='leave-experience-dialog']");
  leaving?.querySelector<HTMLButtonElement>("[data-action='stay-experience']")?.addEventListener("click", () => leaving.close());
}

function attachActions(app: HTMLDivElement, state: ParticipantState, refresh: (state: ParticipantState) => void): void {
  const run = async (element: HTMLElement, action: () => Promise<ParticipantState>) => {
    setBusy(element, true);
    try {
      refresh(await action());
    } catch (error) {
      showStatus(app, apiMessage(error), true);
      setBusy(element, false);
    }
  };

  app.querySelector<HTMLButtonElement>("[data-testid='start-experience']")?.addEventListener("click", (event) => void run(event.currentTarget as HTMLElement, () => experienceApi.start()));
  const runtimeForm = app.querySelector<HTMLFormElement>("[data-form='runtime-contribution']");
  const runtimeInput = runtimeForm?.querySelector<HTMLTextAreaElement>("[name='content']");
  runtimeInput?.addEventListener("input", () => {
    if (!state.session) return;
    saveCheckpoint({ schemaVersion: 2, invitationId: state.invitationId, sessionId: state.session.id, draftStepId: "runtime", draft: runtimeInput.value, updatedAt: new Date().toISOString() });
  });
  const submitRuntime = (content: string) => {
    if (!runtimeForm || !state.session?.runtime) return;
    void run(runtimeForm, async () => {
      const next = await experienceApi.runtimeContribute({
        eventId: crypto.randomUUID(),
        content,
        observedAt: new Date().toISOString(),
        baseRevision: state.session!.runtime!.field.revision,
      });
      clearCheckpoint();
      return next;
    });
  };
  runtimeForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const content = String(new FormData(runtimeForm).get("content") ?? "").trim();
    if (!content) {
      showStatus(app, "Schrijf iets wat bij je opkomt, of kies ‘Ik weet het nog niet’.", true);
      return;
    }
    submitRuntime(content);
  });
  app.querySelector<HTMLButtonElement>("[data-action='runtime-unknown']")?.addEventListener("click", () => {
    if (runtimeInput?.value.trim()) {
      showStatus(app, "Je woorden staan nog in het veld. Kies ‘Neem dit mee’ om ze te bewaren, of maak het veld leeg als je nu niets weet.", true);
      runtimeInput.focus();
      return;
    }
    submitRuntime("Weet ik nog niet.");
  });
  app.querySelector<HTMLButtonElement>("[data-action='resume-runtime']")?.addEventListener("click", (event) => void run(event.currentTarget as HTMLElement, () => experienceApi.resumeRuntime()));
  const answerForm = app.querySelector<HTMLFormElement>("[data-form='experience-answer']");
  const answerInput = answerForm?.querySelector<HTMLTextAreaElement>("[name='answer']");
  answerInput?.addEventListener("input", () => {
    if (!state.session) return;
    saveCheckpoint({ schemaVersion: 2, invitationId: state.invitationId, sessionId: state.session.id, draftStepId: answerForm!.dataset.stepId as ExperienceStepId, draft: answerInput.value, updatedAt: new Date().toISOString() });
  });
  answerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const stepId = answerForm.dataset.stepId as ExperienceStepId;
    const answer = String(new FormData(answerForm).get("answer") ?? "").trim();
    if (!answer) {
      showStatus(app, "Schrijf iets wat bij je opkomt, of kies ‘Ik weet het nog niet’.", true);
      return;
    }
    void run(answerForm, async () => {
      const next = await experienceApi.answer(stepId, answer);
      clearCheckpoint();
      return next;
    });
  });
  app.querySelector<HTMLButtonElement>("[data-action='skip-answer']")?.addEventListener("click", () => {
    if (!answerForm) return;
    void run(answerForm, () => experienceApi.answer(answerForm.dataset.stepId as ExperienceStepId, "Weet ik nog niet."));
  });
  app.querySelector<HTMLButtonElement>("[data-testid='continue-after-listening']")?.addEventListener("click", (event) => void run(event.currentTarget as HTMLElement, () => experienceApi.continue()));
  app.querySelector<HTMLButtonElement>("[data-testid='confirm-summary']")?.addEventListener("click", (event) => void run(event.currentTarget as HTMLElement, () => experienceApi.showChoice()));
  app.querySelectorAll<HTMLButtonElement>("[data-recognition]").forEach((button) => button.addEventListener("click", () => void run(button, async () => {
    const recognized = await experienceApi.recognizeInsight(button.dataset.recognition as InsightRecognition);
    const followup = button.dataset.followupTopic as InsightExplorationTopic | undefined;
    return followup ? experienceApi.exploreInsight(followup) : recognized;
  })));
  app.querySelectorAll<HTMLButtonElement>("[data-exploration-topic]").forEach((button) => button.addEventListener("click", () => void run(button, () => experienceApi.exploreInsight(button.dataset.explorationTopic as InsightExplorationTopic))));
  app.querySelector<HTMLFormElement>("[data-form='insight-reflection']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const response = String(new FormData(form).get("response") ?? "").trim();
    if (!response) {
      showStatus(app, "Schrijf eerst wat je hierbij denkt.", true);
      return;
    }
    void run(form, () => experienceApi.exploreInsight(form.dataset.topic as InsightExplorationTopic, response));
  });
  app.querySelector<HTMLButtonElement>("[data-action='finish-insight']")?.addEventListener("click", (event) => void run(event.currentTarget as HTMLElement, () => experienceApi.finishInsight()));
  app.querySelectorAll<HTMLButtonElement>("[data-action='choose-summary']").forEach((button) => button.addEventListener("click", () => void run(button, () => experienceApi.choose(button.dataset.stepId as ExperienceStepId))));
  app.querySelector<HTMLButtonElement>("[data-testid='open-personal-workspace']")?.addEventListener("click", (event) => void run(event.currentTarget as HTMLElement, () => experienceApi.openWorkspace()));
  app.querySelectorAll<HTMLButtonElement>("[data-action='back-summary']").forEach((button) => button.addEventListener("click", () => void run(button, () => experienceApi.backToSummary())));
  app.querySelectorAll<HTMLButtonElement>("[data-action='finish-without-workspace']").forEach((button) => button.addEventListener("click", () => void run(button, () => experienceApi.finish())));

  const editDialog = app.querySelector<HTMLDialogElement>("[data-testid='edit-answer-dialog']");
  app.querySelectorAll<HTMLButtonElement>("[data-action='edit-answer']").forEach((button) => button.addEventListener("click", () => {
    const item = state.session ? summaryItems(state.session).find((candidate) => candidate.stepId === button.dataset.stepId) : undefined;
    if (!item || !editDialog) return;
    editDialog.querySelector<HTMLInputElement>("[name='stepId']")!.value = item.stepId;
    editDialog.querySelector<HTMLTextAreaElement>("[name='answer']")!.value = item.answer;
    editDialog.showModal();
  }));
  editDialog?.querySelector<HTMLButtonElement>("[data-action='close-edit']")?.addEventListener("click", () => editDialog.close());
  editDialog?.querySelector<HTMLFormElement>("[data-form='edit-answer']")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    void run(form, async () => {
      const next = await experienceApi.editAnswer(String(data.get("stepId")) as ExperienceStepId, String(data.get("answer") ?? ""));
      editDialog.close();
      return next;
    });
  });
  attachDialogs(app, state, refresh);
}

export async function renderExperienceWorkspace(app: HTMLDivElement): Promise<void> {
  document.documentElement.className = "experience-mode";
  document.documentElement.lang = "nl";
  document.title = "Een rustig moment — We Build And Design";
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.name = "robots";
    document.head.append(robots);
  }
  robots.content = "noindex, nofollow, noarchive, nosnippet, noimageindex";
  const personalTokenEntry = hasPersonalExperienceToken(window.location.hash);
  app.innerHTML = renderLoading(personalTokenEntry);

  const organicEntry = window.location.pathname.replace(/\/+$/, "") === "/ervaar";
  const referralId = organicEntry ? referralIdFromLocation() : undefined;
  let protectConversation = false;
  let navigationGuardArmed = Boolean(window.history.state?.wbdExperienceGuard);

  window.addEventListener("popstate", () => {
    if (!protectConversation) return;
    window.history.pushState({ wbdExperienceGuard: true }, "", window.location.href);
    navigationGuardArmed = true;
    app.querySelector<HTMLDialogElement>("[data-testid='leave-experience-dialog']")?.showModal();
  });

  const syncNavigationGuard = (state: ParticipantState) => {
    protectConversation = state.session?.version === experienceVersion
      && !["completed", "workspace"].includes(state.session.phase);
    if (protectConversation && !navigationGuardArmed) {
      window.history.pushState({ wbdExperienceGuard: true }, "", window.location.href);
      navigationGuardArmed = true;
    }
    app.querySelector<HTMLButtonElement>("[data-action='leave-experience']")?.addEventListener("click", () => {
      protectConversation = false;
      app.querySelector<HTMLDialogElement>("[data-testid='leave-experience-dialog']")?.close();
      window.history.go(-2);
    });
  };

  const refresh = (state: ParticipantState, askWho = false) => {
    if (askWho) {
      app.innerHTML = renderOrganicReturn(state);
      app.querySelector<HTMLButtonElement>("[data-testid='resume-organic-experience']")?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLElement;
        setBusy(button, true);
        try {
          refresh(await experienceApi.resumeOrganicParticipant());
        } catch (error) {
          showStatus(app, apiMessage(error), true);
          setBusy(button, false);
        }
      });
      app.querySelector<HTMLButtonElement>("[data-action='new-organic-participant']")?.addEventListener("click", async (event) => {
        const button = event.currentTarget as HTMLElement;
        setBusy(button, true);
        try {
          await experienceApi.releaseOrganicParticipant();
          clearCheckpoint();
          showOrganicWelcome();
        } catch (error) {
          showStatus(app, apiMessage(error), true);
          setBusy(button, false);
        }
      });
      return;
    }
    app.innerHTML = renderState(state);
    if (state.session) saveCheckpoint({ schemaVersion: 2, invitationId: state.invitationId, sessionId: state.session.id, updatedAt: new Date().toISOString() });
    attachActions(app, state, refresh);
    syncNavigationGuard(state);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showOrganicWelcome = () => {
    app.innerHTML = renderOrganicWelcome(referralId);
    const form = app.querySelector<HTMLFormElement>("[data-form='organic-participant']");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      setBusy(form, true);
      try {
        const state = await experienceApi.createOrganicParticipant({
          name: String(data.get("name") ?? ""),
          role: String(data.get("role") ?? "").trim() || undefined,
          organization: String(data.get("organization") ?? "").trim() || undefined,
          referralId,
          technicalTest: Boolean(referralId?.startsWith("acceptance-")),
        });
        window.history.replaceState({}, "", "/ervaar");
        clearCheckpoint();
        refresh(state);
      } catch (error) {
        showStatus(app, apiMessage(error), true);
        setBusy(form, false);
      }
    });
  };

  try {
    if (organicEntry) {
      try {
        refresh(await experienceApi.organicState(), true);
      } catch (error) {
        if (error instanceof ExperienceApiError && (error.status === 401 || error.status === 404)) {
          showOrganicWelcome();
          return;
        }
        throw error;
      }
    } else {
      refresh(await loadParticipantState());
    }
  } catch (error) {
    if (error instanceof ExperienceApiError
      && shouldRedirectMissingPersonalAccess(window.location.pathname, window.location.hash, error.status)) {
      window.location.replace("/ervaar");
      return;
    }
    const message = error instanceof ExperienceApiError && error.status === 410
      ? "Deze persoonlijke toegang is ingetrokken of verlopen. Er zijn geen persoonlijke gegevens zichtbaar."
      : error instanceof ExperienceApiError && error.status === 404
        ? "Deze persoonlijke toegang is niet geldig. Controleer of je de volledige link hebt geopend."
        : "De persoonlijke Experience kon niet veilig worden geopend. Probeer het later opnieuw.";
    app.innerHTML = organicEntry
      ? renderUnavailable("We kunnen je Experience nu niet openen.", "De veilige verbinding kon niet worden gemaakt. Probeer het later opnieuw.")
      : renderUnavailable("We kunnen deze persoonlijke Experience niet openen.", message);
  }
}
