from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://urbanhut:urbanhut_dev@localhost:5432/urbanhut"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Must be set via env in production — no insecure default
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Comma-separated list of allowed CORS origins.
    # In production set to your actual frontend domain(s).
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8081,exp://localhost:8081"

    AWS_S3_BUCKET: str = ""
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    EXPO_ACCESS_TOKEN: str = ""

    RESEND_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    APPLE_SIGN_IN_KEY: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
