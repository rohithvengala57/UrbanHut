variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "app_name" {
  description = "Application name used as a prefix for all resources"
  type        = string
  default     = "urbanhut"
}

# ─── Database ─────────────────────────────────────────────────────────────────

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "urbanhut"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "urbanhut_admin"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password — set via TF_VAR_db_password env var"
  type        = string
  sensitive   = true
}

# ─── Lambda ───────────────────────────────────────────────────────────────────

variable "lambda_memory_mb" {
  description = "Lambda memory allocation in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout_seconds" {
  description = "Lambda invocation timeout in seconds"
  type        = number
  default     = 30
}

variable "lambda_zip_path" {
  description = "Path to the deployment zip created by scripts/package_lambda.sh"
  type        = string
  default     = "../../backend/dist/lambda_package.zip"
}

# ─── Application secrets (passed as Lambda env vars) ─────────────────────────

variable "jwt_secret_key" {
  description = "FastAPI JWT signing secret — set via TF_VAR_jwt_secret_key"
  type        = string
  sensitive   = true
}

variable "resend_api_key" {
  description = "Resend transactional email API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_maps_api_key" {
  description = "Google Maps Geocoding API key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "expo_access_token" {
  description = "Expo push notification access token"
  type        = string
  default     = ""
  sensitive   = true
}

# ─── Billing alerts ───────────────────────────────────────────────────────────

variable "billing_alert_email" {
  description = "Email address for CloudWatch billing alarm notifications"
  type        = string
}

variable "billing_alarm_threshold_usd" {
  description = "Billing alarm fires when estimated charges exceed this amount (USD)"
  type        = number
  default     = 0.01
}
