# Creates an Amplify Gen 2 service role and assigns it to the emperium-forgeworks app.
# Requires: AWS CLI configured for the same account as the Amplify app.
# Usage: .\scripts\setup-amplify-backend-role.ps1

$ErrorActionPreference = "Stop"

$AppId = "d25csy1hf0rl22"
$Region = "us-east-1"
$RoleName = "AmplifyEmperiumForgeworksBackendRole"
$TrustPolicyFile = Join-Path $PSScriptRoot "amplify-trust-policy.json"

$AccountId = (aws sts get-caller-identity --query Account --output text)
Write-Host "AWS account: $AccountId"

# Create role (idempotent: skip if exists)
$roleExists = aws iam get-role --role-name $RoleName 2>$null
if (-not $roleExists) {
  Write-Host "Creating IAM role $RoleName..."
  aws iam create-role `
    --role-name $RoleName `
    --assume-role-policy-document "file://$TrustPolicyFile" `
    --description "Amplify Gen 2 backend deploy for emperium-forgeworks"
} else {
  Write-Host "Role $RoleName already exists."
}

Write-Host "Attaching managed policies..."
aws iam attach-role-policy `
  --role-name $RoleName `
  --policy-arn "arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess"
aws iam attach-role-policy `
  --role-name $RoleName `
  --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess-Amplify"

$RoleArn = "arn:aws:iam::${AccountId}:role/${RoleName}"
Write-Host "Assigning service role to Amplify app $AppId..."
aws amplify update-app `
  --app-id $AppId `
  --region $Region `
  --iam-service-role-arn $RoleArn

# CDK bootstrap (skip if CDKToolkit already exists)
$cdkStack = aws cloudformation describe-stacks --stack-name CDKToolkit --region $Region 2>$null
if (-not $cdkStack) {
  Write-Host "Bootstrapping CDK in $Region..."
  npx aws-cdk@latest bootstrap "aws://${AccountId}/${Region}"
} else {
  Write-Host "CDKToolkit stack already present in $Region."
}

Write-Host ""
Write-Host "Done. Service role: $RoleArn"
Write-Host "Redeploy: aws amplify start-job --app-id $AppId --branch-name main --job-type RELEASE --region $Region"
