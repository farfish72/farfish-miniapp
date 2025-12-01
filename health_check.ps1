# Health check script
$baseUrl = "http://localhost:3000"
$results = @()

function Test-Endpoint {
    param($url, $expectedPhrase)
    try {
        $start = Get-Date
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $elapsed = ((Get-Date) - $start).TotalMilliseconds
        
        $hasPhrase = $response.Content -match $expectedPhrase
        
        return @{
            url = $url
            status = $response.StatusCode
            latency = [math]::Round($elapsed, 0)
            phraseCheck = if ($hasPhrase) { "PASS" } else { "FAIL" }
            error = $null
        }
    } catch {
        return @{
            url = $url
            status = $_.Exception.Response.StatusCode.value__
            latency = 0
            phraseCheck = "ERROR"
            error = $_.Exception.Message
        }
    }
}

# Test endpoints
$results += Test-Endpoint "$baseUrl/" "Mint FarFISH NFTs|FarFISH"
$results += Test-Endpoint "$baseUrl/stake" "Choose a staking period|Locked Staking"
$results += Test-Endpoint "$baseUrl/profile" "Refer & Earn|Verify & Get Link"
$results += Test-Endpoint "$baseUrl/share?ref=0" "FarFISH|Open FarFISH"

# Test webhook
try {
    $start = Get-Date
    $body = @{ test = $true } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/webhook" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $elapsed = ((Get-Date) - $start).TotalMilliseconds
    $results += @{
        url = "$baseUrl/api/webhook"
        status = $response.StatusCode
        latency = [math]::Round($elapsed, 0)
        phraseCheck = "PASS"
        error = $null
    }
} catch {
    $results += @{
        url = "$baseUrl/api/webhook"
        status = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        latency = 0
        phraseCheck = "ERROR"
        error = $_.Exception.Message
    }
}

$results | ConvertTo-Json -Compress

