param(
  [Parameter(Mandatory = $true)]
  [string]$TestRecipient,
  [int]$Port = 5193
)

$ErrorActionPreference = 'Stop'

try {
  $parsedRecipient = [System.Net.Mail.MailAddress]::new($TestRecipient)
  if ($parsedRecipient.Address -ne $TestRecipient.Trim().ToLowerInvariant()) {
    throw 'Gebruik exact één kaal e-mailadres zonder weergavenaam.'
  }
} catch {
  throw 'TestRecipient moet exact één geldig eigen testadres zijn.'
}

$infoSecure = Read-Host 'Voer lokaal het mailboxwachtwoord voor info@webuildanddesign.nl in' -AsSecureString
$invoiceSecure = Read-Host 'Voer lokaal het mailboxwachtwoord voor facturen@webuildanddesign.nl in' -AsSecureString
$infoPointer = [IntPtr]::Zero
$invoicePointer = [IntPtr]::Zero

try {
  $infoPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($infoSecure)
  $invoicePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($invoiceSecure)
  $env:WBD_MAIL_MODE = 'CONTROLLED_SMTP_TEST'
  $env:WBD_CONTROLLED_SMTP_ENABLED = 'YES_ONE_ALLOWLISTED_RECIPIENT'
  $env:WBD_SMTP_TEST_RECIPIENT = $parsedRecipient.Address
  $env:WBD_SMTP_INFO_USERNAME = 'info@webuildanddesign.nl'
  $env:WBD_SMTP_INFO_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($infoPointer)
  $env:WBD_SMTP_INVOICE_USERNAME = 'facturen@webuildanddesign.nl'
  $env:WBD_SMTP_INVOICE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($invoicePointer)
  $env:WBD_SMTP_CONNECTION_TIMEOUT_MS = '10000'
  $env:WBD_SMTP_SEND_TIMEOUT_MS = '15000'
  $env:WBD_PRODUCTION_SMTP_ENABLED = 'NO'

  Write-Host "Controlled WBD SMTP-review start lokaal op http://127.0.0.1:$Port"
  Write-Host 'Laat dit venster open. Sluiten verwijdert de procesgebonden credentials.'
  npm.cmd run dev -- --host 127.0.0.1 --port $Port
} finally {
  if ($infoPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($infoPointer) }
  if ($invoicePointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($invoicePointer) }
  Remove-Item Env:WBD_MAIL_MODE -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_CONTROLLED_SMTP_ENABLED -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_SMTP_TEST_RECIPIENT -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_SMTP_INFO_USERNAME -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_SMTP_INFO_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_SMTP_INVOICE_USERNAME -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_SMTP_INVOICE_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_SMTP_CONNECTION_TIMEOUT_MS -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_SMTP_SEND_TIMEOUT_MS -ErrorAction SilentlyContinue
  Remove-Item Env:WBD_PRODUCTION_SMTP_ENABLED -ErrorAction SilentlyContinue
}
