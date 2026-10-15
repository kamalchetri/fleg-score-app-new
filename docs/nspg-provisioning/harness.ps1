# Disposable local cluster for the NSPG import dry run.
# Talks only to 127.0.0.1. Does not open a Supabase connection.
$ErrorActionPreference = 'Stop'

$Bin = 'C:\Program Files\PostgreSQL\18\bin'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Stamp = [guid]::NewGuid().ToString('n')
$Data = Join-Path $env:TEMP "fleg-nspg-provision-pg18-$Stamp"
$Port = 55433
$Database = 'fleg_nspg_provision'
$HostAddr = '127.0.0.1'
$ownsData = $false
$serverStarted = $false

function Test-VerifiedDataDir {
  if (-not $ownsData) { return $false }
  $tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')
  $full = [IO.Path]::GetFullPath($Data).TrimEnd('\')
  if (-not $full.StartsWith($tempRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { return $false }
  if ((Split-Path $full -Leaf) -ne "fleg-nspg-provision-pg18-$Stamp") { return $false }
  $markerPath = Join-Path $full 'FLEG_NSPG_PROVISION_HARNESS.txt'
  if (-not (Test-Path $markerPath)) { return $false }
  $marked = (Get-Content -Raw -Path $markerPath).Trim()
  if ($marked -ne $full) { return $false }
  $versionPath = Join-Path $full 'PG_VERSION'
  if (-not (Test-Path $versionPath)) { return $false }
  $pgVersion = (Get-Content -Raw -Path $versionPath).Trim()
  if ($pgVersion -notmatch '^18(\.|$)') { return $false }
  return $true
}

function Invoke-Psql {
  param(
    [string]$DatabaseName = $Database,
    [string]$File
  )
  $args = @(
    '-h', $HostAddr,
    '-p', "$Port",
    '-U', 'postgres',
    '-d', $DatabaseName,
    '-q',
    '-v', 'ON_ERROR_STOP=1',
    '-f', $File
  )
  $output = & (Join-Path $Bin 'psql.exe') @args 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "psql exited $LASTEXITCODE`n$output"
  }
  return (($output | Out-String).Trim())
}

$importer = Get-Content -Raw -Path (Join-Path $Root 'importer.sql')
$migration = Get-Content -Raw -Path (Join-Path $Root 'migration.sql')
$staticHits = @()

if ($importer -match '(?i)SECURITY\s+DEFINER') { $staticHits += 'security definer' }
if ($importer -notmatch 'ON CONFLICT \(submission_id, reg_category_id\) DO NOTHING') { $staticHits += 'missing link conflict' }
if ($importer -notmatch "current_setting\('nspg.local_import'") { $staticHits += 'missing local gate' }
if ($importer -notmatch 'Pending import') { $staticHits += 'missing placeholder name' }
if ($importer -match '(?i)\bfull_name\b') { $staticHits += 'copies full_name' }
if ($importer -match '00000000-0000-4000-8000-0000000000aa') { $staticHits += 'hardcoded organizer' }
if ($importer -match '(?i)\bmd5\s*\(') { $staticHits += 'md5 hash' }
if ($importer -notmatch "digest\(convert_to\(") { $staticHits += 'missing sha256 digest' }
if ($importer -notmatch 'blocked_candidate') { $staticHits += 'missing blocked candidate refusal' }
if ($importer -notmatch 'snapshot_count_drift') { $staticHits += 'missing snapshot count drift' }
if ($importer -notmatch 'candidate_count_drift') { $staticHits += 'missing candidate count drift' }
if ($importer -match 'withdrawn_unresolved') { $staticHits += 'withdrawn snapshot still blocks import' }
if ($importer -notmatch "RAISE EXCEPTION 'production_project_refused'") { $staticHits += 'missing production refusal' }
if ($importer -notmatch 'ACKNOWLEDGE_NSPG_LOCAL_IMPORT') { $staticHits += 'missing acknowledgement' }
if ($importer -notmatch "set_config\('lock_timeout', '3s'") { $staticHits += 'missing lock timeout' }
if ($importer -notmatch "set_config\('statement_timeout', '15s'") { $staticHits += 'missing statement timeout' }
if ($importer -match '(?i)UPDATE\s+public\.tournaments\b') { $staticHits += 'updates tournaments' }
if ($importer -match '(?i)DELETE\s+FROM\s+public\.entrants\b') { $staticHits += 'deletes entrants' }
if ($migration -notmatch 'NOT VALID') { $staticHits += 'constraint rewrite is not split' }
if ($migration -notmatch 'nspg_assert_preserved_sports') { $staticHits += 'missing sport precheck' }
$rollback = Get-Content -Raw -Path (Join-Path $Root 'rollback.sql')
if ($rollback -notmatch 'rollback_would_invalidate_rows') { $staticHits += 'rollback can invalidate rows' }

$forbiddenWrites = @(
  'public\.reg_forms',
  'public\.reg_form_categories',
  'public\.reg_submissions',
  'public\.reg_submission_categories',
  'public\.payments',
  'public\.workshops',
  'public\.public_events',
  'public\.entrants'
)
foreach ($name in $forbiddenWrites) {
  if ($importer -match "(?i)\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+$name\b") {
    if ($name -eq 'public\.entrants' -and $importer -match "(?i)\bUPDATE\s+$name\b") {
      $staticHits += "writes $name"
    } elseif ($name -ne 'public\.entrants') {
      $staticHits += "writes $name"
    } elseif ($importer -match "(?i)\bDELETE\s+FROM\s+$name\b") {
      $staticHits += "writes $name"
    }
  }
}
if ($importer -notmatch '(?i)INSERT\s+INTO\s+public\.entrants\b') { $staticHits += 'missing entrant insert' }
if ($migration -notmatch "'futsal', 'football', 'pickleball', 'basketball', 'badminton', 'darts'") {
  $staticHits += 'dropped an existing sport'
}
if ($migration -notmatch 'UNIQUE \(submission_id, reg_category_id\)') { $staticHits += 'missing link unique key' }

if ($staticHits.Count -gt 0) {
  throw ("static assertion failed: " + ($staticHits -join ', '))
}
Write-Output 'STATIC ok'

try {
  New-Item -ItemType Directory -Path $Data | Out-Null
  $ownsData = $true
  & (Join-Path $Bin 'initdb.exe') -D $Data -U postgres -A trust -E UTF8 --locale=C --no-instructions
  if ($LASTEXITCODE -ne 0) { throw "initdb exited $LASTEXITCODE" }
  $fullData = [IO.Path]::GetFullPath($Data).TrimEnd('\')
  Set-Content -Path (Join-Path $Data 'FLEG_NSPG_PROVISION_HARNESS.txt') -Value $fullData -Encoding ascii

  & (Join-Path $Bin 'pg_ctl.exe') -D $Data -l (Join-Path $Data 'server.log') -w -o "-p $Port -h $HostAddr" start
  if ($LASTEXITCODE -ne 0) { throw "pg_ctl start exited $LASTEXITCODE" }
  $serverStarted = $true

  & (Join-Path $Bin 'createdb.exe') -h $HostAddr -p $Port -U postgres $Database
  if ($LASTEXITCODE -ne 0) { throw "createdb exited $LASTEXITCODE" }

  Invoke-Psql -File (Join-Path $Root 'fixture.sql') | Out-Null
  Invoke-Psql -File (Join-Path $Root 'migration.sql') | Out-Null
  Invoke-Psql -File (Join-Path $Root 'importer.sql') | Out-Null
  $testOutput = Invoke-Psql -File (Join-Path $Root 'tests.sql')

  $failed = @($testOutput -split "`n" | Where-Object { $_ -match '\|fail\|' })
  if ($failed.Count -gt 0) {
    throw ("scenario failed:`n" + ($failed -join "`n") + "`n" + $testOutput)
  }

  Invoke-Psql -File (Join-Path $Root 'prepare-lock.sql') | Out-Null
  $timeoutOutput = ''
  $timeoutFailed = $false
  try {
    $timeoutOutput = Invoke-Psql -File (Join-Path $Root 'statement-timeout.sql')
  } catch {
    $timeoutFailed = $true
    $timeoutOutput = "$_"
  }
  if (-not $timeoutFailed -or $timeoutOutput -notmatch 'statement timeout') {
    throw "statement timeout was not enforced: $timeoutOutput"
  }
  $timeoutRows = & (Join-Path $Bin 'psql.exe') -h $HostAddr -p $Port -U postgres -d $Database -q -t -A -c "SELECT count(*) FROM public.tournaments WHERE slug LIKE 'nspg26-%'"
  if (($timeoutRows | Out-String).Trim() -ne '0') {
    throw "statement timeout left NSPG tournaments: $timeoutRows"
  }
  $psql = Join-Path $Bin 'psql.exe'
  $aOut = Join-Path $Data 'session-a.out'
  $aErr = Join-Path $Data 'session-a.err'
  $bOut = Join-Path $Data 'session-b.out'
  $bErr = Join-Path $Data 'session-b.err'
  $commonArgs = @(
    '-h', $HostAddr, '-p', "$Port", '-U', 'postgres', '-d', $Database,
    '-q', '-v', 'ON_ERROR_STOP=1'
  )
  $sessionA = Start-Process -FilePath $psql -ArgumentList ($commonArgs + @('-f', (Join-Path $Root 'lock-a.sql'))) -RedirectStandardOutput $aOut -RedirectStandardError $aErr -PassThru -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(15)
  $holding = $false
  $sleepSql = "SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'active' AND query LIKE '%pg_sleep(%'"
  do {
    Start-Sleep -Milliseconds 50
    $sleepers = & $psql -h $HostAddr -p $Port -U postgres -d $Database -q -t -A -c $sleepSql
    if (($sleepers | Out-String).Trim() -eq '1') { $holding = $true; break }
    if ($sessionA.HasExited) { break }
  } while ((Get-Date) -lt $deadline)
  if (-not $holding) {
    throw "lock session did not reach pg_sleep. stdout=$(Get-Content -Raw $aOut) stderr=$(Get-Content -Raw $aErr)"
  }
  $sessionB = Start-Process -FilePath $psql -ArgumentList ($commonArgs + @('-f', (Join-Path $Root 'lock-b.sql'))) -RedirectStandardOutput $bOut -RedirectStandardError $bErr -PassThru -WindowStyle Hidden
  if (-not $sessionA.WaitForExit(20000)) { throw 'lock session A timed out' }
  $sessionA.WaitForExit() | Out-Null
  if (-not $sessionB.WaitForExit(20000)) { throw 'lock session B timed out' }
  $sessionB.WaitForExit() | Out-Null
  $sessionA.Refresh()
  $sessionB.Refresh()
  function Read-SessionText([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    $raw = Get-Content -Raw -Path $Path
    if ($null -eq $raw) { return '' }
    return $raw.Trim()
  }
  $bText = Read-SessionText $bOut
  $bErrText = Read-SessionText $bErr
  $aErrText = Read-SessionText $aErr
  if ($null -ne $sessionB.ExitCode -and [int]$sessionB.ExitCode -ne 0) {
    throw "lock session B exited $($sessionB.ExitCode): stdout=$bText stderr=$bErrText"
  }
  if ($bText -notmatch 'lock_timeout\|rejected\|') {
    throw "lock timeout was not rejected: stdout=$bText stderr=$bErrText sessionA=$aErrText"
  }

  Write-Output 'TESTS'
  Write-Output $testOutput
  Write-Output 'LOCK'
  Write-Output $bText
  Write-Output 'HARNESS_OK'
}
finally {
  if ($serverStarted -and (Test-Path $Data)) {
    & (Join-Path $Bin 'pg_ctl.exe') -D $Data -m fast -w stop | Out-Null
    if ($LASTEXITCODE -ne 0) {
      Write-Error "pg_ctl stop exited $LASTEXITCODE. Data directory left in place: $Data"
      $serverStarted = $true
    } else {
      $serverStarted = $false
    }
  }
  if (-not $serverStarted -and (Test-VerifiedDataDir)) {
    Remove-Item -LiteralPath $Data -Recurse -Force
    if (Test-Path $Data) {
      Write-Error "temporary data directory still exists: $Data"
    } else {
      Write-Output "REMOVED $Data"
    }
  } elseif ($ownsData -and -not (Test-VerifiedDataDir)) {
    Write-Error "refused to delete unverified directory: $Data"
  }
}
