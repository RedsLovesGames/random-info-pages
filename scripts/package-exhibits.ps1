param([string]$OutputPath)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $OutputPath) { $OutputPath = Join-Path $repoRoot 'random-info-pages-four-exhibits.zip' }
$OutputPath = [IO.Path]::GetFullPath($OutputPath)
$files = [Collections.Generic.List[string]]::new()
foreach ($folder in @('cryptography-museum','one-million','algorithm-arena','music-microscope')) {
  Get-ChildItem -LiteralPath (Join-Path $repoRoot $folder) -File -Recurse | ForEach-Object {
    $files.Add($_.FullName.Substring($repoRoot.Length + 1).Replace('\','/'))
  }
}
foreach ($file in @(
  'index.html',
  'tests/home-index.test.mjs','tests/cryptography-museum.test.mjs','tests/cryptography-museum.browser.test.mjs','tests/one-million.test.mjs',
  'tests/algorithm-arena.test.mjs','tests/music-microscope.test.mjs','tests/exhibits-integration.test.mjs',
  'scripts/exhibits-server.mjs','scripts/test-exhibits.mjs','scripts/exhibits-browser-smoke.mjs',
  'scripts/exhibits-interactions.mjs','scripts/package-exhibits.ps1',
  'docs/four-exhibits-plan.md','docs/four-exhibits-requirements.md','docs/four-exhibits-handoff.md'
)) { $files.Add($file) }
$files = @($files | Sort-Object -Unique)
$manifest = foreach ($relative in $files) {
  $source = Join-Path $repoRoot $relative
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing overlay file: $relative" }
  [ordered]@{path=$relative;bytes=(Get-Item -LiteralPath $source).Length;sha256=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash.ToLowerInvariant()}
}
$manifestPath = Join-Path $repoRoot 'docs/four-exhibits-manifest.json'
$manifestJson = ConvertTo-Json -InputObject $manifest -Depth 4
[IO.File]::WriteAllText($manifestPath,$manifestJson + [Environment]::NewLine,[Text.UTF8Encoding]::new($false))
$files += 'docs/four-exhibits-manifest.json'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path -LiteralPath $OutputPath) { Remove-Item -LiteralPath $OutputPath }
$stream = [IO.File]::Open($OutputPath,[IO.FileMode]::CreateNew)
$zip = [IO.Compression.ZipArchive]::new($stream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($relative in $files) {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,(Join-Path $repoRoot $relative),$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $zip.Dispose(); $stream.Dispose() }
$verify = [IO.Compression.ZipFile]::OpenRead($OutputPath)
try {
  if ($verify.Entries.Count -ne $files.Count) { throw 'ZIP entry count mismatch' }
  foreach ($entry in $verify.Entries) {
    if ($entry.FullName -match '(^/|(^|/)\.\.(/|$)|node_modules|^\.git/)') { throw "Unsafe ZIP entry: $($entry.FullName)" }
  }
} finally { $verify.Dispose() }
$zipHash = (Get-FileHash -LiteralPath $OutputPath -Algorithm SHA256).Hash.ToLowerInvariant()
$checksumPath = "$OutputPath.sha256"
[IO.File]::WriteAllText($checksumPath,$zipHash + '  ' + [IO.Path]::GetFileName($OutputPath) + [Environment]::NewLine,[Text.UTF8Encoding]::new($false))
Write-Output ($OutputPath + ' — ' + $files.Count + ' files, ' + (Get-Item -LiteralPath $OutputPath).Length + ' bytes')
Write-Output ('SHA-256 ' + $zipHash + ' (also written to ' + $checksumPath + ')')
