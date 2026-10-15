# Disposable local cluster for append_score_event_guarded.
# Talks only to 127.0.0.1. Does not open a Supabase connection.
$ErrorActionPreference = 'Stop'

$Bin = 'C:\Program Files\PostgreSQL\18\bin'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Stamp = [guid]::NewGuid().ToString('n')
$Data = Join-Path $env:TEMP "fleg-append-score-event-guarded-pg18-$Stamp"
$Port = 55432
$Database = 'fleg_score_guard'
$HostAddr = '127.0.0.1'
$ownsData = $false
$serverStarted = $false

function Test-VerifiedDataDir {
  if (-not $ownsData) { return $false }
  $tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\')
  $full = [IO.Path]::GetFullPath($Data).TrimEnd('\')
  if (-not $full.StartsWith($tempRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { return $false }
  if ((Split-Path $full -Leaf) -ne "fleg-append-score-event-guarded-pg18-$Stamp") { return $false }
  $markerPath = Join-Path $full 'FLEG_SCORE_GUARD_HARNESS.txt'
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
    [string]$Command,
    [string]$File
  )
  $args = @(
    '-h', $HostAddr,
    '-p', "$Port",
    '-U', 'postgres',
    '-d', $DatabaseName,
    '-q',
    '-v', 'ON_ERROR_STOP=1'
  )
  if ($File) {
    $args += @('-f', $File)
  } else {
    $args += @('-t', '-A', '-c', $Command)
  }
  $output = & (Join-Path $Bin 'psql.exe') @args 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "psql exited $LASTEXITCODE`n$output"
  }
  return (($output | Out-String).Trim())
}

$forbidden = @(
  'reg_forms',
  'reg_form_categories',
  'reg_submissions',
  'reg_submission_categories',
  'aiko_registrations',
  'aiko_registration_categories',
  'aiko_registration_controls',
  'aiko_payments',
  'awareness_run_registrations',
  'coffee_run_registrations',
  'coffee_run2_registrations',
  'darts_registrations',
  'fleg_one_registrations',
  'fleg_one_jj_registrations',
  'nprs_membership_payments',
  'payouts',
  'public_events',
  'rmlcf_pickleball_registrations',
  'run_registrations',
  'st_payments',
  'st_registrations',
  'womens_clinic_registrations',
  'workshop_capacity_adjustments',
  'workshop_registrations',
  'workshop_sessions',
  'workshops'
)

$migrationPath = Join-Path $Root 'migration.sql'
$migration = Get-Content -Raw -Path $migrationPath
$staticHits = @()
foreach ($name in $forbidden) {
  if ($migration -match [regex]::Escape($name)) {
    $staticHits += $name
  }
}
if ($migration -match '(?i)\b(reg_|payment|workshop|public_events)\b') {
  $staticHits += 'pattern:reg_/payment/workshop/public_events'
}
$advisoryAt = $migration.IndexOf('pg_advisory_xact_lock')
$forUpdateAt = $migration.IndexOf('FOR UPDATE')
$authAt = $migration.IndexOf('not_authenticated')
if ($authAt -lt 0 -or $advisoryAt -lt 0 -or $forUpdateAt -lt 0 -or -not ($authAt -lt $advisoryAt -and $advisoryAt -lt $forUpdateAt)) {
  $staticHits += 'lock order'
}
if ($migration -notmatch 'INSERT INTO public\.score_events \(match_id, event_type, payload\)') {
  $staticHits += 'insert column list'
}
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
  Set-Content -Path (Join-Path $Data 'FLEG_SCORE_GUARD_HARNESS.txt') -Value $fullData -Encoding ascii

  & (Join-Path $Bin 'pg_ctl.exe') -D $Data -l (Join-Path $Data 'server.log') -w -o "-p $Port -h $HostAddr" start
  if ($LASTEXITCODE -ne 0) { throw "pg_ctl start exited $LASTEXITCODE" }
  $serverStarted = $true

  & (Join-Path $Bin 'createdb.exe') -h $HostAddr -p $Port -U postgres $Database
  if ($LASTEXITCODE -ne 0) { throw "createdb exited $LASTEXITCODE" }

  Invoke-Psql -File (Join-Path $Root 'fixture.sql') | Out-Null
  Invoke-Psql -File $migrationPath | Out-Null
  $testOutput = Invoke-Psql -File (Join-Path $Root 'tests.sql')

  $sleepSql = @"
SELECT count(*)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state = 'active'
  AND query LIKE '%pg_sleep(%'
"@

  $psql = Join-Path $Bin 'psql.exe'
  $aOut = Join-Path $Data 'session-a.out'
  $aErr = Join-Path $Data 'session-a.err'
  $bOut = Join-Path $Data 'session-b.out'
  $bErr = Join-Path $Data 'session-b.err'
  $commonArgs = @(
    '-h', $HostAddr, '-p', "$Port", '-U', 'postgres', '-d', $Database,
    '-q', '-v', 'ON_ERROR_STOP=1'
  )

  $sessionA = Start-Process -FilePath $psql -ArgumentList ($commonArgs + @('-f', (Join-Path $Root 'concurrency-a.sql'))) -RedirectStandardOutput $aOut -RedirectStandardError $aErr -PassThru -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(15)
  $holding = $false
  do {
    Start-Sleep -Milliseconds 50
    $sleepers = Invoke-Psql -Command $sleepSql
    if ($sleepers.Trim() -eq '1') { $holding = $true; break }
    if ($sessionA.HasExited) { break }
  } while ((Get-Date) -lt $deadline)
  if (-not $holding) {
    throw "session A did not reach pg_sleep. stdout=$(Get-Content -Raw $aOut) stderr=$(Get-Content -Raw $aErr)"
  }

  $watch = [Diagnostics.Stopwatch]::StartNew()
  $sessionB = Start-Process -FilePath $psql -ArgumentList ($commonArgs + @('-f', (Join-Path $Root 'concurrency-b.sql'))) -RedirectStandardOutput $bOut -RedirectStandardError $bErr -PassThru -WindowStyle Hidden
  if (-not $sessionA.WaitForExit(20000)) { throw 'session A timed out' }
  $sessionA.WaitForExit() | Out-Null
  $aEnded = [DateTime]::UtcNow
  if (-not $sessionB.WaitForExit(20000)) { throw 'session B timed out' }
  $sessionB.WaitForExit() | Out-Null
  $watch.Stop()
  $bEnded = [DateTime]::UtcNow

  function Read-Text([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return '' }
    $raw = Get-Content -Raw -Path $Path
    if ($null -eq $raw) { return '' }
    return $raw.Trim()
  }
  $aText = Read-Text $aOut
  $bText = Read-Text $bOut
  $aErrText = Read-Text $aErr
  $bErrText = Read-Text $bErr
  Write-Output "SESSION_A_RAW=$aText"
  Write-Output "SESSION_B_RAW=$bText"
  function Assert-SessionExit($Proc, [string]$ErrText, [string]$Label) {
    $Proc.Refresh()
    $code = $Proc.ExitCode
    if ($null -eq $code) {
      if ($ErrText) { throw "$Label produced stderr and no exit code: $ErrText" }
      return
    }
    if ([int]$code -ne 0) { throw "$Label exited ${code}: $ErrText" }
  }
  Assert-SessionExit $sessionA $aErrText 'session A'
  Assert-SessionExit $sessionB $bErrText 'session B'
  if ($aText -notmatch '^t\|f\|(\d+)\|\1$') { throw "session A result was not one insert: $aText" }
  $eventId = $Matches[1]
  if ($bText -notmatch "^f\|t\|\|$eventId$") { throw "session B result was not a conflict for event ${eventId}: $bText" }
  if ($watch.ElapsedMilliseconds -lt 2000) { throw "session B did not wait: $($watch.ElapsedMilliseconds) ms" }
  if ($bEnded -lt $aEnded.AddMilliseconds(-500)) { throw "session B finished before session A committed" }

  $eventCount = Invoke-Psql -Command "SELECT count(*) FROM public.score_events WHERE match_id = '55555555-5555-4555-8555-555555555555'"
  if ($eventCount.Trim() -ne '1') { throw "concurrent match row count was $eventCount" }
  $version = Invoke-Psql -Command 'SHOW server_version'
  $versionNum = Invoke-Psql -Command 'SHOW server_version_num'

  Write-Output 'TESTS'
  Write-Output $testOutput
  Write-Output 'CONCURRENCY'
  Write-Output "session_a=$aText"
  Write-Output "session_b=$bText"
  Write-Output "session_b_elapsed_ms=$($watch.ElapsedMilliseconds)"
  Write-Output "session_a_ended_utc=$($aEnded.ToString('o'))"
  Write-Output "session_b_ended_utc=$($bEnded.ToString('o'))"
  Write-Output "concurrent_rows=$($eventCount.Trim())"
  Write-Output "server_version=$($version.Trim())"
  Write-Output "server_version_num=$($versionNum.Trim())"
  Write-Output "data_dir=$fullData"
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
