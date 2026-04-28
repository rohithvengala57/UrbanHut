# ─── Lambda — FastAPI via Mangum adapter ──────────────────────────────────────
# Free tier: 1M requests/month, 400k GB-seconds.
# At 512 MB + 200ms avg = ~0.10 GB-seconds per request → ~4M requests free.

# ─── IAM Role ─────────────────────────────────────────────────────────────────

resource "aws_iam_role" "lambda" {
  name = "${local.prefix}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_app" {
  name = "${local.prefix}-lambda-app-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDB"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
        ]
        Resource = [aws_dynamodb_table.rate_limits.arn]
      },
      {
        Sid    = "S3Media"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*",
        ]
      },
      {
        Sid    = "RDSProxyConnect"
        Effect = "Allow"
        Action = ["rds-db:connect"]
        Resource = [
          "arn:aws:rds-db:${var.aws_region}:*:dbuser:${aws_db_proxy.main.id}/*"
        ]
      },
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ─── Lambda Function ──────────────────────────────────────────────────────────

resource "aws_lambda_function" "api" {
  function_name = "${local.prefix}-api"
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.12"
  handler       = "lambda_handler.handler"
  filename      = var.lambda_zip_path
  timeout       = var.lambda_timeout_seconds
  memory_size   = var.lambda_memory_mb

  source_code_hash = filebase64sha256(var.lambda_zip_path)

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DATABASE_URL               = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_db_proxy.main.endpoint}:5432/${var.db_name}"
      JWT_SECRET_KEY             = var.jwt_secret_key
      AWS_S3_BUCKET              = aws_s3_bucket.media.id
      AWS_REGION                 = var.aws_region
      DYNAMODB_RATE_LIMIT_TABLE  = aws_dynamodb_table.rate_limits.name
      RESEND_API_KEY             = var.resend_api_key
      GOOGLE_MAPS_API_KEY        = var.google_maps_api_key
      EXPO_ACCESS_TOKEN          = var.expo_access_token
      CORS_ORIGINS               = "https://${aws_cloudfront_distribution.main.domain_name}"
    }
  }

  tags = { Name = "${local.prefix}-api" }

  depends_on = [aws_iam_role_policy_attachment.lambda_vpc]
}

resource "aws_cloudwatch_log_group" "lambda_api" {
  name              = "/aws/lambda/${aws_lambda_function.api.function_name}"
  retention_in_days = 14
}

# ─── Keep-warm EventBridge rule (avoids cold-start latency for active users) ──

resource "aws_cloudwatch_event_rule" "lambda_warmup" {
  name                = "${local.prefix}-lambda-warmup"
  description         = "Ping API Lambda every 5 minutes to prevent cold starts"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "lambda_warmup" {
  rule      = aws_cloudwatch_event_rule.lambda_warmup.name
  target_id = "WarmupTarget"
  arn       = aws_lambda_function.api.arn
  input     = jsonencode({ source = "warmup" })
}

resource "aws_lambda_permission" "allow_eventbridge_warmup" {
  statement_id  = "AllowWarmupFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_warmup.arn
}

# ─── API Gateway HTTP API (v2 — cheaper and lower latency than REST API) ──────

resource "aws_apigatewayv2_api" "main" {
  name          = "${local.prefix}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.apigw.arn
  }
}

resource "aws_cloudwatch_log_group" "apigw" {
  name              = "/aws/apigateway/${local.prefix}"
  retention_in_days = 14
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_lambda_permission" "allow_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
