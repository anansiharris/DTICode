param([string]$excelFilePath)

if ($excelFilePath -eq "") {
    $excelFilePath = "C:\Path\To\Input\File.xlsx"
}

# --- CONFIGURATION ---
$logPath = "C:\Logs\ExcelHeadlessLog.txt"
$logDir = Split-Path $logPath
if (!(Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
}

function Write-Log {
    param ([string]$msg)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logPath -Value "$timestamp - $msg"
}

try {
    Write-Log "Processing: $excelFilePath"

    if (!(Test-Path $excelFilePath)) {
        throw "File not found: $excelFilePath"
    }

    # Step 1: Read A1 for 10-digit value
    $raw = Import-Excel -Path $excelFilePath -NoHeader
    $firstValue = $raw[0].P1

    if ($firstValue -match "\b\d{10}\b") {
        $tenDigit = $matches[0]
        Write-Log "Found 10-digit value in A1: $tenDigit"
    } else {
        throw "No 10-digit value found in A1"
    }

    # Step 2: Load actual data using row 2 as headers
    $data = Import-Excel -Path $excelFilePath -StartRow 2
    if ($data.Count -eq 0) {
        throw "No data found after header row."
    }

    $headers = $data[0].psobject.Properties.Name
    Write-Log "Detected headers: $($headers -join ', ')"

    # Step 3: Process data rows
    foreach ($row in $data) {
        $colA = $headers[0]
        if ($row.$colA -match "CHEP") {
            $row.$colA = ($row.$colA -replace "(?i)CHEP", "").Trim()
        }

        $colE = $headers[4]  # Column E (5th column)
        $colF = "PO"

        if ($row.$colE) {
            $row | Add-Member -NotePropertyName $colF -NotePropertyValue $tenDigit -Force
        } else {
            $row | Add-Member -NotePropertyName $colF -NotePropertyValue "" -Force
        }
    }

    # Clean nulls in PO column to empty strings
    foreach ($row in $data) {
        if (-not $row.PO) { $row.PO = "" }
    }

    # Step 4: Export without NumberFormat or AutoSize to avoid styles issues
    $outputFile = [System.IO.Path]::ChangeExtension($excelFilePath, $null) + "_UPD.xlsx"

    $data | Export-Excel -Path $outputFile `
                         -WorksheetName 'Updated' `
                         -ClearSheet `
                         -AutoSize:$false `
                         -NoStyle `
                         -KillExcel

    Write-Log "Exported updated file to: $outputFile"

} catch {
    Write-Log "ERROR: $_"
}
