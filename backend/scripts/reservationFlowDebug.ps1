$ErrorActionPreference = 'Stop'

$api = 'http://localhost:5000/api'

$loginBody = @{ email = 'test.customer@example.com'; password = 'Test@1234' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$api/auth/customer-login" -ContentType 'application/json' -Body $loginBody

Write-Host ("LOGIN_RESPONSE=" + ($login | ConvertTo-Json -Compress))

$token = $login.token
if (-not $token) { throw 'Token missing from login response' }

$headers = @{ Authorization = "Bearer $token" }

$products = Invoke-RestMethod -Method Get -Uri "$api/products" -Headers $headers
Write-Host ("PRODUCTS_RESPONSE=" + ($products | ConvertTo-Json -Compress))

$reservationBody = @{ productId = 1; quantity = 1 } | ConvertTo-Json
$reservation = Invoke-RestMethod -Method Post -Uri "$api/reservations" -Headers $headers -ContentType 'application/json' -Body $reservationBody
Write-Host ("RESERVATION_RESPONSE=" + ($reservation | ConvertTo-Json -Compress))

$my = Invoke-RestMethod -Method Get -Uri "$api/reservations/my" -Headers $headers
Write-Host ("MY_RESERVATIONS_RESPONSE=" + ($my | ConvertTo-Json -Compress))
