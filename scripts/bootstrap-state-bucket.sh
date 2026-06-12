#!/usr/bin/env bash
# Run ONCE to create the S3 bucket that stores Terraform state for TypeTastic.
# Usage: ./scripts/bootstrap-state-bucket.sh <bucket-name>
# Example: ./scripts/bootstrap-state-bucket.sh tt-terraform-state-abc123
#
# After running:
#   1. Add the bucket name as GitHub secret TF_STATE_BUCKET
#   2. cd infra && terraform init -backend-config="bucket=<bucket-name>"
#   3. Commit infra/.terraform.lock.hcl

set -euo pipefail

BUCKET="${1:?Usage: $0 <bucket-name>}"
REGION="ap-southeast-2"

echo "Creating Terraform state bucket: $BUCKET"

aws s3api create-bucket \
  --bucket "$BUCKET" \
  --region "$REGION" \
  --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo ""
echo "✓ State bucket ready: $BUCKET"
echo ""
echo "Next steps:"
echo "  1. Add GitHub secret  → TF_STATE_BUCKET=$BUCKET"
echo "  2. cd infra && terraform init -backend-config=\"bucket=$BUCKET\""
echo "  3. Run: terraform apply"
echo "  4. Copy terraform outputs to GitHub secrets:"
echo "       COGNITO_USER_POOL_ID"
echo "       COGNITO_CLIENT_ID"
echo "       API_BASE_URL"
echo "       AWS_S3_BUCKET_NAME"
echo "       AWS_CLOUDFRONT_DISTRIBUTION_ID"
