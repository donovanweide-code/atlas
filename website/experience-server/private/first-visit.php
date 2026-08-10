<?php
declare(strict_types=1);

function first_visit_normalize_url(string $value): ?string {
    $trimmed = trim($value);
    if ($trimmed === '') return null;
    $candidate = preg_match('/^https?:\/\//i', $trimmed) ? $trimmed : 'https://' . $trimmed;
    $parts = parse_url($candidate);
    if (!is_array($parts) || !isset($parts['host'])) return null;
    $scheme = strtolower((string)($parts['scheme'] ?? 'https'));
    if (!in_array($scheme, ['http', 'https'], true)) return null;
    $path = (string)($parts['path'] ?? '/');
    return $scheme . '://' . strtolower((string)$parts['host']) . ($path === '' ? '/' : $path);
}

function first_visit_runtime(
    string $sessionId,
    string $participantId,
    string $industry,
    string $organizationName,
    string $website,
    string $timestamp,
    string $snapshotPath
): array {
    $snapshot = [];
    if (is_file($snapshotPath)) {
        $decoded = json_decode((string)file_get_contents($snapshotPath), true);
        if (is_array($decoded)) $snapshot = $decoded;
    }
    $normalizedWebsite = first_visit_normalize_url($website);
    $host = $normalizedWebsite ? strtolower((string)parse_url($normalizedWebsite, PHP_URL_HOST)) : '';
    $acceptedHosts = is_array($snapshot['acceptedHosts'] ?? null) ? $snapshot['acceptedHosts'] : [];
    $supported = $host !== '' && in_array($host, array_map('strtolower', $acceptedHosts), true);

    $contacts = [
        ['id' => 'first-visit-industry', 'sourceStatus' => 'participant-input', 'kind' => 'industry', 'content' => $industry, 'observedAt' => $timestamp],
        ['id' => 'first-visit-organization', 'sourceStatus' => 'participant-input', 'kind' => 'organization', 'content' => $organizationName, 'observedAt' => $timestamp],
    ];
    if ($normalizedWebsite !== null) {
        $contacts[] = ['id' => 'first-visit-website', 'sourceStatus' => 'participant-input', 'kind' => 'website', 'content' => $normalizedWebsite, 'observedAt' => $timestamp];
    }
    if ($supported) {
        foreach (array_slice((array)($snapshot['observations'] ?? []), 0, 3) as $observation) {
            $contacts[] = [
                'id' => 'first-visit-' . (string)$observation['id'],
                'sourceStatus' => 'public-observation',
                'kind' => 'public-fact',
                'content' => (string)$observation['statement'],
                'sourceUrl' => (string)$observation['sourceUrl'],
                'evidenceExcerpt' => (string)$observation['evidenceExcerpt'],
                'observedAt' => (string)($snapshot['retrievedAt'] ?? $timestamp),
            ];
        }
    }
    $firstPicture = $supported
        ? $organizationName . ' werkt binnen ' . $industry . '. Op de website is zichtbaar hoe de organisatie zich publiek presenteert; hoe dit intern wordt uitgevoerd is nog onbekend.'
        : $organizationName . ' werkt binnen ' . $industry . '. Er is nog geen gecontroleerd beeld van de website of interne werkwijze.';
    $firstQuestion = $supported
        ? 'De website laat zien hoe ' . $organizationName . ' zich binnen ' . $industry . ' presenteert. Waar begint een klantvraag in de praktijk meestal, en wat gebeurt er daarna?'
        : 'Waar begint het dagelijkse werk binnen ' . $organizationName . ' in ' . $industry . ' meestal, en welk deel daarvan wil je vandaag beter begrijpen?';
    $contacts[] = ['id' => 'first-visit-picture', 'sourceStatus' => 'provisional-inference', 'kind' => 'provisional-picture', 'content' => $firstPicture, 'observedAt' => $timestamp];
    $contacts[] = [
        'id' => 'first-visit-internal-unknown',
        'sourceStatus' => 'unknown',
        'kind' => 'internal-unknown',
        'content' => $supported ? 'Nog onbekend is hoe de publieke belofte in het dagelijkse werk wordt uitgevoerd.' : 'Nog onbekend zijn de publieke presentatie en de interne werkwijze.',
        'observedAt' => $timestamp,
    ];
    $context = [
        'schemaVersion' => 1,
        'experienceVersion' => '2.0-first-visit-v2',
        'sourceAvailability' => $supported ? 'controlled-public-source' : 'not-observed',
        'contacts' => $contacts,
        'firstPicture' => $firstPicture,
        'firstQuestion' => $firstQuestion,
    ];

    $runtime = atlas_runtime_initial($sessionId, $participantId, $timestamp);
    $contactId = 'contact-1-1';
    $runtime['field']['revision'] = 1;
    $runtime['field']['inquiryFrame']['scope'] = 'Onderzoek met ' . $organizationName . ' binnen ' . $industry . '; publieke context blijft begrensd tot gecontroleerde observaties.';
    $runtime['field']['realityContacts'] = [[
        'id' => $contactId,
        'eventId' => 'first-visit-context-v2',
        'kind' => 'participant-contribution',
        'actorId' => $participantId,
        'directness' => 'self-report',
        'content' => 'Branche: ' . $industry . '. Organisatie: ' . $organizationName . '.' . ($normalizedWebsite ? ' Website door deelnemer opgegeven: ' . $normalizedWebsite . '.' : ' Geen website opgegeven.'),
        'observedAt' => $timestamp,
        'receivedAt' => $timestamp,
        'foundationRefs' => ['F · waarnemen', 'CI · 5', 'CE · 4.15', 'RA-02'],
    ]];
    $runtime['field']['openUnknowns'] = [[
        'id' => 'unknown-1-1',
        'kind' => $supported ? 'external-observation' : 'concrete-event',
        'question' => $firstQuestion,
        'status' => 'asked',
        'openedAtRevision' => 1,
    ]];
    $runtime['field']['attention'] = [
        'focus' => $supported ? 'public-to-internal-reality' : 'organization-reality',
        'reason' => $supported ? 'De gecontroleerde publieke observatie opent een vraag naar de nog onbekende interne uitvoering.' : 'Branche en organisatie geven richting; een concreet werkelijkheidscontact ontbreekt nog.',
        'movement' => 'free-telling',
    ];
    $runtime['field']['meta']['acceptedTransitions'] = 1;
    $runtime['field']['meta']['lastChangeType'] = 'first-visit-context-established';
    $runtime['field']['updatedAt'] = $timestamp;
    $runtime['field']['firstVisitContext'] = $context;
    $decision = [
        'revision' => 1,
        'kind' => 'question',
        'movement' => 'free-telling',
        'kicker' => 'Een eerste gerichte vraag',
        'title' => 'Laten we van het eerste beeld naar de dagelijkse werkelijkheid gaan.',
        'question' => $firstQuestion,
        'prompt' => 'Vertel alleen wat er werkelijk gebeurt. Een kort voorbeeld is genoeg.',
        'reason' => $supported ? 'De vraag verbindt deelnemerinput met een gecontroleerde publieke observatie en opent wat intern nog onbekend is.' : 'De vraag komt uitsluitend voort uit branche en organisatie en opent de ontbrekende dagelijkse werkelijkheid zonder een websitebeeld te verzinnen.',
        'canStop' => true,
        'requiresResponse' => true,
        'uncertainty' => 'glimpse',
        'riskBoundary' => 'Het organisatiebeeld is voorlopig; openbare informatie is geen bewijs van de interne werkwijze.',
        'participantOptions' => ['vertellen', 'corrigeren', 'stoppen'],
        'continuation' => 'internal',
        'foundationRefs' => ['F · waarnemen', 'CI · 5', 'CE · 4.15', 'RA-02'],
    ];
    $runtime['decision'] = $decision;
    $journal = [
        'eventId' => 'first-visit-context-v2',
        'eventType' => 'contribution',
        'baseRevision' => 0,
        'committedRevision' => 1,
        'changeType' => 'first-visit-context-established',
        'gateStatus' => 'accepted',
        'affectedContactIds' => [$contactId],
        'affectedHypothesisIds' => [],
        'foundationRefs' => $decision['foundationRefs'],
        'decision' => $decision,
        'createdAt' => $timestamp,
    ];
    return ['field' => $runtime['field'], 'decision' => $decision, 'context' => $context, 'journalEntry' => $journal];
}
