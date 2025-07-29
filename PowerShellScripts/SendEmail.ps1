# Log file handling
$PrevDate = (Get-Date).AddDays(-1).ToString("yyyyMMdd")
$Today = (Get-Date).ToString("yyyyMMdd")
$CurrentLogFile = "C:\Path\To\Logs\SendEmailLog-$Today.txt"
$oldlogfile = "C:\Path\To\Logs\SendEmailLog-$PrevDate.txt"

Get-ChildItem -File $oldlogfile -ErrorAction SilentlyContinue | Move-Item -Destination "C:\Path\To\Logs\Archive\"
Get-ChildItem -Path "C:\Path\To\Logs\Archive\" -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item

Start-Transcript -Append -NoClobber -Path $CurrentLogFile
Write-Host "Started Run $(Get-Date -Format 'MM/dd/yyyy HH:mm:ss')..."

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
        "Authorization" = "Bearer $AuthToken"
    }

    $response = Invoke-RestMethod 'https://api.example.com/repository/v2/Repositories' -Method 'GET' -Headers $headers
}
catch {
    $headers = @{
        "Content-Type" = "application/x-www-form-urlencoded"
        "Accept" = "application/json"
        "Authorization" = "Bearer [REDACTED_ACCESS_TOKEN]"
    }

    $body = "grant_type=client_credentials&scope=repository.Read%20repository.Write"
    $authTokenResponse = Invoke-RestMethod 'https://signin.example.com/oauth/token' -Method 'POST' -Headers $headers -Body $body
    $AuthToken = $authTokenResponse.access_token

    $headers = @{
        "Content-Type" = "application/json"
        "Accept" = "application/json"
        "Authorization" = "Bearer $AuthToken"
    }
}

# Credentials
$username = "[REDACTED_EMAIL]"
$password = ConvertTo-SecureString "[REDACTED_PASSWORD]" -AsPlainText -Force
$credential = New-Object System.Management.Automation.PSCredential($username, $password)

# Load variables
$body = Get-Content "C:\Path\To\ExportEntryVariables.json"

# Outlook interop
Add-Type -AssemblyName "Microsoft.Office.Interop.Outlook"
Add-Type -AssemblyName "System.Runtime.Interopservices"

try {
    $outlook = [Runtime.Interopservices.Marshal]::GetActiveObject('Outlook.Application')
} catch {
    try {
        $outlook = New-Object -ComObject Outlook.Application
    } catch {
        Write-Host "Cannot open Outlook. Try closing it manually and rerunning."
        exit
    }
}

$namespace = $outlook.GetNamespace("MAPI")
$inbox = $namespace.GetDefaultFolder([Microsoft.Office.Interop.Outlook.OlDefaultFolders]::olFolderInbox)
$emails = $inbox.Items | Where-Object { $_.Subject -like "[Entry]*????" }
$targetFolder = $inbox.Folders | Where-Object { $_.Name -eq "Completed" }

if ($emails -eq $null) {
    Write-Host "No Emails to process"
} else {
    foreach ($email in $emails) {
        $entryNo = $email.Subject -replace "EntryID - ", ""

        $requestURL = "https://api.example.com/repository/v2/Repositories/[REDACTED_ID]/Entries/$entryNo"
        $FunctRequestUrl = "$requestURL/Export"

        $responseName = Invoke-RestMethod $requestURL -Method 'GET' -Headers $headers
        $filename = "C:\Path\To\Invoices\$($responseName.name).pdf"
        $archiveFile = "C:\Path\To\Invoices\Archive\$($responseName.name).pdf"

        $response = Invoke-RestMethod $FunctRequestUrl -Method 'POST' -Headers $headers -Body $body
        $hyperlink = $response.value

        Invoke-RestMethod -Uri $hyperlink -OutFile $filename

        $emailRequestUrl = "$requestURL/Fields"
        $response = Invoke-RestMethod $emailRequestUrl -Method 'GET' -Headers $headers

        $toEmail = ($response.value | Where-Object { $_.name -eq "CSREmail" }).values -join ";"
        $ccEmail = ($response.value | Where-Object { $_.name -eq "CCs" }).values -join ";"
        $DocType = ($response.value | Where-Object { $_.name -eq "Document Type" }).values
        $Client = ($response.value | Where-Object { $_.name -eq "Account Code" }).values
        $Invoice = ($response.value | Where-Object { $_.name -eq "Invoice Number" }).values -replace "C2-000", ""

        $subject = "$DocType - $Invoice - $Client"

        $sendMailParams = @{
            From = "[REDACTED_FROM_EMAIL]"
            To = $toEmail
            Subject = $subject
            Body = $hyperlink
            SMTPServer = "smtp.office365.com"
            UseSsl = $true
            Credential = $credential
            Attachments = $filename
        }

        if ($ccEmail) {
            $sendMailParams.cc = $ccEmail
        }

        $sendMailParams.bcc = "[REDACTED_BCC]"

        try {
            Send-MailMessage @sendMailParams
            Write-Host "Sent Email"
        } catch {
            Write-Host "No email sent"
        }

        Move-Item -Path $filename -Destination $archiveFile -Force
        $email.Move($targetFolder)
        Write-Host "Moved file and email"
    }
}
