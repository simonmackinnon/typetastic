# Copy these into GitHub Secrets after `terraform apply`:

output "cognito_user_pool_id" {
  description = "→ GitHub secret COGNITO_USER_POOL_ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "→ GitHub secret COGNITO_CLIENT_ID"
  value       = aws_cognito_user_pool_client.spa.id
}

output "api_base_url" {
  description = "→ GitHub secret API_BASE_URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "s3_bucket_name" {
  description = "→ GitHub secret AWS_S3_BUCKET_NAME"
  value       = aws_s3_bucket.spa.bucket
}

output "cloudfront_distribution_id" {
  description = "→ GitHub secret AWS_CLOUDFRONT_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.spa.id
}

output "site_url" {
  description = "Live URL of the TypeStar app"
  value       = "https://${local.subdomain}"
}
