<?php
declare(strict_types=1);

const ATLAS_RUNTIME_ARCHITECTURE_VERSION = '1.0-runtime-architecture-v1';

function atlas_runtime_initial(string $sessionId, string $participantId, string $timestamp): array {
    $decision = [
        'revision' => 0, 'kind' => 'question', 'movement' => 'free-telling', 'kicker' => 'Jouw moment',
        'title' => 'Laten we beginnen bij één moment uit je werkdag.',
        'question' => 'Welke werksituatie van vandaag bleef bij je hangen?',
        'prompt' => 'Vertel alleen wat er gebeurde. Je hoeft nog niet te weten waarom het belangrijk is.',
        'reason' => 'De inquiry begint bij één door de deelnemer gekozen werkelijkheidscontact.',
        'canStop' => true, 'requiresResponse' => true, 'uncertainty' => 'glimpse',
        'riskBoundary' => 'Geen bijzonder risico zichtbaar; iedere gedachte blijft voorlopig.',
        'participantOptions' => ['vertellen', 'niet-weten benoemen', 'stoppen'], 'continuation' => 'internal',
        'foundationRefs' => ['F · waarnemen', 'CI · 5', 'CE · 4.15', 'RA-02'],
    ];
    return ['field' => [
        'schemaVersion' => 1, 'architectureVersion' => ATLAS_RUNTIME_ARCHITECTURE_VERSION,
        'sessionId' => $sessionId, 'revision' => 0,
        'inquiryFrame' => [
            'purpose' => 'Samen één werksituatie beter begrijpen zonder al te adviseren.', 'phase' => 'investigate',
            'mandate' => 'research-with-participant', 'participantIds' => [$participantId],
            'scope' => 'Een door de deelnemer gekozen moment uit de eigen werkpraktijk.',
            'excluded' => ['advies', 'diagnose', 'automatische conclusie'], 'consent' => 'voluntary',
        ],
        'realityContacts' => [], 'meanings' => [], 'hypotheses' => [],
        'openUnknowns' => [[
            'id' => 'unknown-0-1', 'kind' => 'concrete-event',
            'question' => 'Welke concrete werksituatie bleef bij je hangen?', 'status' => 'asked', 'openedAtRevision' => 0,
        ]],
        'risk' => ['level' => 'ordinary', 'reasons' => [], 'externalCorrectionRequired' => false],
        'worldKnowledge' => [],
        'attention' => ['focus' => 'concrete-event', 'reason' => 'Er is nog geen gebeurtenis ingebracht.', 'movement' => 'free-telling'],
        'qualitativeConfidence' => 'glimpse',
        'meta' => ['acceptedTransitions' => 0, 'consecutiveNoChange' => 0, 'lastChangeType' => 'initialization', 'consolidationCount' => 0, 'lastConsolidatedRevision' => 0],
        'updatedAt' => $timestamp,
    ], 'decision' => $decision];
}

function atlas_runtime_compact(string $value, int $maximum = 150): string {
    $normalized = trim((string)preg_replace('/\s+/u', ' ', $value));
    return mb_strlen($normalized) <= $maximum ? $normalized : rtrim(mb_substr($normalized, 0, $maximum - 1)) . '…';
}

function atlas_runtime_latest_hypothesis(array $hypotheses): ?array {
    for ($index = count($hypotheses) - 1; $index >= 0; $index--) {
        if (in_array($hypotheses[$index]['status'], ['active', 'candidate', 'contested'], true)) return $hypotheses[$index];
    }
    return null;
}

function atlas_runtime_unknown(array $field, array $unknowns, string $kind, string $question, ?string $hypothesisId = null): array {
    foreach ($unknowns as &$unknown) {
        if ($unknown['kind'] === $kind && ($unknown['hypothesisId'] ?? null) === $hypothesisId && $unknown['status'] !== 'resolved') {
            $unknown['status'] = 'asked'; $unknown['question'] = $question; return $unknowns;
        }
    }
    unset($unknown);
    $unknowns[] = [
        'id' => 'unknown-' . ((int)$field['revision'] + 1) . '-' . (count($unknowns) + 1), 'kind' => $kind,
        'question' => $question, 'status' => 'asked', 'hypothesisId' => $hypothesisId,
        'openedAtRevision' => (int)$field['revision'] + 1,
    ];
    return $unknowns;
}

function atlas_runtime_words(string $value): array {
    preg_match_all('/[a-zà-ÿ][a-zà-ÿ-]{3,}/iu', mb_strtolower($value, 'UTF-8'), $matches);
    $stop = ['aandacht','alleen','altijd','andere','daarna','daarom','dezelfde','deze','door','eigenlijk','gebeurde','gewoon','heeft','hier','iemand','iets','kunnen','later','meer','omdat','onze','opnieuw','over','precies','soms','steeds','toen','vandaag','veel','vooral','waren','werd','werden','zelf','zoals','zonder'];
    return array_values(array_unique(array_filter($matches[0] ?? [], fn(string $word): bool => !in_array($word, $stop, true))));
}

function atlas_runtime_decision(array &$next, array $previous, array $event, string $changeType, bool $noMeaningfulChange): array {
    $common = [
        'revision' => $next['revision'], 'canStop' => true, 'requiresResponse' => true,
        'originQuote' => atlas_runtime_compact($event['content'], 180), 'uncertainty' => $next['qualitativeConfidence'],
        'riskBoundary' => $next['risk']['externalCorrectionRequired'] ? 'Verdere talige afleiding is begrensd tot een externe werkelijkheidstoets.' : 'Iedere gedachte blijft voorlopig en corrigeerbaar.',
        'participantOptions' => ['bevestigen', 'corrigeren', 'een alternatief geven', 'stoppen'],
        'continuation' => $next['risk']['externalCorrectionRequired'] ? 'external-correction-required' : 'internal',
    ];
    if ($next['risk']['externalCorrectionRequired']) return $common + [
        'kind' => 'external-correction', 'movement' => 'external-correction', 'kicker' => 'Eerst een veilige grens',
        'title' => 'Hier wil ik niet alleen op woorden verder redeneren.',
        'question' => 'Welke bevoegde persoon, bron of directe waarneming kan dit verantwoord helpen beoordelen?',
        'prompt' => 'Je hoeft dit hier niet verder uit te leggen. Benoem alleen welke werkelijkheidstoets passend is, of laat dit onderwerp rusten.',
        'reason' => 'Een mogelijk hoog-risicosignaal vereist externe correctie vóór verdere inhoudelijke afleiding.',
        'foundationRefs' => ['F · hiërarchie', 'CE · 4.16', 'CE · 20.7', 'RA-11', 'RA-14'],
    ];
    $hasGround = count(array_filter($previous['realityContacts'], fn(array $contact): bool => mb_strlen($contact['content']) >= 12 && !preg_match('/^(weet ik (nog )?niet|geen idee|onbekend|geen antwoord)[.!]?$/iu', $contact['content']))) > 0;
    $active = atlas_runtime_latest_hypothesis($next['hypotheses']);
    if ($noMeaningfulChange && (int)$next['meta']['consecutiveNoChange'] === 1 && $hasGround) {
        $question = 'Wie zou ditzelfde moment vanuit een andere positie kunnen zien, en wat kon diegene werkelijk merken?';
        $next['openUnknowns'] = atlas_runtime_unknown($previous, $next['openUnknowns'], 'perspective', $question, $active['id'] ?? null);
        $next['attention'] = ['focus' => 'perspective', 'reason' => 'De huidige toets leverde geen nieuwe grond op; een ander waarnemingsperspectief kan meer onderscheid geven.', 'movement' => 'perspective'];
        return $common + ['kind' => 'question', 'movement' => 'perspective', 'kicker' => 'We kijken bewust anders', 'title' => 'Deze richting geeft nu geen nieuw onderscheid.', 'question' => $question, 'prompt' => 'Blijf bij wat die ander kon waarnemen; een intentie hoef je niet in te vullen.', 'reason' => 'Een opbrengstarme toets verplaatst de aandacht naar een bereikbare andere waarnemingspositie.', 'foundationRefs' => ['CI · 14.5', 'CE · 7.22', 'CE · 11.3', 'CE · 12.2–3', 'RA-12']];
    }
    if ($noMeaningfulChange && (int)$next['meta']['consecutiveNoChange'] === 2) {
        $question = 'Welk ander moment in je werk is nu betekenisvoller om te onderzoeken?';
        $next['openUnknowns'] = atlas_runtime_unknown($previous, $next['openUnknowns'], 'concrete-event', $question);
        $next['attention'] = ['focus' => 'concrete-event', 'reason' => 'Twee bewegingen zonder opbrengst maken een ander, door de deelnemer gekozen moment waardevoller dan verder duwen.', 'movement' => 'free-telling'];
        return $common + ['kind' => 'question', 'movement' => 'free-telling', 'kicker' => 'Dit spoor mag rusten', 'title' => 'Ik wil niet langer op dezelfde gedachte blijven drukken.', 'question' => $question, 'prompt' => 'Je kunt ook bij dit moment blijven of voor vandaag stoppen; jij kiest de richting.', 'reason' => 'Na twee bewegingen zonder opbrengst parkeert Atlas de niet-toetsbare richting en opent hij ruimte voor een gekozen nieuw spoor.', 'foundationRefs' => ['CI · 8.7', 'CI · 14.5', 'CE · 7.19', 'CE · 19.2', 'CE · 20.3', 'RA-12']];
    }
    if ($noMeaningfulChange) {
        $next['attention'] = ['focus' => 'open-space', 'reason' => 'Verder vragen zou nu alleen de lus in leven houden; de deelnemer kan zelf nieuwe grond inbrengen.', 'movement' => 'silence'];
        return $common + ['kind' => 'silence', 'movement' => 'silence', 'kicker' => 'Ruimte zonder druk', 'title' => 'Ik stel nu niet opnieuw een vraag.', 'prompt' => 'Als een ander moment of een correctie bij je opkomt, kun je die zelf inbrengen. Je kunt dit ook laten rusten.', 'reason' => 'Na herhaalde no-change beschermt Atlas het onderzoek tegen geforceerde diepte en blijft de deelname open.', 'foundationRefs' => ['CI · 14.5', 'CE · 7.29', 'CE · 11.6', 'CE · 18', 'CE · 24.8', 'RA-12']];
    }
    if ($changeType === 'correction') return $common + [
        'kind' => 'question', 'movement' => 'correction', 'kicker' => 'Dan verandert mijn gedachte',
        'title' => 'Je correctie maakt mijn eerdere richting minder houdbaar.',
        'question' => 'Welk onderscheid moet ik volgens jou voortaan wél vasthouden?',
        'prompt' => 'Zeg vooral wat ik niet opnieuw op één hoop mag leggen.',
        'reason' => 'Een correctie krijgt werkelijk veranderingsrecht en opent een herzien onderzoeksbeeld.',
        'foundationRefs' => ['CI · 8', 'CE · 7.25–26', 'CE · 23.7–8', 'RA-08'],
    ];
    if ($changeType === 'hypothesis-abandonment') {
        $question = 'Welke gebeurtenis of andere verklaring past beter bij wat er werkelijk gebeurde?';
        $next['openUnknowns'] = atlas_runtime_unknown($previous, $next['openUnknowns'], 'concrete-event', $question);
        $next['attention'] = ['focus' => 'concrete-event', 'reason' => 'De eerdere hypothese is na herhaalde expliciete correctie losgelaten; de grondlaag krijgt opnieuw voorrang.', 'movement' => 'correction'];
        return $common + ['kind' => 'question', 'movement' => 'correction', 'kicker' => 'Die gedachte laat ik los', 'title' => 'Mijn eerdere verklaring is niet langer verantwoord.', 'question' => $question, 'prompt' => 'Een andere verklaring mag klein en voorlopig beginnen.', 'reason' => 'Herhaalde expliciete correctie weerlegt de hypothese in haar huidige vorm en heroriënteert het onderzoek op de gedeelde werkelijkheid.', 'foundationRefs' => ['CI · 8.8', 'CE · 7.5', 'CE · 7.20', 'CE · 23.7–8', 'RA-07']];
    }
    if ($active && count($active['counterEvidenceContactIds']) === 0) {
        $question = 'Wanneer gebeurde iets vergelijkbaars juist níét, of liep het merkbaar anders?';
        $next['openUnknowns'] = atlas_runtime_unknown($previous, $next['openUnknowns'], 'counterexample', $question, $active['id']);
        $next['attention'] = ['focus' => $active['id'], 'reason' => 'De actieve hypothese heeft nog geen tegenvoorbeeld of grens.', 'movement' => 'counterexample'];
        return $common + ['kind' => 'question', 'movement' => 'counterexample', 'kicker' => 'Atlas toetst een mogelijkheid', 'title' => 'Dit kan een verband zijn, maar ik wil het niet te snel vastzetten.', 'question' => $question, 'prompt' => 'Een uitzondering helpt meer dan nog een bevestiging.', 'reason' => 'De actieve hypothese heeft een onderscheidende tegenaanwijzing of grens nodig.', 'foundationRefs' => ['CI · 7–8', 'CI · 17.1–3', 'CE · 9', 'CE · 23.6–7', 'RA-07']];
    }
    $previousWords = [];
    foreach ($previous['realityContacts'] as $item) $previousWords = array_merge($previousWords, atlas_runtime_words($item['content']));
    $novel = null;
    foreach (atlas_runtime_words($event['content']) as $word) if (!in_array($word, $previousWords, true)) { $novel = $word; break; }
    if ($novel !== null && count($previous['realityContacts']) >= 2) {
        $question = "Je noemt nu ook ‘{$novel}’. Verandert dat je eerdere verklaring, of opent dit een ander spoor?";
        $next['openUnknowns'] = atlas_runtime_unknown($previous, $next['openUnknowns'], 'causal-distinction', $question, $active['id'] ?? null);
        $next['attention'] = ['focus' => $novel, 'reason' => 'Een nieuw betekenisvol woord past nog niet vanzelf in het bestaande onderzoeksbeeld.', 'movement' => 'connect'];
        return $common + ['kind' => 'question', 'movement' => 'connect', 'kicker' => 'Er verandert iets in het beeld', 'title' => 'Je laatste antwoord voegt een nieuw mogelijk spoor toe.', 'question' => $question, 'prompt' => 'Kies alleen wat het dichtst bij jouw ervaring blijft.', 'reason' => 'Nieuwe informatie vraagt om onderscheid tussen verfijning en een zelfstandig spoor.', 'foundationRefs' => ['CI · 10', 'CI · 15', 'CE · 7.7–10', 'RA-12']];
    }
    if (!preg_match('/\b(klant|collega|team|manager|medewerker|leverancier|partner|eigenaar|afdeling|mensen|iemand)\b/iu', $event['content'])) {
        $question = 'Wie kon dit moment anders zien of er iets anders van merken dan jij?';
        $next['openUnknowns'] = atlas_runtime_unknown($previous, $next['openUnknowns'], 'perspective', $question, $active['id'] ?? null);
        $next['attention'] = ['focus' => 'perspective', 'reason' => 'Het onderzoeksbeeld bevat nog maar één waarnemingspositie.', 'movement' => 'perspective'];
        return $common + ['kind' => 'question', 'movement' => 'perspective', 'kicker' => 'Nog één perspectief', 'title' => 'Ik zie dit moment nu alleen vanuit jouw positie.', 'question' => $question, 'prompt' => 'Noem alleen wat die ander kon zien of ervaren; vul geen intentie in.', 'reason' => 'Een tweede actor kan relationele betekenis zichtbaar maken zonder innerlijke betekenis over te nemen.', 'foundationRefs' => ['CI · 13', 'CE · 4.3', 'CE · 14.4', 'RA-09']];
    }
    if (!preg_match('/\b(toen|daarna|ervoor|vooraf|later|eerst|vervolgens|sinds|iedere keer|vorige|vandaag|gisteren)\b/iu', $event['content'])) {
        $question = 'Wat gebeurde er direct vóór dit moment, en wat veranderde er meteen erna?';
        $next['openUnknowns'] = atlas_runtime_unknown($previous, $next['openUnknowns'], 'time-boundary', $question, $active['id'] ?? null);
        $next['attention'] = ['focus' => 'time-boundary', 'reason' => 'Volgorde en mogelijke werking zijn nog niet onderscheiden.', 'movement' => 'time-shift'];
        return $common + ['kind' => 'question', 'movement' => 'time-shift', 'kicker' => 'Kijken naar de volgorde', 'title' => 'De volgorde kan veranderen wat hier oorzaak of gevolg lijkt.', 'question' => $question, 'prompt' => 'Blijf bij wat je werkelijk zag gebeuren.', 'reason' => 'Tijd en context begrenzen causale afleiding.', 'foundationRefs' => ['CI · 13', 'CE · 4.15', 'CE · 7.13', 'RA-02']];
    }
    return $common + ['kind' => 'question', 'movement' => 'concretize', 'kicker' => 'Atlas blijft onderzoeken', 'title' => 'Je antwoord verandert het beeld, maar maakt het nog niet af.', 'question' => 'Welk concreet detail zou mijn huidige lezing het sterkst kunnen veranderen?', 'prompt' => 'Een correctie, uitzondering of ontbrekende gebeurtenis is welkom.', 'reason' => 'De huidige gedachte blijft voorlopig en zoekt de meest onderscheidende volgende grond.', 'foundationRefs' => ['CI · 15', 'CI · 22', 'CE · 11', 'CE · 23.2', 'RA-12']];
}

function atlas_runtime_gate(array $previous, array $next, array $decision, string $changeType): string {
    if ($next['sessionId'] !== $previous['sessionId'] || $next['inquiryFrame']['mandate'] !== $previous['inquiryFrame']['mandate']) throw new RuntimeException('RUNTIME_GATE_REJECTED');
    if ((int)$next['revision'] !== (int)$previous['revision'] + 1) throw new RuntimeException('RUNTIME_GATE_REJECTED');
    if (($decision['reason'] ?? '') === '' || count($decision['foundationRefs'] ?? []) === 0 || ($decision['canStop'] ?? false) !== true) throw new RuntimeException('RUNTIME_GATE_REJECTED');
    foreach ($next['hypotheses'] as $hypothesis) if (($hypothesis['alternative'] ?? '') === '' || count($hypothesis['evidenceContactIds'] ?? []) === 0) throw new RuntimeException('RUNTIME_GATE_REJECTED');
    if ($next['risk']['externalCorrectionRequired'] && (($decision['kind'] ?? '') !== 'external-correction' || ($decision['continuation'] ?? '') !== 'external-correction-required')) throw new RuntimeException('RUNTIME_GATE_REJECTED');
    return $next['risk']['externalCorrectionRequired'] ? 'external-correction-required' : ($changeType === 'no-meaningful-change' ? 'no-change' : 'accepted');
}

function atlas_runtime_transition(array $field, array $event): array {
    if ($event['inquiryId'] !== $field['sessionId']) throw new RuntimeException('RUNTIME_INQUIRY_MISMATCH');
    if ((int)$event['baseRevision'] !== (int)$field['revision']) throw new RuntimeException('RUNTIME_STALE_REVISION');
    $content = trim(str_replace("\0", '', (string)$event['content']));
    if ($content === '' || mb_strlen($content) > 1600) throw new RuntimeException('RUNTIME_INVALID_CONTRIBUTION');
    $revision = (int)$field['revision'] + 1;
    $contact = ['id' => 'contact-' . $revision . '-' . (count($field['realityContacts']) + 1), 'eventId' => $event['id'], 'kind' => 'participant-contribution', 'actorId' => $event['actorId'], 'directness' => 'self-report', 'content' => $content, 'observedAt' => $event['observedAt'], 'receivedAt' => $event['receivedAt'], 'foundationRefs' => ['F · waarnemen', 'CE · 4.15', 'RA-02']];
    $noChange = mb_strlen($content) < 12 || preg_match('/^(weet ik (nog )?niet|geen idee|onbekend|geen antwoord)[.!]?$/iu', $content);
    $correction = count($field['hypotheses']) > 0 && preg_match('/^(nee\b|niet helemaal\b|dat klopt niet\b|anders\b)|\b(maar eigenlijk|ik zie het anders|dat bedoel ik niet|klopt niet)\b/iu', $content);
    $risk = preg_match('/\b(onveilig|gevaar|gevaarlijk|schade|gewond|medisch|medicijn|patiënt|suïcid|brand|fraude|wettelijk verplicht|datalek|privacy-incident)\b/iu', $content)
        ? ['level' => 'potential-high', 'reasons' => ['De bijdrage bevat een mogelijk hoog-risicosignaal dat niet alleen talig mag worden onderzocht.'], 'externalCorrectionRequired' => true] : $field['risk'];
    $hypotheses = $field['hypotheses']; $changeType = $noChange ? 'no-meaningful-change' : 'addition';
    if ($correction) {
        for ($index = count($hypotheses) - 1; $index >= 0; $index--) {
            if (!in_array($hypotheses[$index]['status'], ['active','candidate','contested'], true)) continue;
            $hypotheses[$index]['counterEvidenceContactIds'][] = $contact['id'];
            if ($hypotheses[$index]['status'] === 'contested' && $hypotheses[$index]['confidence'] === 'weakened') {
                $hypotheses[$index]['status'] = 'abandoned';
                $hypotheses[$index]['deathReason'] = 'refuted-same-conditions';
                $changeType = 'hypothesis-abandonment';
            } else {
                $hypotheses[$index]['status'] = 'contested';
                $hypotheses[$index]['confidence'] = 'weakened';
                $changeType = 'correction';
            }
            break;
        }
    } elseif (!$noChange && preg_match('/\b(omdat|doordat|waardoor|lag aan|kwam door|speelde mee|de reden|veroorzaakte)\b/iu', $content)) {
        $hypotheses[] = ['id' => 'hypothesis-' . $revision . '-' . (count($hypotheses) + 1), 'statement' => atlas_runtime_compact($content), 'alternative' => 'De genoemde omstandigheden kunnen tegelijk aanwezig zijn zonder het moment volledig te verklaren.', 'status' => 'active', 'confidence' => preg_match('/\b(misschien|mogelijk|vermoed|denk dat|zou kunnen|weet ik niet|geen idee|onzeker)\b/iu', $content) ? 'glimpse' : 'plausible', 'evidenceContactIds' => [$contact['id']], 'counterEvidenceContactIds' => [], 'originRevision' => $revision];
        $changeType = 'alternative-formation';
    } elseif (!$noChange && count($field['realityContacts']) === 1 && count($hypotheses) === 0) {
        $first = $field['realityContacts'][0];
        $hypotheses[] = ['id' => 'hypothesis-' . $revision . '-1', 'statement' => '“' . atlas_runtime_compact($first['content'], 72) . '” en “' . atlas_runtime_compact($content, 72) . '” zouden met elkaar kunnen samenhangen.', 'alternative' => 'De twee beschreven details kunnen tegelijk aanwezig zijn zonder hetzelfde mechanisme te hebben.', 'status' => 'candidate', 'confidence' => 'glimpse', 'evidenceContactIds' => [$first['id'], $contact['id']], 'counterEvidenceContactIds' => [], 'originRevision' => $revision];
        $changeType = 'hypothesis-formation';
    } elseif (!$noChange && ($field['attention']['movement'] ?? '') === 'counterexample') {
        for ($index = count($hypotheses) - 1; $index >= 0; $index--) if (in_array($hypotheses[$index]['status'], ['active','candidate','contested'], true)) { $hypotheses[$index]['counterEvidenceContactIds'][] = $contact['id']; $hypotheses[$index]['status'] = 'contested'; $hypotheses[$index]['confidence'] = 'bounded'; $changeType = 'boundary-formation'; break; }
    }
    if ($noChange) {
        $nextNoChange = (int)$field['meta']['consecutiveNoChange'] + 1;
        $activeBefore = atlas_runtime_latest_hypothesis($field['hypotheses']);
        if ($activeBefore && $nextNoChange >= 2) {
            for ($index = count($hypotheses) - 1; $index >= 0; $index--) {
                if ($hypotheses[$index]['id'] !== $activeBefore['id']) continue;
                $hypotheses[$index]['status'] = 'parked';
                $hypotheses[$index]['confidence'] = 'weakened';
                $changeType = 'hypothesis-parking';
                break;
            }
        } else {
            $changeType = 'attention-shift';
        }
    }
    $unknowns = $field['openUnknowns'];
    $currentKind = ($field['revision'] === 0 || ($field['attention']['focus'] ?? '') === 'concrete-event') ? 'concrete-event' : (($field['attention']['focus'] ?? '') === 'perspective' ? 'perspective' : (($field['attention']['focus'] ?? '') === 'time-boundary' ? 'time-boundary' : (($field['attention']['movement'] ?? '') === 'counterexample' ? 'counterexample' : 'causal-distinction')));
    foreach ($unknowns as &$unknown) if ($unknown['kind'] === $currentKind && in_array($unknown['status'], ['open','asked'], true)) $unknown['status'] = $noChange ? 'parked' : 'resolved';
    unset($unknown);
    $next = $field; $next['revision'] = $revision; $next['realityContacts'][] = $contact; $next['hypotheses'] = $hypotheses; $next['openUnknowns'] = $unknowns; $next['risk'] = $risk; $next['attention'] = $field['attention']; $next['updatedAt'] = $event['receivedAt'];
    $next['meta']['acceptedTransitions']++; $next['meta']['consecutiveNoChange'] = $noChange ? $next['meta']['consecutiveNoChange'] + 1 : 0; $next['meta']['lastChangeType'] = $changeType;
    $latest = atlas_runtime_latest_hypothesis($hypotheses); if ($latest) $next['qualitativeConfidence'] = $latest['confidence']; elseif (count($hypotheses) > 0) $next['qualitativeConfidence'] = $hypotheses[array_key_last($hypotheses)]['confidence'];
    $decision = atlas_runtime_decision($next, $field, $event + ['content' => $content], $changeType, (bool)$noChange); $next['attention']['movement'] = $decision['movement'];
    if (count(array_filter($next['openUnknowns'], fn(array $unknown): bool => in_array($unknown['status'], ['open','asked'], true))) > 8 || $revision - (int)$next['meta']['lastConsolidatedRevision'] >= 10) { $next['meta']['consolidationCount']++; $next['meta']['lastConsolidatedRevision'] = $revision; }
    $affectedHypotheses = array_values(array_map(fn(array $hypothesis): string => $hypothesis['id'], array_filter($hypotheses, function(array $hypothesis) use ($field, $revision, $contact): bool {
        if ((int)$hypothesis['originRevision'] === $revision || in_array($contact['id'], $hypothesis['counterEvidenceContactIds'], true)) return true;
        foreach ($field['hypotheses'] as $before) if ($before['id'] === $hypothesis['id']) return $before['status'] !== $hypothesis['status'] || $before['confidence'] !== $hypothesis['confidence'] || ($before['deathReason'] ?? null) !== ($hypothesis['deathReason'] ?? null);
        return false;
    })));
    $gate = atlas_runtime_gate($field, $next, $decision, $changeType);
    $journal = ['eventId' => $event['id'], 'eventType' => 'contribution', 'baseRevision' => (int)$field['revision'], 'committedRevision' => $revision, 'changeType' => $changeType, 'gateStatus' => $gate, 'affectedContactIds' => [$contact['id']], 'affectedHypothesisIds' => $affectedHypotheses, 'foundationRefs' => array_values(array_unique(array_merge($contact['foundationRefs'], $decision['foundationRefs']))), 'decision' => $decision, 'createdAt' => $event['receivedAt']];
    return ['field' => $next, 'decision' => $decision, 'journalEntry' => $journal];
}

function atlas_runtime_resume(array $field, array $event): array {
    if ($event['inquiryId'] !== $field['sessionId']) throw new RuntimeException('RUNTIME_INQUIRY_MISMATCH');
    if ((int)$event['baseRevision'] !== (int)$field['revision']) throw new RuntimeException('RUNTIME_STALE_REVISION');
    $revision = (int)$field['revision'] + 1; $external = (bool)$field['risk']['externalCorrectionRequired'];
    $question = $external
        ? 'Welke bevoegde persoon, bron of directe waarneming kan dit inmiddels verantwoord helpen beoordelen?'
        : 'Wat is er sinds ons vorige gesprek veranderd — in de situatie, in jouw blik erop, of juist helemaal niet?';
    $next = $field; $next['revision'] = $revision; $next['updatedAt'] = $event['receivedAt'];
    $next['openUnknowns'] = atlas_runtime_unknown($field, $field['openUnknowns'], 'time-boundary', $question, atlas_runtime_latest_hypothesis($field['hypotheses'])['id'] ?? null);
    $next['attention'] = ['focus' => 'resume-context', 'reason' => 'Verstreken tijd en context mogen niet stilzwijgend als onveranderd worden aangenomen.', 'movement' => $external ? 'external-correction' : 'time-shift'];
    $next['meta']['acceptedTransitions']++; $next['meta']['consecutiveNoChange'] = 0; $next['meta']['lastChangeType'] = 'resume-revalidation';
    $decision = [
        'revision' => $revision, 'kind' => $external ? 'external-correction' : 'question', 'movement' => $external ? 'external-correction' : 'time-shift',
        'kicker' => 'De draad opnieuw opnemen', 'title' => $external ? 'De eerdere veiligheidsgrens blijft actief.' : 'We beginnen niet alsof er niets is veranderd.',
        'question' => $question, 'prompt' => $external ? 'Ga niet alleen op woorden verder; laat dit onderwerp anders rusten.' : '‘Er is niets veranderd’ is ook een geldig antwoord.',
        'reason' => 'Hervatten herijkt tijd, context, onderzoeksframe en actualiteit vóór een nieuwe inhoudelijke beweging.',
        'canStop' => true, 'requiresResponse' => true, 'uncertainty' => $next['qualitativeConfidence'],
        'riskBoundary' => $external ? 'Een eerdere risicogrens blijft actief totdat externe correctie beschikbaar is.' : 'Eerdere gedachten blijven voorlopig en corrigeerbaar.',
        'participantOptions' => ['verandering benoemen', 'onveranderdheid bevestigen', 'corrigeren', 'stoppen'],
        'continuation' => $external ? 'external-correction-required' : 'internal',
        'foundationRefs' => ['CI · 9', 'CE · 4.0', 'CE · 13.4', 'CE · 20.6', 'RA-17'],
    ];
    $gate = atlas_runtime_gate($field, $next, $decision, 'resume-revalidation');
    $journal = ['eventId' => $event['id'], 'eventType' => 'resume', 'baseRevision' => (int)$field['revision'], 'committedRevision' => $revision, 'changeType' => 'resume-revalidation', 'gateStatus' => $gate, 'affectedContactIds' => [], 'affectedHypothesisIds' => [], 'foundationRefs' => $decision['foundationRefs'], 'decision' => $decision, 'createdAt' => $event['receivedAt']];
    return ['field' => $next, 'decision' => $decision, 'journalEntry' => $journal];
}
