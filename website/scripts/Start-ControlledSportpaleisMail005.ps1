param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('status', 'preview', 'verify', 'handoff', 'send')]
  [string]$Command,
  [Parameter(Mandatory = $true)]
  [string]$TestRecipient
)

$ErrorActionPreference = 'Stop'

try {
  $parsedRecipient = [System.Net.Mail.MailAddress]::new($TestRecipient)
  if ($parsedRecipient.Address -ne $TestRecipient.Trim().ToLowerInvariant()) {
    throw 'Gebruik exact een kaal e-mailadres zonder weergavenaam.'
  }
} catch {
  throw 'TestRecipient moet exact een geldig eigen testadres zijn.'
}

$credentialPointer = [IntPtr]::Zero
$credentialSecure = $null
$credentialPlain = $null

try {
  $env:SPORTPALEIS_MAIL_MODE = 'CONTROLLED_SMTP_TEST'
  $env:SPORTPALEIS_CONTROLLED_SMTP_ENABLED = 'YES_ONE_ALLOWLISTED_RECIPIENT'
  $env:SPORTPALEIS_SMTP_TEST_RECIPIENT = $parsedRecipient.Address
  $env:SPORTPALEIS_SMTP_HOST = 'mail.hostingserver.nl'
  $env:SPORTPALEIS_SMTP_PORT = '465'
  $env:SPORTPALEIS_SMTP_BEDRUKKING_USERNAME = 'bedrukking@sportpaleis.nl'
  $env:SPORTPALEIS_SMTP_CONNECTION_TIMEOUT_MS = '10000'
  $env:SPORTPALEIS_SMTP_SEND_TIMEOUT_MS = '15000'
  $env:SPORTPALEIS_PRODUCTION_SMTP_ENABLED = 'NO'

  if ($Command -in @('verify', 'handoff', 'send')) {
    $credentialSecure = Read-Host 'Voer lokaal het mailboxwachtwoord voor bedrukking@sportpaleis.nl in' -AsSecureString
    $credentialPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credentialSecure)
    $credentialPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($credentialPointer)
    if ([string]::IsNullOrEmpty($credentialPlain)) {
      throw 'Credential-invoer ontbreekt; de controlled flow is gestopt voordat een mailpoging is gereserveerd.'
    }
    $env:SPORTPALEIS_SMTP_BEDRUKKING_PASSWORD = $credentialPlain
  }

  if ($Command -eq 'handoff') {
    $env:SPORTPALEIS_CREDENTIAL_HANDOFF_CONFIRMATION = 'YES_CREDENTIAL_HANDOFF_ONLY_NO_SEND'
  }

  if ($Command -eq 'send') {
    $confirmation = Read-Host 'Typ uitsluitend YES_HUMAN_GO_SPORTPALEIS_MAIL_005 na expliciete menselijke GO'
    if ($confirmation -ne 'YES_HUMAN_GO_SPORTPALEIS_MAIL_005') {
      throw 'Send gestopt: de exacte menselijke GO-bevestiging ontbreekt.'
    }
    $env:SPORTPALEIS_SEND_CONFIRMATION = $confirmation
  }

  & node (Join-Path $PSScriptRoot 'sportpaleis-controlled-smtp-validation.mjs') $Command
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  $credentialPlain = $null
  if ($credentialPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($credentialPointer) }
  Remove-Item Env:SPORTPALEIS_MAIL_MODE -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_CONTROLLED_SMTP_ENABLED -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_SMTP_TEST_RECIPIENT -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_SMTP_HOST -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_SMTP_PORT -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_SMTP_BEDRUKKING_USERNAME -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_SMTP_BEDRUKKING_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_SMTP_CONNECTION_TIMEOUT_MS -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_SMTP_SEND_TIMEOUT_MS -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_PRODUCTION_SMTP_ENABLED -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_CREDENTIAL_HANDOFF_CONFIRMATION -ErrorAction SilentlyContinue
  Remove-Item Env:SPORTPALEIS_SEND_CONFIRMATION -ErrorAction SilentlyContinue
}
