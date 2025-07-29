### SET FOLDER TO WATCH + FILES TO WATCH + SUBFOLDERS YES/NO 
$SourceFolder   = "C:\Path\To\Watch\Inbound"
$ArchiveFolder  = "C:\Path\To\Archive"
$ErrorFolder    = "C:\Path\To\Error"
$SheetName      = "YourSheetName"
$LogFolder      = "C:\Path\To\Logs"
$LogFile        = "$LogFolder\ConvertToText_$(Get-Date -Format 'yyyy-MM-dd').log"

# Ensure necessary folders exist
foreach ($folder in @($SourceFolder, $ArchiveFolder, $ErrorFolder, $LogFolder)) {
    if (-Not (Test-Path $folder)) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }
}

# Function to clean old logs
function Cleanup-OldLogs {
    Get-ChildItem -Path $LogFolder -Filter "ConvertToText_*.log" |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
        Remove-Item -Force
}

# Function to write logs
function Write-Log {
    param (
        [string]$Message,
        [string]$LogLevel = "INFO"
    )
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$Timestamp [$LogLevel] $Message" | Out-File -Append -FilePath $LogFile
}

# Run cleanup
Cleanup-OldLogs
Write-Log "Script started successfully."

# Function to process Excel files
function Process-ExcelFiles {
    $ExcelFiles = Get-ChildItem -Path $SourceFolder -Filter "*.xlsx"

    if ($ExcelFiles.Count -eq 0) {
        Write-Log "No Excel files found in $SourceFolder."
        return
    }

    $Excel = $null
    try {
        $Excel = New-Object -ComObject Excel.Application -ErrorAction Stop
        $Excel.Visible = $false  
        $Excel.DisplayAlerts = $false  
    } catch {
        Write-Log "❌ ERROR: Unable to start Excel COM object." -LogLevel "ERROR"
        return
    }

    foreach ($File in $ExcelFiles) {
        $ExcelFilePath = $File.FullName
        Write-Log "Processing: $ExcelFilePath"
        $Workbook = $null
        $ErrorOccurred = $false

        try {
            $Workbook = $Excel.Workbooks.Open($ExcelFilePath, 0, $false)
            if ($Workbook -eq $null) {
                Write-Log "Error: Unable to open workbook $ExcelFilePath" -LogLevel "ERROR"
                continue
            }

            $Sheet = $Workbook.Sheets.Item($SheetName)
            if ($Sheet -eq $null) {
                Write-Log "Error: Sheet '$SheetName' not found in $ExcelFilePath." -LogLevel "ERROR"
                throw "SheetNotFound"
            }

            $UsedRange = $Sheet.UsedRange
            $RowCount = $UsedRange.Rows.Count
            $ColCount = $UsedRange.Columns.Count

            if ($ColCount -ge 10) { $Sheet.Columns(10).NumberFormat = "@" }

            $Data = $UsedRange.Value2  

            for ($row = 1; $row -le $RowCount; $row++) {
                for ($col = 1; $col -le $ColCount; $col++) {
                    $cellValue = $Data[$row, $col]
                    if ($null -eq $cellValue -or $cellValue -eq "") { continue }

                    if ($cellValue -eq "#N/A") { $Data[$row, $col] = "" }
                    elseif ($Sheet.Cells.Item($row, $col).HasFormula -eq $true) {
                        $Data[$row, $col] = $cellValue
                    }
                }
            }

            $UsedRange.Value2 = $Data

            $ColumnK = $Sheet.Columns.Item(11)
            $ColumnK.Copy()
            $ColumnK.PasteSpecial(-4163)
            $Excel.CutCopyMode = [Microsoft.Office.Interop.Excel.XlCutCopyMode]::xlCut

            $Workbook.SaveAs($ExcelFilePath, [Type]::Missing, [Type]::Missing, [Type]::Missing, $false, $false, 1, 2)
            Write-Log "Successfully processed: $ExcelFilePath"
        }
        catch {
            Write-Log "⚠️ Error processing $($ExcelFilePath): $($_.Exception.Message)" -LogLevel "ERROR"
        }
        finally {
            if ($Workbook -ne $null) {
                $Workbook.Close($true)
            }

            if (Test-Path $ExcelFilePath) {
                try {
                    Move-Item -Path $ExcelFilePath -Destination $ArchiveFolder -Force
                    Write-Log "📂 File moved to: $ArchiveFolder"
                } catch {
                    Write-Log "Error: Could not move file to archive - $($_.Exception.Message)" -LogLevel "ERROR"
                }
            }
        }
    }

    $Excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($Excel) | Out-Null
    Remove-Variable Excel -ErrorAction SilentlyContinue
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()

    Write-Log "✅ Batch processing completed."
}

# Process existing files immediately
Process-ExcelFiles

# File watcher
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $SourceFolder
$watcher.Filter = "*.xlsx"
$watcher.IncludeSubdirectories = $false
$watcher.EnableRaisingEvents = $true  

$action = { Process-ExcelFiles }

Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Renamed" -Action $action

while ($true) { Start-Sleep -Seconds 5 }
