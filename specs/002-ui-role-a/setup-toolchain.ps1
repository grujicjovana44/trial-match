# Pokretanje iz korena repozitorijuma u PowerShell-u:
# . .\specs\002-ui-role-a\setup-toolchain.ps1
# Preuzima samo razvojne alate; ne menja kod, zavisnosti ni podatke studija.
[CmdletBinding()]
param([string] $ToolchainRoot)

$trialMatchOldErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Stop'
try {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'Ova skripta je za Windows. Na ovom sistemu zasebno instalirajte Node 24.22.1 i pnpm 12.16.1.'
    }
    # RuntimeInformation.OSArchitecture moze biti nedostupan u Windows PowerShell-u.
    # PROCESSOR_ARCHITEW6432 daje arhitekturu sistema kada je proces 32-bitan.
    $trialMatchNativeArch = $env:PROCESSOR_ARCHITEW6432
    if (-not $trialMatchNativeArch) { $trialMatchNativeArch = $env:PROCESSOR_ARCHITECTURE }
    $trialMatchArch = switch (([string] $trialMatchNativeArch).ToUpperInvariant()) {
        'AMD64' { 'x64'; break }
        'X64' { 'x64'; break }
        'ARM64' { 'arm64'; break }
        default { throw "Nepodrzana ili nepoznata arhitektura: '$trialMatchNativeArch'." }
    }
    if (-not $ToolchainRoot) {
        $trialMatchLocal = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
        if (-not $trialMatchLocal) { throw 'Nije pronadjena korisnicka fascikla LocalApplicationData.' }
        $ToolchainRoot = Join-Path $trialMatchLocal 'TrialMatch\toolchain'
    }
    $ToolchainRoot = [System.IO.Path]::GetFullPath($ToolchainRoot)
    New-Item -ItemType Directory -Path $ToolchainRoot -Force | Out-Null
    $trialMatchNodeFolder = "node-v24.22.1-win-$trialMatchArch"
    $trialMatchPnpmFolder = 'pnpm-native-12.16.1\package'
    $trialMatchNodeHome = Join-Path $ToolchainRoot $trialMatchNodeFolder
    $trialMatchPnpmHome = Join-Path $ToolchainRoot $trialMatchPnpmFolder
    $trialMatchNodeExe = Join-Path $trialMatchNodeHome 'node.exe'
    $trialMatchPnpmExe = Join-Path $trialMatchPnpmHome 'pnpm.exe'

    function Test-TrialMatchToolVersion([string] $Executable, [string] $Expected) {
        if (-not (Test-Path -LiteralPath $Executable -PathType Leaf)) { return $false }
        try {
            $reported = & $Executable --version 2>$null
            return ($LASTEXITCODE -eq 0 -and "$reported".Trim() -eq $Expected)
        } catch { return $false }
    }

    if (-not (Test-TrialMatchToolVersion $trialMatchNodeExe 'v24.22.1')) {
        Write-Host 'Instalacija Node.js 24.22.1 za trenutnog korisnika...'
        $trialMatchArchiveName = "$trialMatchNodeFolder.zip"
        $trialMatchArchive = Join-Path $ToolchainRoot $trialMatchArchiveName
        $trialMatchManifest = (Invoke-WebRequest -UseBasicParsing 'https://nodejs.org/dist/v24.22.1/SHASUMS256.txt').Content
        $trialMatchChecksumLine = @($trialMatchManifest -split "`n" | Where-Object {
            $_ -match ('^[a-fA-F0-9]{64}\s+' + [regex]::Escape($trialMatchArchiveName) + '\s*$')
        })
        if ($trialMatchChecksumLine.Count -ne 1) { throw 'Nedostaje jednoznacan zvanicni SHA256 za Node arhivu.' }
        $trialMatchExpectedHash = ($trialMatchChecksumLine[0] -split '\s+')[0]
        Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v24.22.1/$trialMatchArchiveName" -OutFile $trialMatchArchive
        if ((Get-FileHash -LiteralPath $trialMatchArchive -Algorithm SHA256).Hash -ne $trialMatchExpectedHash) {
            throw 'SHA256 Node arhive se ne poklapa; instalacija je prekinuta.'
        }
        Expand-Archive -LiteralPath $trialMatchArchive -DestinationPath $ToolchainRoot -Force
    }

    if (-not (Test-TrialMatchToolVersion $trialMatchPnpmExe '12.16.1')) {
        Write-Host 'Instalacija pnpm 12.16.1 za trenutnog korisnika...'
        $trialMatchRegistryUrl = "https://registry.npmjs.org/@pnpm%2fexe.win32-$trialMatchArch/12.16.1"
        $trialMatchPackage = Invoke-RestMethod -Uri $trialMatchRegistryUrl
        if ($trialMatchPackage.version -ne '12.16.1' -or $trialMatchPackage.dist.integrity -notmatch '^sha512-') {
            throw 'Neispravni metapodaci za trazenu pnpm verziju.'
        }
        $trialMatchPackageUri = [uri]$trialMatchPackage.dist.tarball
        if ($trialMatchPackageUri.Scheme -ne 'https' -or $trialMatchPackageUri.Host -ne 'registry.npmjs.org') {
            throw 'Neocekivana adresa pnpm arhive.'
        }
        $trialMatchPnpmArchive = Join-Path $ToolchainRoot "pnpm-native-12.16.1-$trialMatchArch.tgz"
        Invoke-WebRequest -UseBasicParsing $trialMatchPackageUri.AbsoluteUri -OutFile $trialMatchPnpmArchive
        $trialMatchHasher = [System.Security.Cryptography.SHA512]::Create()
        try { $trialMatchDigest = $trialMatchHasher.ComputeHash([System.IO.File]::ReadAllBytes($trialMatchPnpmArchive)) }
        finally { $trialMatchHasher.Dispose() }
        if (('sha512-' + [Convert]::ToBase64String($trialMatchDigest)) -ne $trialMatchPackage.dist.integrity) {
            throw 'SHA512 pnpm arhive se ne poklapa; instalacija je prekinuta.'
        }
        $trialMatchPnpmExtract = Join-Path $ToolchainRoot 'pnpm-native-12.16.1'
        New-Item -ItemType Directory -Path $trialMatchPnpmExtract -Force | Out-Null
        & tar.exe -xzf $trialMatchPnpmArchive -C $trialMatchPnpmExtract
        if ($LASTEXITCODE -ne 0) { throw 'Raspakivanje pnpm arhive nije uspelo.' }
    }

    if (-not (Test-TrialMatchToolVersion $trialMatchNodeExe 'v24.22.1') -or
        -not (Test-TrialMatchToolVersion $trialMatchPnpmExe '12.16.1')) {
        throw 'Instalirani alati nisu prijavili trazene verzije.'
    }
    $trialMatchInit = @'
# TrialMatch: ucitati u istom PowerShell procesu u kom se pokrecu provere.
$trialMatchToolPaths = @(
    (Join-Path $PSScriptRoot '__NODE_FOLDER__'),
    (Join-Path $PSScriptRoot '__PNPM_FOLDER__')
)
$trialMatchOtherPaths = @($env:Path -split ';' | Where-Object { $_ -and $_ -notin $trialMatchToolPaths })
$env:Path = ($trialMatchToolPaths + $trialMatchOtherPaths) -join ';'
'@
    $trialMatchInit = $trialMatchInit.Replace('__NODE_FOLDER__', $trialMatchNodeFolder).Replace('__PNPM_FOLDER__', $trialMatchPnpmFolder)
    $trialMatchInitPath = Join-Path $ToolchainRoot 'init.ps1'
    Set-Content -LiteralPath $trialMatchInitPath -Value $trialMatchInit -Encoding UTF8
    . $trialMatchInitPath
    if ((Get-Command node -ErrorAction Stop).Source -ne $trialMatchNodeExe -or
        (Get-Command pnpm -ErrorAction Stop).Source -ne $trialMatchPnpmExe) {
        throw 'Druga komanda ili alias ima prednost nad instaliranim alatima; proverite Get-Command node,pnpm.'
    }
    Write-Host "Node: $(& $trialMatchNodeExe --version)"
    Write-Host "pnpm: $(& $trialMatchPnpmExe --version)"
    Write-Host "Putanja podesena za ovaj proces. Inicijalizacija: $trialMatchInitPath"
} finally {
    $ErrorActionPreference = $trialMatchOldErrorAction
}
