<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

const EXPERIENCE_VERSION = '6.0-runtime-v1';
const FLOW_RECOMPOSITION_VERSION = '5.0-flow-recomposition-v1';
const LIVING_RESEARCH_LOOP_VERSION = '4.0-living-research-loop-v1';
const CONVERSATION_INSIGHT_VERSION = '3.0-conversation-insight-v1';
const STEP_IDS = ['moment', 'attention', 'energy', 'natural'];
const LIVING_STEP_IDS = ['moment', 'attention'];
const INSIGHT_RECOGNITIONS = ['yes', 'partly', 'not-yet'];
const INSIGHT_TOPICS = ['why', 'evidence', 'customers', 'colleagues', 'begin', 'other'];
const MAX_ANSWER_LENGTH = 1600;
const MAX_OBSERVATION_LENGTH = 2400;

function supports_insight_version(string $version): bool {
    return in_array($version, [FLOW_RECOMPOSITION_VERSION, LIVING_RESEARCH_LOOP_VERSION, CONVERSATION_INSIGHT_VERSION], true);
}

function step_ids_for_version(string $version): array {
    return in_array($version, [FLOW_RECOMPOSITION_VERSION, LIVING_RESEARCH_LOOP_VERSION], true) ? LIVING_STEP_IDS : STEP_IDS;
}

require_once __DIR__ . '/atlas-runtime.php';
require_once __DIR__ . '/first-visit.php';

function respond(mixed $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function api_error(string $message, int $status, string $code): never {
    http_response_code($status);
    echo json_encode(['error' => $message, 'code' => $code], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function now_sql(): string {
    return (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d H:i:s.u');
}

function iso(?string $value): ?string {
    if ($value === null || $value === '') return null;
    return (new DateTimeImmutable($value, new DateTimeZone('UTC')))->format(DateTimeInterface::ATOM);
}

function uuid(): string {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function random_token(): string {
    return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
}

function token_hash(string $token): string {
    return hash('sha256', $token);
}

function clean_text(mixed $value, string $label, int $maximum = MAX_ANSWER_LENGTH, bool $required = true): string {
    if (!is_string($value)) api_error($label . ' heeft geen geldige vorm.', 422, 'INVALID_INPUT');
    $clean = trim(str_replace("\0", '', $value));
    if ($required && $clean === '') api_error($label . ' mag niet leeg zijn.', 422, 'EMPTY_INPUT');
    if (mb_strlen($clean) > $maximum) api_error($label . ' is te lang.', 422, 'INPUT_TOO_LONG');
    return $clean;
}

function body(): array {
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > 12000) api_error('Dit verzoek is groter dan toegestaan.', 413, 'REQUEST_TOO_LARGE');
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) api_error('Het verzoek kon niet veilig worden gelezen.', 400, 'INVALID_JSON');
    return $decoded;
}

function require_api_header(): void {
    if (($_SERVER['HTTP_X_WBD_EXPERIENCE'] ?? '') !== '1') {
        api_error('Dit verzoek hoort niet bij deze Experience.', 400, 'MISSING_REQUEST_MARKER');
    }
}

function require_same_origin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') return;
    $originHost = parse_url($origin, PHP_URL_HOST);
    $requestHost = explode(':', (string)($_SERVER['HTTP_HOST'] ?? ''))[0];
    if (!is_string($originHost) || !hash_equals(strtolower($requestHost), strtolower($originHost))) {
        api_error('Dit verzoek komt niet uit de afgeschermde Experience.', 403, 'ORIGIN_REJECTED');
    }
}

function route_name(): string {
    $path = (string)parse_url((string)($_SERVER['REQUEST_URI'] ?? '/api'), PHP_URL_PATH);
    return trim((string)preg_replace('#^/api/?#', '', $path), '/');
}

$configPath = getenv('EXPERIENCE_CONFIG_PATH') ?: dirname(__DIR__, 2) . '/experience-private/config.php';
if (!is_file($configPath)) api_error('De Experience is nog niet veilig geactiveerd.', 503, 'SERVER_NOT_CONFIGURED');
$config = require $configPath;
if (!is_array($config) || !isset($config['database'], $config['admin_password_hash'])) {
    api_error('De Experience is nog niet veilig geactiveerd.', 503, 'SERVER_NOT_CONFIGURED');
}

try {
    $pdo = new PDO(
        (string)$config['database']['dsn'],
        (string)$config['database']['username'],
        (string)$config['database']['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $pdo->exec("SET time_zone = '+00:00'");
} catch (Throwable $error) {
    error_log('Experience database connection failed: ' . $error->getMessage());
    api_error('De veilige opslag is tijdelijk niet beschikbaar.', 503, 'STORAGE_UNAVAILABLE');
}

require_api_header();
$route = route_name();
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
if ($method !== 'GET') require_same_origin();

function rate_limit(PDO $pdo, string $key, int $maximum, int $windowSeconds): void {
    $hash = hash('sha256', $key);
    $pdo->beginTransaction();
    try {
        $statement = $pdo->prepare('SELECT window_started_at, request_count FROM experience_rate_limits WHERE rate_key = ? FOR UPDATE');
        $statement->execute([$hash]);
        $row = $statement->fetch();
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        if (!$row || $now->getTimestamp() - (new DateTimeImmutable($row['window_started_at'], new DateTimeZone('UTC')))->getTimestamp() >= $windowSeconds) {
            $replace = $pdo->prepare('REPLACE INTO experience_rate_limits (rate_key, window_started_at, request_count) VALUES (?, ?, 1)');
            $replace->execute([$hash, now_sql()]);
        } elseif ((int)$row['request_count'] >= $maximum) {
            $pdo->rollBack();
            api_error('Neem even rust voordat je het opnieuw probeert.', 429, 'RATE_LIMITED');
        } else {
            $update = $pdo->prepare('UPDATE experience_rate_limits SET request_count = request_count + 1 WHERE rate_key = ?');
            $update->execute([$hash]);
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}

function event(PDO $pdo, string $invitationId, ?string $sessionId, string $type, ?string $stepId = null): void {
    $statement = $pdo->prepare('INSERT INTO experience_events (invitation_id, session_id, event_type, step_id, created_at) VALUES (?, ?, ?, ?, ?)');
    $statement->execute([$invitationId, $sessionId, $type, $stepId, now_sql()]);
}

function invitation_public(array $row): array {
    return [
        'id' => $row['id'],
        'description' => $row['description'] ?: null,
        'entryType' => $row['entry_type'] ?? 'personal',
        'participantName' => $row['participant_name'] ?: null,
        'participantRole' => $row['participant_role'] ?: null,
        'participantOrganization' => $row['participant_organization'] ?: null,
        'referralId' => $row['referral_id'] ?: null,
        'status' => $row['status'],
        'createdAt' => iso($row['created_at']),
        'openedAt' => iso($row['opened_at']),
        'startedAt' => iso($row['started_at']),
        'completedAt' => iso($row['completed_at']),
        'lastActiveAt' => iso($row['last_active_at']),
        'expiresAt' => iso($row['expires_at']),
        'revokedAt' => iso($row['revoked_at']),
        'technicalTest' => (bool)$row['technical_test'],
    ];
}

function load_session(PDO $pdo, string $invitationId): ?array {
    $statement = $pdo->prepare('SELECT * FROM experience_sessions WHERE invitation_id = ?');
    $statement->execute([$invitationId]);
    $session = $statement->fetch();
    if (!$session) return null;
    $answers = $pdo->prepare('SELECT step_id, answer, submitted_at FROM experience_answers WHERE session_id = ? ORDER BY submitted_at ASC');
    $answers->execute([$session['id']]);
    $session['answers'] = $answers->fetchAll();
    $reflections = $pdo->prepare('SELECT topic, response, created_at, updated_at FROM experience_reflections WHERE session_id = ? ORDER BY updated_at ASC');
    $reflections->execute([$session['id']]);
    $session['reflections'] = $reflections->fetchAll();
    if ((string)$session['experience_version'] === EXPERIENCE_VERSION) {
        $runtime = $pdo->prepare('SELECT field_json, decision_json FROM experience_runtime_states WHERE session_id = ?');
        $runtime->execute([$session['id']]);
        $runtimeState = $runtime->fetch();
        if ($runtimeState) {
            $session['runtime'] = [
                'field' => json_decode((string)$runtimeState['field_json'], true, 512, JSON_THROW_ON_ERROR),
                'decision' => json_decode((string)$runtimeState['decision_json'], true, 512, JSON_THROW_ON_ERROR),
            ];
        }
    }
    return $session;
}

function session_public(array $session, bool $returned = false): array {
    return [
        'id' => $session['id'],
        'invitationId' => $session['invitation_id'],
        'phase' => $session['phase'],
        'currentStep' => (int)$session['current_step'],
        'answers' => array_map(fn(array $answer): array => [
            'stepId' => $answer['step_id'],
            'answer' => $answer['answer'],
            'submittedAt' => iso($answer['submitted_at']),
        ], $session['answers'] ?? []),
        'insightRecognition' => $session['insight_recognition'] ?: null,
        'activeReflectionTopic' => $session['active_reflection_topic'] ?: null,
        'reflections' => array_map(fn(array $reflection): array => [
            'topic' => $reflection['topic'],
            'response' => $reflection['response'] ?: null,
            'createdAt' => iso($reflection['created_at']),
            'updatedAt' => iso($reflection['updated_at']),
        ], $session['reflections'] ?? []),
        'chosenStepId' => $session['chosen_step_id'] ?: null,
        'workspaceOpened' => (bool)$session['workspace_opened'],
        'version' => $session['experience_version'],
        'startedAt' => iso($session['started_at']),
        'completedAt' => iso($session['completed_at']),
        'lastActiveAt' => iso($session['last_active_at']),
        'returned' => $returned,
        'runtime' => $session['runtime'] ?? null,
    ];
}

function create_runtime_state(PDO $pdo, string $sessionId, string $participantId, string $created): void {
    $runtime = atlas_runtime_initial($sessionId, $participantId, (string)iso($created));
    $statement = $pdo->prepare('INSERT INTO experience_runtime_states (session_id, revision, field_json, decision_json, updated_at) VALUES (?, 0, ?, ?, ?)');
    $statement->execute([
        $sessionId,
        json_encode($runtime['field'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        json_encode($runtime['decision'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        $created,
    ]);
}

function participant_state(PDO $pdo, array $invitation, bool $returned = false): array {
    return [
        'invitationId' => $invitation['id'],
        'participantId' => ($invitation['entry_type'] ?? 'personal') === 'organic' ? $invitation['id'] : null,
        'invitationStatus' => $invitation['status'],
        'entryType' => $invitation['entry_type'] ?? 'personal',
        'description' => $invitation['description'] ?: null,
        'participantName' => $invitation['participant_name'] ?: null,
        'participantRole' => $invitation['participant_role'] ?: null,
        'participantOrganization' => $invitation['participant_organization'] ?: null,
        'referralId' => $invitation['referral_id'] ?: null,
        'expiresAt' => iso($invitation['expires_at']),
        'session' => (($session = load_session($pdo, $invitation['id'])) ? session_public($session, $returned) : null),
    ];
}

function participant_context(PDO $pdo, array $config, ?string $expectedEntryType = null): array {
    $cookieName = (string)($config['participant_cookie_name'] ?? 'wbd_experience_access');
    $credential = (string)($_COOKIE[$cookieName] ?? '');
    if ($credential === '') api_error('Open je beveiligde persoonlijke toegang om verder te gaan.', 401, 'INVITATION_REQUIRED');
    $statement = $pdo->prepare('SELECT i.* FROM experience_participant_access a JOIN experience_invitations i ON i.id = a.invitation_id WHERE a.token_hash = ? AND a.expires_at > ?');
    $statement->execute([token_hash($credential), now_sql()]);
    $invitation = $statement->fetch();
    if (!$invitation) api_error('Deze persoonlijke toegang is niet meer geldig. Open de volledige link opnieuw.', 401, 'ACCESS_EXPIRED');
    if ($expectedEntryType !== null && ($invitation['entry_type'] ?? 'personal') !== $expectedEntryType) {
        api_error('Deze toegang hoort bij een andere Experience-ingang.', 404, 'ENTRY_TYPE_MISMATCH');
    }
    if ($invitation['status'] === 'revoked' || $invitation['revoked_at']) api_error('Deze persoonlijke toegang is niet meer actief.', 410, 'INVITATION_REVOKED');
    if ($invitation['expires_at'] && new DateTimeImmutable($invitation['expires_at'], new DateTimeZone('UTC')) < new DateTimeImmutable('now', new DateTimeZone('UTC'))) {
        api_error('Deze persoonlijke toegang is verlopen.', 410, 'INVITATION_EXPIRED');
    }
    $touch = $pdo->prepare('UPDATE experience_participant_access SET last_used_at = ? WHERE token_hash = ?');
    $touch->execute([now_sql(), token_hash($credential)]);
    return $invitation;
}

function set_participant_cookie(array $config, string $credential): void {
    setcookie((string)($config['participant_cookie_name'] ?? 'wbd_experience_access'), $credential, [
        'expires' => time() + 60 * 60 * 24 * 30,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function clear_participant_cookie(array $config): void {
    setcookie((string)($config['participant_cookie_name'] ?? 'wbd_experience_access'), '', [
        'expires' => 1,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function touch_invitation(PDO $pdo, string $invitationId): void {
    $statement = $pdo->prepare('UPDATE experience_invitations SET last_active_at = ? WHERE id = ?');
    $statement->execute([now_sql(), $invitationId]);
}

function start_admin_session(array $config): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name((string)($config['admin_session_name'] ?? 'wbd_experience_observatory'));
    session_set_cookie_params([
        'lifetime' => 60 * 60 * 8,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function require_admin(array $config): void {
    start_admin_session($config);
    if (($_SESSION['experience_admin'] ?? false) !== true) api_error('Meld je eerst veilig aan.', 401, 'ADMIN_REQUIRED');
}

try {
    if ($route === 'participant/first-visit/create' && $method === 'POST') {
        $input = body();
        $industry = clean_text($input['industry'] ?? '', 'De branche', 180);
        $organizationName = clean_text($input['organizationName'] ?? '', 'De organisatie', 180);
        $website = clean_text($input['websiteUrl'] ?? '', 'De website', 240, false);
        $remoteAddress = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        rate_limit($pdo, 'first-visit-create:' . $remoteAddress, 12, 3600);

        $invitationId = uuid();
        $sessionId = uuid();
        $inviteToken = random_token();
        $created = now_sql();
        $createdIso = (string)iso($created);
        $runtime = first_visit_runtime($sessionId, $invitationId, $industry, $organizationName, $website, $createdIso, __DIR__ . '/first-visit-snapshot.json');
        $eventData = [
            'id' => 'first-visit-context-v2',
            'type' => 'contribution',
            'inquiryId' => $sessionId,
            'actorId' => $invitationId,
            'content' => 'Branche: ' . $industry . '. Organisatie: ' . $organizationName . '.',
            'observedAt' => $createdIso,
            'receivedAt' => $createdIso,
            'baseRevision' => 0,
        ];
        $expires = (new DateTimeImmutable('+30 days', new DateTimeZone('UTC')))->format('Y-m-d H:i:s.u');
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO experience_invitations (id, token_hash, description, entry_type, participant_organization, status, technical_test, created_at, opened_at, started_at, last_active_at, expires_at) VALUES (?, ?, 'first-visit-v2', 'personal', ?, 'started', 0, ?, NULL, ?, ?, ?)")->execute([
                $invitationId, token_hash($inviteToken), $organizationName, $created, $created, $created, $expires,
            ]);
            $pdo->prepare("INSERT INTO experience_sessions (id, invitation_id, phase, current_step, workspace_opened, experience_version, started_at, last_active_at) VALUES (?, ?, 'runtime', 0, 0, ?, ?, ?)")->execute([$sessionId, $invitationId, EXPERIENCE_VERSION, $created, $created]);
            $pdo->prepare('INSERT INTO experience_runtime_states (session_id, revision, field_json, decision_json, updated_at) VALUES (?, 1, ?, ?, ?)')->execute([
                $sessionId,
                json_encode($runtime['field'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                json_encode($runtime['decision'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                $created,
            ]);
            $pdo->prepare('INSERT INTO experience_runtime_journal (session_id, event_id, base_revision, committed_revision, event_json, transition_json, created_at) VALUES (?, ?, 0, 1, ?, ?, ?)')->execute([
                $sessionId,
                'first-visit-context-v2',
                json_encode($eventData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                json_encode($runtime['journalEntry'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                $created,
            ]);
            event($pdo, $invitationId, $sessionId, 'experience_started');
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        respond(['token' => $inviteToken, 'context' => $runtime['context']], 201);
    }

    if ($route === 'participant/organic/create' && $method === 'POST') {
        $input = body();
        $name = clean_text($input['name'] ?? '', 'Je naam', 120);
        $role = clean_text($input['role'] ?? '', 'Je functie', 120, false);
        $organization = clean_text($input['organization'] ?? '', 'Je bedrijf', 160, false);
        $referralId = clean_text($input['referralId'] ?? '', 'De herkomst', 96, false);
        if ($referralId !== '' && !preg_match('/^[A-Za-z0-9_-]+$/', $referralId)) {
            api_error('De gedeelde route heeft geen geldige vorm.', 422, 'INVALID_REFERRAL');
        }
        $technicalTest = ($input['technicalTest'] ?? false) === true && str_starts_with($referralId, 'acceptance-');
        $remoteAddress = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
        rate_limit($pdo, 'organic-create:' . $remoteAddress, 12, 3600);

        $invitationId = uuid();
        $sessionId = uuid();
        $credential = random_token();
        $created = now_sql();
        $expires = (new DateTimeImmutable('+30 days', new DateTimeZone('UTC')))->format('Y-m-d H:i:s.u');
        $pdo->beginTransaction();
        try {
            $pdo->prepare("INSERT INTO experience_invitations (id, token_hash, description, entry_type, participant_name, participant_role, participant_organization, referral_id, status, technical_test, created_at, opened_at, started_at, last_active_at) VALUES (?, ?, NULL, 'organic', ?, ?, ?, ?, 'started', ?, ?, ?, ?, ?)")->execute([
                $invitationId,
                token_hash(random_token()),
                $name,
                $role ?: null,
                $organization ?: null,
                $referralId ?: null,
                $technicalTest ? 1 : 0,
                $created,
                $created,
                $created,
                $created,
            ]);
            $pdo->prepare("INSERT INTO experience_sessions (id, invitation_id, phase, current_step, workspace_opened, experience_version, started_at, last_active_at) VALUES (?, ?, 'runtime', 0, 0, ?, ?, ?)")->execute([$sessionId, $invitationId, EXPERIENCE_VERSION, $created, $created]);
            create_runtime_state($pdo, $sessionId, $invitationId, $created);
            $pdo->prepare('INSERT INTO experience_participant_access (id, invitation_id, token_hash, created_at, last_used_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')->execute([
                uuid(), $invitationId, token_hash($credential), $created, $created, $expires,
            ]);
            event($pdo, $invitationId, $sessionId, 'organic_entry_created');
            if ($referralId !== '') event($pdo, $invitationId, $sessionId, 'organic_shared_entry_created');
            event($pdo, $invitationId, $sessionId, 'experience_started');
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
        set_participant_cookie($config, $credential);
        $statement = $pdo->prepare('SELECT * FROM experience_invitations WHERE id = ?');
        $statement->execute([$invitationId]);
        respond(participant_state($pdo, $statement->fetch()), 201);
    }

    if ($route === 'participant/organic/state' && $method === 'GET') {
        $invitation = participant_context($pdo, $config, 'organic');
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/organic/resume' && $method === 'POST') {
        $invitation = participant_context($pdo, $config, 'organic');
        $session = load_session($pdo, $invitation['id']);
        if (!$session) api_error('Deze Experience kan niet worden hervat.', 409, 'SESSION_REQUIRED');
        event($pdo, $invitation['id'], $session['id'], 'organic_participant_resumed');
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation, true));
    }

    if ($route === 'participant/organic/release' && $method === 'POST') {
        $cookieName = (string)($config['participant_cookie_name'] ?? 'wbd_experience_access');
        $credential = (string)($_COOKIE[$cookieName] ?? '');
        if ($credential !== '') {
            $delete = $pdo->prepare("DELETE a FROM experience_participant_access a JOIN experience_invitations i ON i.id = a.invitation_id WHERE a.token_hash = ? AND i.entry_type = 'organic'");
            $delete->execute([token_hash($credential)]);
        }
        clear_participant_cookie($config);
        respond(null);
    }

    if ($route === 'participant/exchange' && $method === 'POST') {
        $input = body();
        $token = clean_text($input['token'] ?? '', 'De toegangscode', 180);
        rate_limit($pdo, 'exchange:' . token_hash($token), 20, 900);
        $statement = $pdo->prepare("SELECT * FROM experience_invitations WHERE token_hash = ? AND entry_type = 'personal'");
        $statement->execute([token_hash($token)]);
        $invitation = $statement->fetch();
        if (!$invitation) api_error('Deze persoonlijke toegang is niet geldig.', 404, 'INVITATION_NOT_FOUND');
        if ($invitation['status'] === 'revoked' || $invitation['revoked_at']) api_error('Deze persoonlijke toegang is niet meer actief.', 410, 'INVITATION_REVOKED');
        if ($invitation['expires_at'] && new DateTimeImmutable($invitation['expires_at'], new DateTimeZone('UTC')) < new DateTimeImmutable('now', new DateTimeZone('UTC'))) {
            api_error('Deze persoonlijke toegang is verlopen.', 410, 'INVITATION_EXPIRED');
        }

        $credential = random_token();
        $expires = (new DateTimeImmutable('+30 days', new DateTimeZone('UTC')))->format('Y-m-d H:i:s.u');
        $access = $pdo->prepare('INSERT INTO experience_participant_access (id, invitation_id, token_hash, created_at, last_used_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)');
        $access->execute([uuid(), $invitation['id'], token_hash($credential), now_sql(), now_sql(), $expires]);
        $pdo->prepare('DELETE FROM experience_participant_access WHERE invitation_id = ? AND expires_at <= ?')->execute([$invitation['id'], now_sql()]);
        set_participant_cookie($config, $credential);

        $returned = false;
        $session = load_session($pdo, $invitation['id']);
        if ($session && $session['completed_at']) {
            event($pdo, $invitation['id'], $session['id'], 'experience_returned');
            $returned = true;
        } elseif (!$invitation['opened_at']) {
            event($pdo, $invitation['id'], null, 'invitation_opened');
        }
        $status = $invitation['status'] === 'created' ? 'opened' : $invitation['status'];
        $openedAt = $invitation['opened_at'] ?: now_sql();
        $pdo->prepare('UPDATE experience_invitations SET status = ?, opened_at = ?, last_active_at = ? WHERE id = ?')->execute([$status, $openedAt, now_sql(), $invitation['id']]);
        $invitation['status'] = $status;
        $invitation['opened_at'] = $openedAt;
        respond(participant_state($pdo, $invitation, $returned));
    }

    if ($route === 'participant/state' && $method === 'GET') {
        $invitation = participant_context($pdo, $config, 'personal');
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/start' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        rate_limit($pdo, 'participant:' . $invitation['id'], 80, 900);
        $existing = load_session($pdo, $invitation['id']);
        if (!$existing) {
            $sessionId = uuid();
            $created = now_sql();
            $pdo->beginTransaction();
            $pdo->prepare('INSERT INTO experience_sessions (id, invitation_id, phase, current_step, workspace_opened, experience_version, started_at, last_active_at) VALUES (?, ?, ?, 0, 0, ?, ?, ?)')->execute([$sessionId, $invitation['id'], 'runtime', EXPERIENCE_VERSION, $created, $created]);
            create_runtime_state($pdo, $sessionId, $invitation['id'], $created);
            event($pdo, $invitation['id'], $sessionId, 'experience_started');
            $pdo->prepare("UPDATE experience_invitations SET status = 'started', started_at = COALESCE(started_at, ?), last_active_at = ? WHERE id = ?")->execute([now_sql(), now_sql(), $invitation['id']]);
            $pdo->commit();
            $invitation['status'] = 'started';
        }
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/runtime/contribute' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        rate_limit($pdo, 'participant:' . $invitation['id'], 80, 900);
        $input = body();
        $eventId = clean_text($input['eventId'] ?? '', 'De bijdragecode', 96);
        $content = clean_text($input['content'] ?? '', 'Je bijdrage');
        $observedAt = clean_text($input['observedAt'] ?? '', 'Het tijdstip', 64);
        $baseRevision = filter_var($input['baseRevision'] ?? null, FILTER_VALIDATE_INT);
        if ($baseRevision === false || $baseRevision < 0) api_error('De revisie heeft geen geldige vorm.', 422, 'RUNTIME_INVALID_REVISION');
        $pdo->beginTransaction();
        try {
            $sessionStatement = $pdo->prepare('SELECT * FROM experience_sessions WHERE invitation_id = ? FOR UPDATE');
            $sessionStatement->execute([$invitation['id']]);
            $session = $sessionStatement->fetch();
            if (!$session || $session['experience_version'] !== EXPERIENCE_VERSION || $session['phase'] !== 'runtime') {
                $pdo->rollBack(); api_error('Deze bijdrage hoort niet bij een actieve Runtime-sessie.', 409, 'RUNTIME_NOT_ACTIVE');
            }
            $duplicate = $pdo->prepare('SELECT id FROM experience_runtime_journal WHERE session_id = ? AND event_id = ?');
            $duplicate->execute([$session['id'], $eventId]);
            if ($duplicate->fetch()) { $pdo->commit(); respond(participant_state($pdo, $invitation)); }
            $runtimeStatement = $pdo->prepare('SELECT revision, field_json, decision_json FROM experience_runtime_states WHERE session_id = ? FOR UPDATE');
            $runtimeStatement->execute([$session['id']]);
            $stored = $runtimeStatement->fetch();
            if (!$stored) { $pdo->rollBack(); api_error('De cognitieve toestand ontbreekt. Er is niets gewijzigd.', 409, 'RUNTIME_STATE_MISSING'); }
            if ((int)$stored['revision'] !== $baseRevision) { $pdo->rollBack(); api_error('Het gesprek is intussen gewijzigd. De actuele toestand is opnieuw geladen.', 409, 'RUNTIME_STALE_REVISION'); }
            $receivedSql = now_sql(); $receivedAt = (string)iso($receivedSql);
            $eventData = ['id' => $eventId, 'type' => 'contribution', 'inquiryId' => $session['id'], 'actorId' => $invitation['id'], 'content' => $content, 'observedAt' => $observedAt, 'receivedAt' => $receivedAt, 'baseRevision' => $baseRevision];
            $transition = atlas_runtime_transition(json_decode((string)$stored['field_json'], true, 512, JSON_THROW_ON_ERROR), $eventData);
            $pdo->prepare('UPDATE experience_runtime_states SET revision = ?, field_json = ?, decision_json = ?, updated_at = ? WHERE session_id = ? AND revision = ?')->execute([
                $transition['field']['revision'],
                json_encode($transition['field'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                json_encode($transition['decision'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                $receivedSql, $session['id'], $baseRevision,
            ]);
            $pdo->prepare('INSERT INTO experience_runtime_journal (session_id, event_id, base_revision, committed_revision, event_json, transition_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([
                $session['id'], $eventId, $baseRevision, $transition['field']['revision'],
                json_encode($eventData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
                json_encode($transition['journalEntry'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), $receivedSql,
            ]);
            $pdo->prepare('UPDATE experience_sessions SET last_active_at = ? WHERE id = ?')->execute([$receivedSql, $session['id']]);
            event($pdo, $invitation['id'], $session['id'], 'runtime_transition_committed', $transition['decision']['movement']);
            if ($transition['journalEntry']['gateStatus'] === 'external-correction-required') event($pdo, $invitation['id'], $session['id'], 'runtime_external_correction_required', $transition['decision']['movement']);
            touch_invitation($pdo, $invitation['id']);
            $pdo->commit();
            respond(participant_state($pdo, $invitation));
        } catch (RuntimeException $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            if ($error->getMessage() === 'RUNTIME_STALE_REVISION') api_error('Het gesprek is intussen gewijzigd. De actuele toestand is opnieuw geladen.', 409, 'RUNTIME_STALE_REVISION');
            api_error('Deze bijdrage kon niet veilig worden verwerkt.', 422, $error->getMessage());
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }

    if ($route === 'participant/runtime/resume' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $pdo->beginTransaction();
        try {
            $sessionStatement = $pdo->prepare('SELECT * FROM experience_sessions WHERE invitation_id = ? FOR UPDATE');
            $sessionStatement->execute([$invitation['id']]); $session = $sessionStatement->fetch();
            if (!$session || $session['experience_version'] !== EXPERIENCE_VERSION || $session['phase'] !== 'completed') { $pdo->rollBack(); api_error('Dit onderzoek kan nu niet worden hervat.', 409, 'RUNTIME_NOT_RESUMABLE'); }
            $runtimeStatement = $pdo->prepare('SELECT revision, field_json FROM experience_runtime_states WHERE session_id = ? FOR UPDATE');
            $runtimeStatement->execute([$session['id']]); $stored = $runtimeStatement->fetch();
            if (!$stored) { $pdo->rollBack(); api_error('De cognitieve toestand ontbreekt. Er is niets gewijzigd.', 409, 'RUNTIME_STATE_MISSING'); }
            $timestamp = now_sql(); $receivedAt = (string)iso($timestamp); $eventId = uuid();
            $eventData = ['id' => $eventId, 'type' => 'resume', 'inquiryId' => $session['id'], 'actorId' => $invitation['id'], 'observedAt' => $receivedAt, 'receivedAt' => $receivedAt, 'baseRevision' => (int)$stored['revision']];
            $transition = atlas_runtime_resume(json_decode((string)$stored['field_json'], true, 512, JSON_THROW_ON_ERROR), $eventData);
            $pdo->prepare('UPDATE experience_runtime_states SET revision = ?, field_json = ?, decision_json = ?, updated_at = ? WHERE session_id = ? AND revision = ?')->execute([
                $transition['field']['revision'], json_encode($transition['field'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), json_encode($transition['decision'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), $timestamp, $session['id'], $stored['revision'],
            ]);
            $pdo->prepare('INSERT INTO experience_runtime_journal (session_id, event_id, base_revision, committed_revision, event_json, transition_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([
                $session['id'], $eventId, $stored['revision'], $transition['field']['revision'], json_encode($eventData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), json_encode($transition['journalEntry'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), $timestamp,
            ]);
            $pdo->prepare("UPDATE experience_sessions SET phase = 'runtime', completed_at = NULL, last_active_at = ? WHERE id = ?")->execute([$timestamp, $session['id']]);
            $pdo->prepare("UPDATE experience_invitations SET status = 'started', completed_at = NULL, last_active_at = ? WHERE id = ?")->execute([$timestamp, $invitation['id']]);
            event($pdo, $invitation['id'], $session['id'], 'experience_returned', $transition['decision']['movement']);
            $pdo->commit();
            $invitation['status'] = 'started'; $invitation['completed_at'] = null;
            respond(participant_state($pdo, $invitation, true));
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }

    if ($route === 'participant/answer' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        rate_limit($pdo, 'participant:' . $invitation['id'], 80, 900);
        $input = body();
        $stepId = clean_text($input['stepId'] ?? '', 'De vraag', 24);
        $answer = clean_text($input['answer'] ?? '', 'Je antwoord');
        $session = load_session($pdo, $invitation['id']);
        if (!$session || $session['phase'] !== 'question') api_error('Deze vraag is nu niet aan de beurt.', 409, 'INVALID_PHASE');
        $expected = step_ids_for_version((string)$session['experience_version'])[(int)$session['current_step']] ?? null;
        if ($expected !== $stepId) api_error('Deze vraag is nu niet aan de beurt.', 409, 'UNEXPECTED_STEP');
        $pdo->prepare('INSERT INTO experience_answers (session_id, step_id, answer, submitted_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE answer = VALUES(answer), submitted_at = VALUES(submitted_at)')->execute([$session['id'], $stepId, $answer, now_sql()]);
        if ((string)$session['experience_version'] === FLOW_RECOMPOSITION_VERSION) {
            $current = (int)$session['current_step'];
            if ($current >= count(LIVING_STEP_IDS) - 1) {
                $pdo->prepare("UPDATE experience_sessions SET phase = 'insight', last_active_at = ? WHERE id = ?")->execute([now_sql(), $session['id']]);
            } else {
                $pdo->prepare("UPDATE experience_sessions SET phase = 'question', current_step = ?, last_active_at = ? WHERE id = ?")->execute([$current + 1, now_sql(), $session['id']]);
            }
        } else {
            $pdo->prepare("UPDATE experience_sessions SET phase = 'listening', last_active_at = ? WHERE id = ?")->execute([now_sql(), $session['id']]);
        }
        event($pdo, $invitation['id'], $session['id'], 'question_answered', $stepId);
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/continue' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $session = load_session($pdo, $invitation['id']);
        if (!$session || $session['phase'] !== 'listening') api_error('Deze overgang is nu niet beschikbaar.', 409, 'INVALID_PHASE');
        $current = (int)$session['current_step'];
        $stepIds = step_ids_for_version((string)$session['experience_version']);
        if ($current >= count($stepIds) - 1) {
            $pdo->prepare("UPDATE experience_sessions SET phase = 'summary', last_active_at = ? WHERE id = ?")->execute([now_sql(), $session['id']]);
        } else {
            $pdo->prepare("UPDATE experience_sessions SET phase = 'question', current_step = ?, last_active_at = ? WHERE id = ?")->execute([$current + 1, now_sql(), $session['id']]);
        }
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/answer/edit' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $input = body();
        $stepId = clean_text($input['stepId'] ?? '', 'De vraag', 24);
        $answer = clean_text($input['answer'] ?? '', 'Je antwoord');
        if (!in_array($stepId, STEP_IDS, true)) api_error('Dit moment bestaat niet.', 422, 'INVALID_STEP');
        $session = load_session($pdo, $invitation['id']);
        if (!$session || $session['phase'] !== 'summary') api_error('Je woorden kunnen nu niet worden aangepast.', 409, 'INVALID_PHASE');
        $pdo->prepare('UPDATE experience_answers SET answer = ?, submitted_at = ? WHERE session_id = ? AND step_id = ?')->execute([$answer, now_sql(), $session['id'], $stepId]);
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/summary/confirm' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $session = load_session($pdo, $invitation['id']);
        if (!$session || $session['phase'] !== 'summary') api_error('De samenvatting is nu niet beschikbaar.', 409, 'INVALID_PHASE');
        $nextPhase = supports_insight_version((string)$session['experience_version']) ? 'insight' : 'choice';
        $pdo->prepare('UPDATE experience_sessions SET phase = ?, last_active_at = ? WHERE id = ?')->execute([$nextPhase, now_sql(), $session['id']]);
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/insight/recognition' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $input = body();
        $recognition = clean_text($input['recognition'] ?? '', 'Je herkenning', 16);
        if (!in_array($recognition, INSIGHT_RECOGNITIONS, true)) api_error('Kies of je dit herkent.', 422, 'INVALID_RECOGNITION');
        $session = load_session($pdo, $invitation['id']);
        if (!$session || $session['phase'] !== 'insight' || !supports_insight_version((string)$session['experience_version'])) api_error('Dit inzicht is nu niet beschikbaar.', 409, 'INVALID_PHASE');
        $pdo->prepare("UPDATE experience_sessions SET phase = 'explore', insight_recognition = ?, active_reflection_topic = NULL, last_active_at = ? WHERE id = ?")->execute([$recognition, now_sql(), $session['id']]);
        event($pdo, $invitation['id'], $session['id'], 'insight_recognized', $recognition);
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/insight/explore' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $input = body();
        $topic = clean_text($input['topic'] ?? '', 'Het onderwerp', 24);
        if (!in_array($topic, INSIGHT_TOPICS, true)) api_error('Dit onderwerp bestaat niet.', 422, 'INVALID_INSIGHT_TOPIC');
        $response = clean_text($input['response'] ?? '', 'Je verdere gedachte', MAX_ANSWER_LENGTH, false);
        $session = load_session($pdo, $invitation['id']);
        if (!$session || $session['phase'] !== 'explore' || !supports_insight_version((string)$session['experience_version'])) api_error('Deze verdieping is nu niet beschikbaar.', 409, 'INVALID_PHASE');
        $created = now_sql();
        $pdo->prepare('INSERT INTO experience_reflections (id, session_id, topic, response, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE response = IF(VALUES(response) IS NULL, response, VALUES(response)), updated_at = VALUES(updated_at)')->execute([
            uuid(), $session['id'], $topic, $response !== '' ? $response : null, $created, $created,
        ]);
        $pdo->prepare('UPDATE experience_sessions SET active_reflection_topic = ?, last_active_at = ? WHERE id = ?')->execute([$topic, $created, $session['id']]);
        event($pdo, $invitation['id'], $session['id'], $response !== '' ? 'insight_reflection_saved' : 'insight_explored', $topic);
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/insight/finish' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $session = load_session($pdo, $invitation['id']);
        if (!$session || !in_array($session['phase'], ['insight', 'explore'], true) || !supports_insight_version((string)$session['experience_version'])) api_error('Deze overgang is nu niet beschikbaar.', 409, 'INVALID_PHASE');
        $pdo->prepare("UPDATE experience_sessions SET phase = 'choice', active_reflection_topic = NULL, last_active_at = ? WHERE id = ?")->execute([now_sql(), $session['id']]);
        event($pdo, $invitation['id'], $session['id'], 'insight_exploration_finished');
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/choice' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $input = body();
        $stepId = clean_text($input['stepId'] ?? '', 'Je keuze', 24);
        if (!in_array($stepId, STEP_IDS, true)) api_error('Kies één van je eigen momenten.', 422, 'INVALID_STEP');
        $session = load_session($pdo, $invitation['id']);
        if (!$session || $session['phase'] !== 'choice') api_error('Deze keuze is nu niet beschikbaar.', 409, 'INVALID_PHASE');
        $pdo->prepare('UPDATE experience_sessions SET chosen_step_id = ?, last_active_at = ? WHERE id = ?')->execute([$stepId, now_sql(), $session['id']]);
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/summary/back' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $session = load_session($pdo, $invitation['id']);
        if (!$session) api_error('Er is nog geen Experience om terug te kijken.', 409, 'SESSION_REQUIRED');
        $pdo->prepare("UPDATE experience_sessions SET phase = 'summary', last_active_at = ? WHERE id = ?")->execute([now_sql(), $session['id']]);
        touch_invitation($pdo, $invitation['id']);
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/workspace' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $session = load_session($pdo, $invitation['id']);
        if (!$session || $session['phase'] !== 'choice' || !$session['chosen_step_id']) api_error('Kies eerst wat je wilt bewaren.', 409, 'CHOICE_REQUIRED');
        $completed = now_sql();
        $pdo->prepare("UPDATE experience_sessions SET phase = 'workspace', workspace_opened = 1, completed_at = COALESCE(completed_at, ?), last_active_at = ? WHERE id = ?")->execute([$completed, $completed, $session['id']]);
        event($pdo, $invitation['id'], $session['id'], 'workspace_opened');
        event($pdo, $invitation['id'], $session['id'], 'experience_completed');
        $pdo->prepare("UPDATE experience_invitations SET status = 'completed', completed_at = COALESCE(completed_at, ?), last_active_at = ? WHERE id = ?")->execute([$completed, $completed, $invitation['id']]);
        $invitation['status'] = 'completed';
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/finish' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        $session = load_session($pdo, $invitation['id']);
        if (!$session) api_error('Er is nog geen Experience om af te ronden.', 409, 'SESSION_REQUIRED');
        $completed = now_sql();
        $pdo->prepare("UPDATE experience_sessions SET phase = 'completed', completed_at = COALESCE(completed_at, ?), last_active_at = ? WHERE id = ?")->execute([$completed, $completed, $session['id']]);
        event($pdo, $invitation['id'], $session['id'], 'experience_completed');
        $pdo->prepare("UPDATE experience_invitations SET status = 'completed', completed_at = COALESCE(completed_at, ?), last_active_at = ? WHERE id = ?")->execute([$completed, $completed, $invitation['id']]);
        $invitation['status'] = 'completed';
        respond(participant_state($pdo, $invitation));
    }

    if ($route === 'participant/feedback' && $method === 'POST') {
        $invitation = participant_context($pdo, $config);
        rate_limit($pdo, 'feedback:' . $invitation['id'], 10, 3600);
        $session = load_session($pdo, $invitation['id']);
        if (!$session) api_error('Begin eerst aan je Experience.', 409, 'SESSION_REQUIRED');
        $input = body();
        $pdo->prepare('INSERT INTO experience_feedback (id, session_id, expected, happened, `natural`, created_at) VALUES (?, ?, ?, ?, ?, ?)')->execute([
            uuid(), $session['id'], clean_text($input['expected'] ?? '', 'Wat je verwachtte'), clean_text($input['happened'] ?? '', 'Wat er gebeurde'), clean_text($input['natural'] ?? '', 'Wat natuurlijker zou voelen'), now_sql(),
        ]);
        event($pdo, $invitation['id'], $session['id'], 'feedback_submitted');
        touch_invitation($pdo, $invitation['id']);
        respond(null, 201);
    }

    if ($route === 'participant/session' && $method === 'DELETE') {
        $invitation = participant_context($pdo, $config);
        $input = body();
        if (($input['confirm'] ?? '') !== 'VERWIJDER MIJN SESSIE') api_error('Bevestig de verwijdering opnieuw.', 422, 'CONFIRMATION_REQUIRED');
        $pdo->beginTransaction();
        $pdo->prepare('DELETE FROM experience_sessions WHERE invitation_id = ?')->execute([$invitation['id']]);
        $pdo->prepare('DELETE FROM experience_observations WHERE invitation_id = ?')->execute([$invitation['id']]);
        $pdo->prepare('DELETE FROM experience_events WHERE invitation_id = ?')->execute([$invitation['id']]);
        $pdo->prepare("UPDATE experience_invitations SET status = 'revoked', revoked_at = ?, last_active_at = ? WHERE id = ?")->execute([now_sql(), now_sql(), $invitation['id']]);
        $pdo->prepare('DELETE FROM experience_participant_access WHERE invitation_id = ?')->execute([$invitation['id']]);
        $pdo->commit();
        clear_participant_cookie($config);
        respond(null);
    }

    if ($route === 'admin/login' && $method === 'POST') {
        rate_limit($pdo, 'admin-login', 8, 900);
        $input = body();
        $password = clean_text($input['password'] ?? '', 'Het beheerwachtwoord', 256);
        if (!password_verify($password, (string)$config['admin_password_hash'])) {
            api_error('Het beheerwachtwoord is niet juist.', 401, 'INVALID_ADMIN_CREDENTIALS');
        }
        start_admin_session($config);
        session_regenerate_id(true);
        $_SESSION['experience_admin'] = true;
        $_SESSION['authenticated_at'] = time();
        respond(null);
    }

    if ($route === 'admin/logout' && $method === 'POST') {
        start_admin_session($config);
        $_SESSION = [];
        session_destroy();
        respond(null);
    }

    if (str_starts_with($route, 'admin/')) require_admin($config);

    if ($route === 'admin/overview' && $method === 'GET') {
        $counts = [
            'invitations' => (int)$pdo->query('SELECT COUNT(*) FROM experience_invitations')->fetchColumn(),
            'organicEntries' => (int)$pdo->query("SELECT COUNT(*) FROM experience_invitations WHERE entry_type = 'organic'")->fetchColumn(),
            'organicStarted' => (int)$pdo->query("SELECT COUNT(*) FROM experience_invitations WHERE entry_type = 'organic' AND started_at IS NOT NULL")->fetchColumn(),
            'organicResumed' => (int)$pdo->query("SELECT COUNT(DISTINCT invitation_id) FROM experience_events WHERE event_type = 'organic_participant_resumed'")->fetchColumn(),
            'sharedEntries' => (int)$pdo->query("SELECT COUNT(*) FROM experience_invitations WHERE entry_type = 'organic' AND referral_id IS NOT NULL")->fetchColumn(),
            'opened' => (int)$pdo->query("SELECT COUNT(*) FROM experience_invitations WHERE opened_at IS NOT NULL")->fetchColumn(),
            'started' => (int)$pdo->query("SELECT COUNT(*) FROM experience_invitations WHERE started_at IS NOT NULL")->fetchColumn(),
            'completed' => (int)$pdo->query("SELECT COUNT(*) FROM experience_invitations WHERE completed_at IS NOT NULL")->fetchColumn(),
            'returned' => (int)$pdo->query("SELECT COUNT(DISTINCT invitation_id) FROM experience_events WHERE event_type IN ('experience_returned', 'organic_participant_resumed')")->fetchColumn(),
            'feedback' => (int)$pdo->query('SELECT COUNT(*) FROM experience_feedback')->fetchColumn(),
            'lastActivity' => iso($pdo->query('SELECT MAX(last_active_at) FROM experience_invitations')->fetchColumn() ?: null),
        ];
        $rows = $pdo->query('SELECT * FROM experience_invitations ORDER BY COALESCE(last_active_at, created_at) DESC')->fetchAll();
        respond(['counts' => $counts, 'invitations' => array_map('invitation_public', $rows)]);
    }

    if ($route === 'admin/invitations' && $method === 'POST') {
        $input = body();
        $description = clean_text($input['description'] ?? '', 'De interne omschrijving', 120, false);
        $technicalTest = ($input['technicalTest'] ?? false) === true;
        $expiresAt = null;
        if (is_string($input['expiresAt'] ?? null) && trim($input['expiresAt']) !== '') {
            try {
                $expiresAt = (new DateTimeImmutable($input['expiresAt']))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.u');
            } catch (Throwable) {
                api_error('De vervaldatum is niet geldig.', 422, 'INVALID_EXPIRY');
            }
        }
        $token = random_token();
        $id = uuid();
        $pdo->prepare("INSERT INTO experience_invitations (id, token_hash, description, status, technical_test, created_at) VALUES (?, ?, ?, 'created', ?, ?)")->execute([$id, token_hash($token), $description ?: null, $technicalTest ? 1 : 0, now_sql()]);
        if ($expiresAt) $pdo->prepare('UPDATE experience_invitations SET expires_at = ? WHERE id = ?')->execute([$expiresAt, $id]);
        $row = $pdo->prepare('SELECT * FROM experience_invitations WHERE id = ?');
        $row->execute([$id]);
        $baseUrl = rtrim((string)($config['base_url'] ?? 'https://experience.webuildanddesign.nl'), '/');
        respond(['invitation' => invitation_public($row->fetch()), 'url' => $baseUrl . '/e/#' . rawurlencode($token)], 201);
    }

    if (preg_match('#^admin/invitations/([0-9a-f-]{36})$#', $route, $match) && $method === 'GET') {
        $statement = $pdo->prepare('SELECT * FROM experience_invitations WHERE id = ?');
        $statement->execute([$match[1]]);
        $invitation = $statement->fetch();
        if (!$invitation) api_error('Deze Experience bestaat niet.', 404, 'INVITATION_NOT_FOUND');
        $session = load_session($pdo, $invitation['id']);
        $events = $pdo->prepare('SELECT id, event_type, step_id, created_at FROM experience_events WHERE invitation_id = ? ORDER BY created_at ASC, id ASC');
        $events->execute([$invitation['id']]);
        $feedback = [];
        if ($session) {
            $feedbackStatement = $pdo->prepare('SELECT id, expected, happened, `natural`, created_at FROM experience_feedback WHERE session_id = ? ORDER BY created_at ASC');
            $feedbackStatement->execute([$session['id']]);
            $feedback = array_map(fn(array $row): array => [
                'id' => $row['id'], 'expected' => $row['expected'], 'happened' => $row['happened'], 'natural' => $row['natural'], 'createdAt' => iso($row['created_at']),
            ], $feedbackStatement->fetchAll());
        }
        $observationStatement = $pdo->prepare('SELECT * FROM experience_observations WHERE invitation_id = ?');
        $observationStatement->execute([$invitation['id']]);
        $observation = $observationStatement->fetch() ?: ['expected' => '', 'surprising' => '', 'valuable' => '', 'confusing' => '', 'improvement' => '', 'updated_at' => null];
        respond([
            'invitation' => invitation_public($invitation),
            'session' => $session ? session_public($session) : null,
            'events' => array_map(fn(array $row): array => ['id' => (string)$row['id'], 'type' => $row['event_type'], 'stepId' => $row['step_id'] ?: null, 'createdAt' => iso($row['created_at'])], $events->fetchAll()),
            'feedback' => $feedback,
            'observation' => ['expected' => $observation['expected'], 'surprising' => $observation['surprising'], 'valuable' => $observation['valuable'], 'confusing' => $observation['confusing'], 'improvement' => $observation['improvement'], 'updatedAt' => iso($observation['updated_at'])],
        ]);
    }

    if (preg_match('#^admin/invitations/([0-9a-f-]{36})/observation$#', $route, $match) && $method === 'PUT') {
        $input = body();
        $values = [
            clean_text($input['expected'] ?? '', 'Verwachting', MAX_OBSERVATION_LENGTH, false),
            clean_text($input['surprising'] ?? '', 'Verrassing', MAX_OBSERVATION_LENGTH, false),
            clean_text($input['valuable'] ?? '', 'Waardevol moment', MAX_OBSERVATION_LENGTH, false),
            clean_text($input['confusing'] ?? '', 'Twijfel of verwarring', MAX_OBSERVATION_LENGTH, false),
            clean_text($input['improvement'] ?? '', 'Verbeterkans', MAX_OBSERVATION_LENGTH, false),
        ];
        $updated = now_sql();
        $pdo->prepare('INSERT INTO experience_observations (invitation_id, expected, surprising, valuable, confusing, improvement, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE expected = VALUES(expected), surprising = VALUES(surprising), valuable = VALUES(valuable), confusing = VALUES(confusing), improvement = VALUES(improvement), updated_at = VALUES(updated_at)')->execute([$match[1], ...$values, $updated]);
        respond(['expected' => $values[0], 'surprising' => $values[1], 'valuable' => $values[2], 'confusing' => $values[3], 'improvement' => $values[4], 'updatedAt' => iso($updated)]);
    }

    if (preg_match('#^admin/invitations/([0-9a-f-]{36})/revoke$#', $route, $match) && $method === 'POST') {
        $pdo->prepare("UPDATE experience_invitations SET status = 'revoked', revoked_at = ?, last_active_at = ? WHERE id = ?")->execute([now_sql(), now_sql(), $match[1]]);
        $pdo->prepare('DELETE FROM experience_participant_access WHERE invitation_id = ?')->execute([$match[1]]);
        $statement = $pdo->prepare('SELECT * FROM experience_invitations WHERE id = ?');
        $statement->execute([$match[1]]);
        $row = $statement->fetch();
        if (!$row) api_error('Deze Experience bestaat niet.', 404, 'INVITATION_NOT_FOUND');
        respond(invitation_public($row));
    }

    if (preg_match('#^admin/invitations/([0-9a-f-]{36})$#', $route, $match) && $method === 'DELETE') {
        $input = body();
        if (($input['confirm'] ?? '') !== 'VERWIJDER TESTDATA') api_error('Bevestig het verwijderen van testdata opnieuw.', 422, 'CONFIRMATION_REQUIRED');
        $statement = $pdo->prepare('SELECT technical_test FROM experience_invitations WHERE id = ?');
        $statement->execute([$match[1]]);
        $technical = $statement->fetchColumn();
        if ($technical === false) api_error('Deze Experience bestaat niet.', 404, 'INVITATION_NOT_FOUND');
        if (!(bool)$technical) api_error('Alleen expliciete technische testdata kan hier worden verwijderd.', 409, 'NOT_TECHNICAL_TEST_DATA');
        $pdo->prepare('DELETE FROM experience_invitations WHERE id = ?')->execute([$match[1]]);
        respond(null);
    }

    api_error('Deze handeling bestaat niet.', 404, 'ROUTE_NOT_FOUND');
} catch (PDOException $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Experience storage operation failed: ' . $error->getMessage());
    api_error('De veilige opslag kon deze handeling niet afronden.', 503, 'STORAGE_OPERATION_FAILED');
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Experience API operation failed: ' . $error->getMessage());
    api_error('Deze handeling kon niet veilig worden afgerond.', 500, 'INTERNAL_ERROR');
}
