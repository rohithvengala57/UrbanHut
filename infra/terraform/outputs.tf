output "cloudfront_domain" {
  description = "CloudFront distribution domain — use this as the API base URL in the mobile app"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "api_gateway_url" {
  description = "Direct API Gateway URL (use CloudFront domain in production)"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "rds_proxy_endpoint" {
  description = "RDS Proxy endpoint used in the Lambda DATABASE_URL"
  value       = aws_db_proxy.main.endpoint
  sensitive   = true
}

output "s3_media_bucket" {
  description = "S3 bucket name for media uploads"
  value       = aws_s3_bucket.media.id
}

output "dynamodb_rate_limit_table" {
  description = "DynamoDB table name for rate limiting — set as DYNAMODB_RATE_LIMIT_TABLE env var"
  value       = aws_dynamodb_table.rate_limits.name
}

output "lambda_function_name" {
  description = "Lambda function name for manual invocations and CI/CD deploys"
  value       = aws_lambda_function.api.function_name
}
