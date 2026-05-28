param(
    [string]$BaseUrl = "http://localhost:30080",
    [string]$Email = "",
    [string]$Password = "ConsumerIQTest123!",
    [int]$TimeoutMinutes = 20,
    [int]$PollSeconds = 5
)

$ErrorActionPreference = "Stop"

if (-not $Email) {
    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    $Email = "ciq-pipeline-test+$stamp@example.com"
}

$BaseUrl = $BaseUrl.TrimEnd("/")

$payload = @{
    fullName = "Pipeline Test User"
    workEmail = $Email
    password = $Password
    workspaceName = "Pipeline QA"
    industry = "skincare"
    region = "Indonesia"
    country = "Indonesia"
    countryCode = "ID"
    marketplace = "amazon"
    competitors = @("Skintific", "The Originote", "Somethinc")
    searchIntentKeywords = @("skincare barrier repair", "hydrating serum indonesia")
    customerSegment = "Gen Z and young professionals with sensitive skin"
    painPoint = "Skin barrier damage, redness, and acne after active ingredients"
    priceRangeMin = 75000
    priceRangeMax = 180000
    targetMarketDetail = "Urban Indonesian beauty consumers who buy through TikTok Shop and marketplaces"
    productName = "CalmBarrier Hydrating Serum"
    productDescription = "A lightweight local skincare serum for repairing skin barrier, reducing redness, and hydrating oily-sensitive skin in humid weather."
    uniqueSellingPoint = "Fast calming serum with ceramide, panthenol, and centella, made for humid Indonesian climate."
    mainFeatures = "Ceramide complex, panthenol, centella asiatica, fragrance-free, non-sticky texture"
    competitiveAdvantage = "Local price point with premium sensitive-skin positioning and marketplace-friendly bundle packs"
} | ConvertTo-Json -Depth 8

Write-Host "Submitting founder form to $BaseUrl/go-api/founder-form/submit"
$submit = Invoke-RestMethod `
    -Uri "$BaseUrl/go-api/founder-form/submit" `
    -Method Post `
    -ContentType "application/json" `
    -Body $payload

$formId = $submit.id
$token = $submit.token

if (-not $formId -or -not $token) {
    throw "Form submit did not return id/token. Response: $($submit | ConvertTo-Json -Depth 8)"
}

Write-Host "Form submitted. formId=$formId"
Write-Host "Polling pipeline until inference completes..."

$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$headers = @{ Authorization = "Bearer $token" }
$last = $null

while ((Get-Date) -lt $deadline) {
    $pipeline = Invoke-RestMethod `
        -Uri "$BaseUrl/api/form-pipeline/$formId" `
        -Method Get `
        -Headers $headers

    $scrapeStatus = $pipeline.scraping.status
    $signalsStored = 0
    if ($null -ne $pipeline.scraping.signalsStored) {
        $signalsStored = [int]$pipeline.scraping.signalsStored
    }
    $inferenceStatus = $pipeline.inference.status
    $line = "scrape=$scrapeStatus signals=$signalsStored inference=$inferenceStatus"

    if ($line -ne $last) {
        Write-Host $line
        $last = $line
    }

    if ($scrapeStatus -eq "failed") {
        throw "Scraping failed for formId=$formId"
    }
    if ($inferenceStatus -eq "failed") {
        throw "Inference failed for formId=$formId"
    }
    if ($inferenceStatus -eq "completed") {
        if ($signalsStored -le 0) {
            throw "Inference completed but no market signals were stored."
        }
        Write-Host "PASS: pipeline completed. formId=$formId signalsStored=$signalsStored"
        exit 0
    }

    Start-Sleep -Seconds $PollSeconds
}

throw "Timed out after $TimeoutMinutes minutes waiting for pipeline. formId=$formId last=$last"
