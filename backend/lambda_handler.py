"""
AWS Lambda entry point — wraps FastAPI app with Mangum ASGI adapter.

Deploy via infra/scripts/package_lambda.sh → infra/terraform/lambda.tf.
For local dev, use uvicorn directly (CLAUDE.md quick-start).
"""

from mangum import Mangum
from app.main import app

# lifespan="off" because Lambda doesn't support long-lived startup/shutdown hooks.
# The app's @asynccontextmanager lifespan is only useful for persistent servers.
handler = Mangum(app, lifespan="off")
