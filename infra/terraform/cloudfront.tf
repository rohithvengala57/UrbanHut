# ─── CloudFront Distribution ──────────────────────────────────────────────────
# Free tier: 1 TB data transfer out, 10M HTTP(S) requests/month.
# Two origins: API Gateway (dynamic) + S3 (media assets).
# Routes /media/* to S3; everything else to the Lambda API.

resource "aws_cloudfront_distribution" "main" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${local.prefix} — API + Media CDN"
  price_class     = "PriceClass_100"  # US + Europe only; cheapest option

  # ─── Origin: API Gateway ────────────────────────────────────────────────────
  origin {
    origin_id   = "apigw"
    domain_name = replace(aws_apigatewayv2_stage.default.invoke_url, "https://", "")

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ─── Origin: S3 Media ───────────────────────────────────────────────────────
  origin {
    origin_id                = "s3-media"
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  # ─── Default Behavior: API (no caching for dynamic responses) ───────────────
  default_cache_behavior {
    target_origin_id       = "apigw"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "X-App-Version", "Content-Type"]
      cookies {
        forward = "none"
      }
    }

    # Low TTL for API responses — clients should use Cache-Control headers
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ─── /media/* Behavior: S3 (longer cache for static assets) ─────────────────
  ordered_cache_behavior {
    path_pattern           = "/media/*"
    target_origin_id       = "s3-media"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400    # 1 day
    max_ttl     = 31536000 # 1 year
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true  # Use *.cloudfront.net; add ACM cert for custom domain
  }

  tags = { Name = "${local.prefix}-cdn" }
}
