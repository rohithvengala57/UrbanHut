# ─── DynamoDB — Rate Limiting (replaces Redis for perpetual $0 cost) ──────────
# Free tier: 25 GB storage, 25 WCU, 25 RCU — rate-limiting counters are tiny.
# TTL removes expired windows automatically so storage stays near-zero.

resource "aws_dynamodb_table" "rate_limits" {
  name         = "${local.prefix}-rate-limits"
  billing_mode = "PAY_PER_REQUEST"  # On-demand; falls within free tier allowance

  hash_key = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false  # Not needed for ephemeral rate-limit counters
  }

  tags = { Name = "${local.prefix}-rate-limits" }
}
