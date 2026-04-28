# ─── CloudWatch Billing Alarms ────────────────────────────────────────────────
# Billing metrics only exist in us-east-1 — provider alias is required.
# Alarm fires at $0.01 to give maximum lead time before any cost escapes free tier.

resource "aws_sns_topic" "billing_alerts" {
  provider = aws.us_east_1
  name     = "${local.prefix}-billing-alerts"
}

resource "aws_sns_topic_subscription" "billing_email" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.billing_alerts.arn
  protocol  = "email"
  endpoint  = var.billing_alert_email
}

resource "aws_cloudwatch_metric_alarm" "estimated_charges" {
  provider = aws.us_east_1

  alarm_name          = "${local.prefix}-estimated-charges"
  alarm_description   = "Alert when AWS estimated charges exceed $${var.billing_alarm_threshold_usd}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 86400  # Daily — billing metric updates ~3× per day
  statistic           = "Maximum"
  threshold           = var.billing_alarm_threshold_usd
  treat_missing_data  = "notBreaching"

  dimensions = {
    Currency = "USD"
  }

  alarm_actions = [aws_sns_topic.billing_alerts.arn]
  ok_actions    = [aws_sns_topic.billing_alerts.arn]

  tags = { Name = "${local.prefix}-estimated-charges-alarm" }
}

# ─── Lambda error rate alarm ─────────────────────────────────────────────────

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${local.prefix}-lambda-error-rate"
  alarm_description   = "Lambda error rate exceeded 5% over 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 5
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "100 * errors / MAX([errors, invocations])"
    label       = "Error Rate (%)"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = aws_lambda_function.api.function_name
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = aws_lambda_function.api.function_name
      }
    }
  }

  alarm_actions = [aws_sns_topic.billing_alerts.arn]

  tags = { Name = "${local.prefix}-lambda-error-rate-alarm" }
}

# ─── RDS storage alarm (warn before hitting 20 GB free tier limit) ────────────

resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "${local.prefix}-rds-storage-low"
  alarm_description   = "RDS free storage below 2 GB — approaching 20 GB limit"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2147483648  # 2 GB in bytes
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  alarm_actions = [aws_sns_topic.billing_alerts.arn]

  tags = { Name = "${local.prefix}-rds-storage-alarm" }
}
