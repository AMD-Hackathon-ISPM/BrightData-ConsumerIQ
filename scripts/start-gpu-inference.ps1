param(
    [switch]$Rebuild
)

$network    = "k3d-consumeriq-local"
$containers = [ordered]@{
    "ciq-inference-gpu"  = "localhost:5001/consumeriq-inference:local"
    "ciq-translator-gpu" = "localhost:5001/consumeriq-translator:local"
}

if ($Rebuild) {
    Write-Host "==> Rebuilding images..."
    docker build -t localhost:5001/consumeriq-inference:local -f inference/Dockerfile .
    docker push localhost:5001/consumeriq-inference:local
    docker build -t localhost:5001/consumeriq-translator:local -f inference/translator.Dockerfile .
    docker push localhost:5001/consumeriq-translator:local
}

foreach ($name in $containers.Keys) {
    $image    = $containers[$name]
    $existing = docker ps -a --filter "name=^${name}$" --format "{{.Names}}" 2>$null
    if ($existing) {
        Write-Host "==> Removing existing container: $name"
        docker stop $name 2>$null | Out-Null
        docker rm   $name 2>$null | Out-Null
    }
    Write-Host "==> Starting $name"
    docker run -d `
        --name $name `
        --gpus all `
        --network $network `
        --restart unless-stopped `
        $image | Out-Null
}

Write-Host "==> Waiting for containers to get network addresses..."
Start-Sleep -Seconds 3

function Get-ContainerIP($name) {
    $info = docker inspect $name | ConvertFrom-Json
    return $info.NetworkSettings.Networks.$network.IPAddress
}

$inferenceIP  = Get-ContainerIP "ciq-inference-gpu"
$translatorIP = Get-ContainerIP "ciq-translator-gpu"

if (-not $inferenceIP -or -not $translatorIP) {
    Write-Error "Could not read container IPs. Are the containers on the $network network?"
    exit 1
}

Write-Host "==> ciq-inference-gpu  : $inferenceIP"
Write-Host "==> ciq-translator-gpu : $translatorIP"

$endpointsYaml = @"
apiVersion: v1
kind: Endpoints
metadata:
  name: consumeriq-inference
  namespace: consumeriq
subsets:
  - addresses:
      - ip: $inferenceIP
    ports:
      - port: 8080
---
apiVersion: v1
kind: Endpoints
metadata:
  name: consumeriq-translator
  namespace: consumeriq
subsets:
  - addresses:
      - ip: $translatorIP
    ports:
      - port: 8080
"@

$endpointsYaml | kubectl apply -f -
Write-Host "==> Done. Inference endpoints wired to k8s."
