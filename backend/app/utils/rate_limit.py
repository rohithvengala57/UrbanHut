"""
DynamoDB-based fixed-window rate limiter.
Replaces Redis to ensure perpetual $0 cost on AWS Free Tier.
"""

import time
import asyncio
from typing import Tuple

import boto3
import structlog
from botocore.exceptions import ClientError

from app.config import settings

log = structlog.get_logger("app.utils.rate_limit")

_dynamo_resource = None

def _get_dynamo_client():
    global _dynamo_resource
    if _dynamo_resource is None:
        _dynamo_resource = boto3.resource(
            "dynamodb",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
    return _dynamo_resource

async def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> Tuple[bool, int]:
    """
    Fixed-window rate limit check using DynamoDB atomic counters.
    Returns (is_allowed, retry_after_seconds).
    """
    # Use fixed window based on time division
    now = int(time.time())
    window_start = (now // window_seconds) * window_seconds
    window_key = f"{key}:{window_start}"
    expiry = window_start + window_seconds + 3600  # Keep for 1 hour after window ends

    # DynamoDB calls are blocking, run in executor for FastAPI async compatibility
    return await asyncio.get_running_loop().run_in_executor(
        None, _check_rate_limit_sync, window_key, max_requests, window_seconds, window_start, expiry
    )

def _check_rate_limit_sync(
    window_key: str,
    max_requests: int,
    window_seconds: int,
    window_start: int,
    expiry: int,
) -> Tuple[bool, int]:
    try:
        table = _get_dynamo_client().Table(settings.DYNAMODB_RATE_LIMIT_TABLE)
        
        # Atomic increment
        response = table.update_item(
            Key={"pk": window_key},
            UpdateExpression="SET #cnt = if_not_exists(#cnt, :zero) + :one, #ttl = :ttl",
            ExpressionAttributeNames={"#cnt": "count", "#ttl": "ttl"},
            ExpressionAttributeValues={
                ":one": 1,
                ":zero": 0,
                ":ttl": expiry
            },
            ReturnValues="UPDATED_NEW"
        )
        
        count = response["Attributes"]["count"]
        if count > max_requests:
            now = int(time.time())
            retry_after = max(0, window_start + window_seconds - now)
            return False, retry_after

        return True, 0
    except ClientError as e:
        log.error("dynamodb_rate_limit_error", error=str(e))
        # Fail open if DynamoDB is down
        return True, 0
    except Exception as e:
        log.error("rate_limit_unexpected_error", error=str(e))
        return True, 0
