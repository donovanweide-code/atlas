param(
  [Parameter(Mandatory = $true)]
  [string]$SummaUsbDllPath,
  [string[]]$ExpectedHardwareId = @()
)

$ErrorActionPreference = 'Stop'

function Get-DevicePropertyValue {
  param(
    [Parameter(Mandatory = $true)]$Device,
    [Parameter(Mandatory = $true)][string]$KeyName
  )

  try {
    return (Get-PnpDeviceProperty -InstanceId $Device.InstanceId -KeyName $KeyName -ErrorAction Stop).Data
  }
  catch {
    return $null
  }
}

function Get-PeArchitecture {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return 'unknown'
  }

  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $reader = [System.IO.BinaryReader]::new($stream)
    $stream.Position = 0x3c
    $peOffset = $reader.ReadInt32()
    $stream.Position = $peOffset + 4
    $machine = $reader.ReadUInt16()
    switch ($machine) {
      0x014c { return 'x86' }
      0x8664 { return 'x64' }
      default { return 'unknown' }
    }
  }
  finally {
    $stream.Dispose()
  }
}

$devices = Get-PnpDevice -PresentOnly | ForEach-Object {
  $device = $_
  $hardwareIds = @(Get-DevicePropertyValue -Device $device -KeyName 'DEVPKEY_Device_HardwareIds')
  $driverProvider = Get-DevicePropertyValue -Device $device -KeyName 'DEVPKEY_Device_DriverProvider'
  $isExpectedId = $ExpectedHardwareId.Count -gt 0 -and @($hardwareIds | Where-Object { $ExpectedHardwareId -contains $_ }).Count -gt 0
  $isSummaCandidate = $device.FriendlyName -match 'Summa' -or $driverProvider -match 'Summa' -or $isExpectedId

  if ($isSummaCandidate) {
    [pscustomobject]@{
      friendlyName = $device.FriendlyName
      present = $true
      status = [string]$device.Status
      hardwareIds = $hardwareIds
      deviceInstanceId = $device.InstanceId
      containerId = Get-DevicePropertyValue -Device $device -KeyName 'DEVPKEY_Device_ContainerId'
      classGuid = Get-DevicePropertyValue -Device $device -KeyName 'DEVPKEY_Device_ClassGuid'
      driverProvider = $driverProvider
      driverVersion = Get-DevicePropertyValue -Device $device -KeyName 'DEVPKEY_Device_DriverVersion'
      driverService = Get-DevicePropertyValue -Device $device -KeyName 'DEVPKEY_Device_Service'
    }
  }
}

$dllExists = Test-Path -LiteralPath $SummaUsbDllPath -PathType Leaf
$signature = if ($dllExists) { Get-AuthenticodeSignature -LiteralPath $SummaUsbDllPath } else { $null }
$version = if ($dllExists) { (Get-Item -LiteralPath $SummaUsbDllPath).VersionInfo.FileVersion } else { $null }

[pscustomobject]@{
  capturedAt = (Get-Date).ToUniversalTime().ToString('o')
  computerName = $env:COMPUTERNAME
  operatingSystem = [System.Environment]::OSVersion.VersionString
  devices = @($devices)
  dll = [pscustomobject]@{
    configuredPath = $SummaUsbDllPath
    exists = $dllExists
    version = $version
    architecture = Get-PeArchitecture -Path $SummaUsbDllPath
    signatureStatus = if ($signature) { [string]$signature.Status } else { $null }
    signer = if ($signature -and $signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
  }
  writeCapabilityTested = $false
} | ConvertTo-Json -Depth 8
