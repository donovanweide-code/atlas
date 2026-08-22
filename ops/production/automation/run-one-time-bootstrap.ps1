param(
  [string]$Repository = 'C:\Users\donov\Documents\Codex\2026-08-15\wbd-atlas-experience-review-harvest-scan\spw-production-assets-v1'
)

$ErrorActionPreference = 'Stop'
$hostName = '149.210.228.199'
$adminTarget = "wbdadmin@$hostName"
$adminKey = "$env:USERPROFILE\.ssh\wbd-production-admin-ed25519-v2"
$automation = Join-Path $Repository 'ops\production\automation'
$state = Join-Path $Repository '.codex-tmp\wbd-automation-bootstrap'
$result = Join-Path $state 'result.txt'
$transcript = Join-Path $state 'bootstrap-output.log'
$release = 'SPW-HUMAN-ACCEPTANCE-HOTFIX-20260822'
$current = 'SPW-FINAL-PRODUCTION-UX-RUNTIME-20260822'
$planSha = '3b57f9cafa6ba800a93f085bc8348fd953cf5f6cee7343428468e16d2a9b096f'
$remote = "/tmp/wbd-automation-bootstrap-$([DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))"

New-Item -ItemType Directory -Force -Path $state | Out-Null
Set-Content -LiteralPath $result -Value 'AUTOMATION_BOOTSTRAP=RUNNING' -Encoding UTF8
Set-Content -LiteralPath $transcript -Value "BOOTSTRAP_STARTED=$([DateTime]::UtcNow.ToString('o'))" -Encoding UTF8

function Run([string]$File, [string[]]$Arguments, [switch]$AllowFailure) {
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    & $File @Arguments 2>&1 | ForEach-Object {
      Write-Host $_
      Add-Content -LiteralPath $transcript -Value ([string]$_) -Encoding UTF8
    }
    $exit = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if (-not $AllowFailure -and $exit -ne 0) { throw "$File faalde met exitcode $exit" }
  return $exit
}

try {
  if (-not (Test-Path -LiteralPath $adminKey -PathType Leaf)) { throw 'Break-glass-key ontbreekt.' }
  $prepareKey = Join-Path $state 'wbdprepare-ed25519'
  $switchKey = Join-Path $state 'wbdswitch-ed25519'
  $probeKey = Join-Path $state 'wbdrevocation-probe-ed25519'
  foreach ($key in @($prepareKey,$switchKey,$probeKey)) {
    if (-not (Test-Path -LiteralPath $key)) {
      # Windows PowerShell 5.1 drops an empty native-process argument. The
      # explicit quoted-empty token is passed to OpenSSH as the intended
      # empty passphrase for these revocable automation credentials.
      Run -File "$env:WINDIR\System32\OpenSSH\ssh-keygen.exe" -Arguments @('-q','-t','ed25519','-N','""','-C',([IO.Path]::GetFileName($key)),'-f',$key)
    }
    & icacls.exe $key /inheritance:r /grant:r "$env:USERNAME`:R" | Out-Null
  }

  # Eén interactieve passphrase-invoer laadt uitsluitend de bestaande menselijke
  # break-glass-key in de menselijke Windows-agent. De key wordt niet gekopieerd.
  Run -File "$env:WINDIR\System32\OpenSSH\ssh-add.exe" -Arguments @($adminKey)
  $sshBase = @('-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes')
  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$adminKey,$adminTarget,"umask 077; mkdir '$remote'"))

  $upload = @(
    'wbd-deploy-gateway.sh','wbd-deploy-prepare-root.sh','wbd-deploy-switch-root.sh',
    'bootstrap-wbd-deployment-automation.sh','91-wbd-deployment-automation.sudoers',
    '61-wbd-deployment-automation.sshd.conf'
  ) | ForEach-Object { Join-Path $automation $_ }
  $upload += @("$prepareKey.pub","$switchKey.pub","$probeKey.pub",(Join-Path $Repository 'ops\production\spw-immutable-release.sh'))
  Run -File "$env:WINDIR\System32\OpenSSH\scp.exe" -Arguments @($sshBase + @('-i',$adminKey) + $upload + @("${adminTarget}:$remote/"))
  $bootstrapCommand = "sudo -n bash '$remote/bootstrap-wbd-deployment-automation.sh' '$remote' '$remote/wbdprepare-ed25519.pub' '$remote/wbdswitch-ed25519.pub' '$remote/spw-immutable-release.sh' '$remote/wbdrevocation-probe-ed25519.pub'"
  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$adminKey,$adminTarget,$bootstrapCommand))

  $prepareTarget = "wbdprepare@$hostName"
  $switchTarget = "wbdswitch@$hostName"
  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$prepareKey,$prepareTarget,'backup'))
  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$prepareKey,$prepareTarget,'status'))
  $deniedPrepareSwitch = Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$prepareKey,$prepareTarget,"switch $release $planSha 1 $release")) -AllowFailure
  if ($deniedPrepareSwitch -eq 0) { throw 'Prepare identity kon onverwacht switch uitvoeren.' }
  $deniedSwitchAdmin = Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$switchKey,$switchTarget,'id')) -AllowFailure
  if ($deniedSwitchAdmin -eq 0) { throw 'Switch identity accepteerde een algemeen commando.' }

  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$probeKey,$prepareTarget,'status'))
  $probeBlob = ((Get-Content -LiteralPath "$probeKey.pub" -Raw) -split '\s+')[1]
  $revoke = "sudo -n sed -i '\|$probeBlob|d' /var/lib/wbdprepare/.ssh/authorized_keys"
  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$adminKey,$adminTarget,$revoke))
  $revoked = Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @('-o','BatchMode=yes','-o','IdentitiesOnly=yes','-o','StrictHostKeyChecking=yes','-i',$probeKey,$prepareTarget,'status') -AllowFailure
  if ($revoked -eq 0) { throw 'Revocation-probekey werkt nog.' }

  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$prepareKey,$prepareTarget,"verify $release $planSha"))
  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$switchKey,$switchTarget,"preflight $release $planSha $current 1"))
  Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$adminKey,$adminTarget,"hostname; whoami; sudo -n true; sudo -n sshd -t; sudo -n visudo -cf /etc/sudoers >/dev/null; echo BREAK_GLASS_INDEPENDENT=PASS"))

  Set-Content -LiteralPath $result -Encoding UTF8 -Value @(
    'AUTOMATION_BOOTSTRAP=PASS','PREPARE_IDENTITY=PASS','SWITCH_IDENTITY=PASS',
    'LEAST_PRIVILEGE=PASS','REVOCATION_PROOF=PASS','BREAK_GLASS_INDEPENDENT=PASS',
    'BACKUP=PASS','HOTFIX_PREPARE=PASS','PRODUCTION_SWITCH=NOT_PERFORMED',
    "PREPARE_PRIVATE_KEY=$prepareKey","SWITCH_PRIVATE_KEY=$switchKey"
  )
}
catch {
  Set-Content -LiteralPath $result -Encoding UTF8 -Value @('AUTOMATION_BOOTSTRAP=FAIL',"BLOCKER=$($_.Exception.Message)")
  throw
}
finally {
  try { Run -File "$env:WINDIR\System32\OpenSSH\ssh.exe" -Arguments @($sshBase + @('-i',$adminKey,$adminTarget,"test ! -d '$remote' || rm -rf -- '$remote'")) -AllowFailure | Out-Null } catch {}
}
