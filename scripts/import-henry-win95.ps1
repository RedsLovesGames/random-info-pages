[CmdletBinding()]
param(
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [switch]$SkipInstall,
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$SourceRepo = 'https://github.com/henryjeff/portfolio-inner-site.git'
$SourceLabel = 'henryjeff/portfolio-inner-site'
$SourceCommit = '23cf84acd5c76d2c719e1d04c3d976dc4b0b49f8'
$OsSrc = Join-Path $RepoRoot 'os-src'
$DeployDir = Join-Path $RepoRoot 'os'
$Overrides = Join-Path $RepoRoot 'scripts/win95-overrides'
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('rip-win95-' + [guid]::NewGuid().ToString('N'))
$Upstream = Join-Path $TempRoot 'portfolio-inner-site'
$Manifest = Join-Path $OsSrc 'IMPORT_MANIFEST.md'

function Assert-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found on PATH."
    }
}

function Copy-RelativeFile([string]$RelativePath) {
    $source = Join-Path $Upstream $RelativePath
    if (-not (Test-Path $source -PathType Leaf)) {
        throw "Pinned upstream file missing: $RelativePath"
    }
    $destination = Join-Path $OsSrc $RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path $destination -Parent) | Out-Null
    Copy-Item $source $destination -Force
}

function Copy-RelativeTree([string]$RelativePath) {
    $source = Join-Path $Upstream $RelativePath
    if (-not (Test-Path $source -PathType Container)) {
        throw "Pinned upstream directory missing: $RelativePath"
    }
    $destination = Join-Path $OsSrc $RelativePath
    New-Item -ItemType Directory -Force -Path $destination | Out-Null
    Get-ChildItem $source -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($source.Length).TrimStart('\', '/')
        $target = Join-Path $destination $relative
        New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
        Copy-Item $_.FullName $target -Force
    }
}

function Overlay-Tree([string]$Source, [string]$Destination) {
    Get-ChildItem $Source -Recurse -File | ForEach-Object {
        $relative = $_.FullName.Substring($Source.Length).TrimStart('\', '/')
        $target = Join-Path $Destination $relative
        New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
        Copy-Item $_.FullName $target -Force
    }
}

Assert-Command git
Assert-Command node
Assert-Command npm

if (-not (Test-Path $Overrides -PathType Container)) {
    throw "Random Info override tree is missing: $Overrides"
}

Write-Host "Importing authentic Win95 shell from $SourceLabel@$SourceCommit"
Write-Host "Target source: $OsSrc"
Write-Host "Target deployment: $DeployDir"

try {
    New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
    git clone --quiet --filter=blob:none --no-checkout $SourceRepo $Upstream
    if ($LASTEXITCODE -ne 0) { throw 'git clone failed.' }

    git -C $Upstream checkout --quiet --detach $SourceCommit
    if ($LASTEXITCODE -ne 0) { throw 'git checkout of pinned source failed.' }

    $actualCommit = (git -C $Upstream rev-parse HEAD).Trim()
    if ($actualCommit -ne $SourceCommit) {
        throw "Pinned source verification failed. Expected $SourceCommit, got $actualCommit."
    }

    if (Test-Path $OsSrc) { Remove-Item $OsSrc -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $OsSrc | Out-Null

    # Root build configuration. The package lock is kept exactly as upstream for reproducibility.
    @(
        '.prettierrc',
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'public/index.html',
        'public/manifest.json',
        'public/robots.txt',
        'public/favicon.ico',
        'src/App.css',
        'src/App.tsx',
        'src/index.css',
        'src/index.tsx',
        'src/react-app-env.d.ts',
        'src/reportWebVitals.ts',
        'src/types.d.ts',
        'src/constants/Types.d.ts',
        'src/constants/colors.ts',
        'src/hooks/useInitialWindowSize.ts',
        'src/components/general/Animation.ts',
        'src/components/general/Icon.tsx',
        'src/components/general/index.ts',
        'src/components/applications/Doom.tsx',
        'src/components/applications/OregonTrail.tsx',
        'src/components/applications/Scrabble.tsx',
        'src/components/applications/Henordle.tsx'
    ) | ForEach-Object { Copy-RelativeFile $_ }

    # Authentic OS/window manager and the retained game/runtime code.
    @(
        'src/components/os',
        'src/components/dos',
        'src/components/wordle',
        'src/assets/icons',
        'src/assets/fonts',
        'public/js-dos'
    ) | ForEach-Object { Copy-RelativeTree $_ }

    # DOS bundles are binaries, so this local importer is intentionally responsible for them.
    @(
        'public/doom.jsdos',
        'public/trail.jsdos',
        'public/scrabble.jsdos'
    ) | ForEach-Object { Copy-RelativeFile $_ }

    # Explicitly excluded personal portfolio content. These paths are documented here so the
    # import contract can prove they are intentionally omitted rather than accidentally lost:
    # src/components/showcase
    # src/assets/pictures
    # src/assets/audio
    # src/assets/resume
    # src/components/applications/ShowcaseExplorer.tsx
    # src/components/applications/Credits.tsx

    Overlay-Tree $Overrides $OsSrc

    # Rebrand remaining upstream shell strings without altering the authentic window mechanics.
    $toolbar = Join-Path $OsSrc 'src/components/os/Toolbar.tsx'
    $toolbarText = Get-Content $toolbar -Raw
    $toolbarText = $toolbarText.Replace('HeffernanOS', 'Random Info OS')
    Set-Content -Path $toolbar -Value $toolbarText -Encoding utf8

    # Convert the original personal Henordle copy into a neutral RIP Wordle while retaining its game code.
    $wordle = Join-Path $OsSrc 'src/components/wordle/Wordle.tsx'
    $wordleText = Get-Content $wordle -Raw
    $wordleText = $wordleText.Replace("const word = 'HENRY';", "const word = 'TOOLS';")
    $wordleText = $wordleText.Replace('<h2>Henordle</h2>', '<h2>RIP Wordle</h2>')
    $wordleText = $wordleText.Replace('<p>Wordle but with a HENRY based twist.</p>', '<p>A five-letter word game inside Random Info OS.</p>')
    $wordleText = $wordleText.Replace('<p>Thanks for playing! Remember: the word is always &quot;HENRY&quot;!</p>', '<p>Thanks for playing. The answer is shown below.</p>')
    $wordleText = $wordleText.Replace('<p>Thanks for playing! Remember: the word is always "HENRY"!</p>', '<p>Thanks for playing. The answer is shown below.</p>')
    Set-Content -Path $wordle -Value $wordleText -Encoding utf8

    # CRA must emit paths that work below /random-info-pages/os/ on GitHub Pages.
    $packagePath = Join-Path $OsSrc 'package.json'
    $package = Get-Content $packagePath -Raw | ConvertFrom-Json
    $package.name = 'random-info-os'
    if ($package.PSObject.Properties.Name -contains 'homepage') {
        $package.homepage = 'https://redslovesgames.github.io/random-info-pages/os'
    } else {
        $package | Add-Member -NotePropertyName homepage -NotePropertyValue 'https://redslovesgames.github.io/random-info-pages/os'
    }
    $package | ConvertTo-Json -Depth 20 | Set-Content -Path $packagePath -Encoding utf8

    # Fail closed if user-facing personal branding survived the selective import/override pass.
    $forbidden = Get-ChildItem $OsSrc -Recurse -File -Include *.ts,*.tsx,*.css,*.html,*.json |
        Select-String -Pattern 'Henry Heffernan|HeffernanOS|My Showcase'
    if ($forbidden) {
        $details = ($forbidden | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }) -join [Environment]::NewLine
        throw "Personal upstream branding survived import:`n$details"
    }

    $fileList = Get-ChildItem $OsSrc -Recurse -File |
        ForEach-Object { $_.FullName.Substring($OsSrc.Length).TrimStart('\', '/').Replace('\', '/') } |
        Sort-Object

    $manifestLines = @(
        '# Random Info OS import manifest',
        '',
        "- Upstream: $SourceLabel",
        "- Pinned commit: $SourceCommit",
        '- Purpose: retain the authentic React Win95 shell, window manager, js-dos runtime, and game bundles while removing personal portfolio content.',
        '- Excluded: showcase components, personal pictures, personal audio, resume assets, and Henry-specific Credits/Showcase applications.',
        '- Adaptation: Random Info Explorer launches existing site pages inside authentic draggable/resizable windows with external-open fallbacks.',
        '',
        '## Imported files',
        ''
    ) + ($fileList | ForEach-Object { "- ``$_``" })
    Set-Content -Path $Manifest -Value $manifestLines -Encoding utf8

    if (-not $SkipInstall) {
        Push-Location $OsSrc
        try {
            npm ci
            if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
        } finally {
            Pop-Location
        }
    }

    if (-not $SkipBuild) {
        Push-Location $OsSrc
        try {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw 'npm run build failed.' }
        } finally {
            Pop-Location
        }

        $buildDir = Join-Path $OsSrc 'build'
        if (-not (Test-Path $buildDir -PathType Container)) {
            throw "Build completed without producing $buildDir"
        }

        if (Test-Path $DeployDir) { Remove-Item $DeployDir -Recurse -Force }
        New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null
        Get-ChildItem $buildDir -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($buildDir.Length).TrimStart('\', '/')
            $target = Join-Path $DeployDir $relative
            New-Item -ItemType Directory -Force -Path (Split-Path $target -Parent) | Out-Null
            Copy-Item $_.FullName $target -Force
        }
    }

    Write-Host ''
    Write-Host 'Import complete.' -ForegroundColor Green
    Write-Host "Manifest: $Manifest"
    Write-Host 'No git commit or push was performed.'
    Write-Host 'Review with: git status --short'
    git -C $RepoRoot status --short
} finally {
    if (Test-Path $TempRoot) {
        Remove-Item $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
