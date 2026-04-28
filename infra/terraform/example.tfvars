# Copy this file to prod.tfvars and fill in the values.
# NEVER commit prod.tfvars — it is in .gitignore.
#
# Deploy:
#   cd infra/terraform
#   terraform init
#   terraform plan -var-file=prod.tfvars
#   terraform apply -var-file=prod.tfvars

aws_region  = "us-east-1"
environment = "prod"
app_name    = "urbanhut"

# ─── Database ─────────────────────────────────────────────────────────────────
db_name     = "urbanhut"
db_username = "urbanhut_admin"
db_password = "CHANGE_ME_generate_with_openssl_rand_hex_32"

# ─── Lambda packaging ─────────────────────────────────────────────────────────
# Run infra/scripts/package_lambda.sh first to generate this zip.
lambda_zip_path        = "../../backend/dist/lambda_package.zip"
lambda_memory_mb       = 512
lambda_timeout_seconds = 30

# ─── Application secrets ──────────────────────────────────────────────────────
jwt_secret_key      = "CHANGE_ME_generate_with_python_secrets_token_hex_32"
resend_api_key      = ""
google_maps_api_key = ""
expo_access_token   = ""

# ─── Billing alerts ───────────────────────────────────────────────────────────
billing_alert_email         = "your-email@example.com"
billing_alarm_threshold_usd = 0.01
