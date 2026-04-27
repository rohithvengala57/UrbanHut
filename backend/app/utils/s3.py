"""
S3 utilities for Urban Hut.

All verification documents are private (no public URLs).
Access is gated via short-lived presigned URLs (15-minute expiry).
Only the S3 object key is stored in the DB — never a full URL.
"""

import io

import structlog
import boto3
from botocore.exceptions import ClientError
from PIL import Image, ImageOps

from app.config import settings

log = structlog.get_logger("app.utils.s3")

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    _HEIF_SUPPORTED = True
    log.info("heif_support_enabled")
except ImportError:
    _HEIF_SUPPORTED = False
    log.info("heif_support_disabled", reason="pillow_heif_not_installed")

# Widths for the three stored variants
_SIZES = {"thumbnail": 300, "medium": 800, "full": 1600}


def _process_to_jpeg(data: bytes, max_width: int) -> bytes:
    """Resize to max_width (preserving aspect ratio), strip EXIF, return JPEG bytes."""
    img = Image.open(io.BytesIO(data))
    # Auto-rotate based on EXIF orientation before stripping
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


def process_and_upload_image(
    file_bytes: bytes,
    key_prefix: str,
) -> dict[str, str]:
    """
    Resize to 3 sizes, strip EXIF, convert to JPEG, upload all to S3.
    Returns {"thumbnail": key, "medium": key, "full": key}.
    """
    log.info(
        "s3_image_upload_started",
        key_prefix=key_prefix,
        variants=list(_SIZES.keys()),
        input_bytes=len(file_bytes),
    )
    result: dict[str, str] = {}
    client = _get_client()

    for variant, max_width in _SIZES.items():
        key = f"{key_prefix}/{variant}.jpg"
        try:
            jpeg_bytes = _process_to_jpeg(file_bytes, max_width)
            client.put_object(
                Bucket=settings.AWS_S3_BUCKET,
                Key=key,
                Body=jpeg_bytes,
                ContentType="image/jpeg",
            )
            result[variant] = key
            log.debug(
                "s3_variant_uploaded",
                variant=variant,
                key=key,
                size_bytes=len(jpeg_bytes),
            )
        except (ClientError, OSError, Exception) as exc:
            log.error(
                "s3_variant_upload_failed",
                variant=variant,
                key=key,
                key_prefix=key_prefix,
                exc_type=type(exc).__name__,
                error=str(exc),
                exc_info=True,
            )
            raise

    log.info(
        "s3_image_upload_complete",
        key_prefix=key_prefix,
        variants_uploaded=list(result.keys()),
    )
    return result


def _get_client():
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY or not settings.AWS_S3_BUCKET:
        raise RuntimeError(
            "S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET env vars."
        )
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


def generate_presigned_upload_url(
    s3_key: str,
    content_type: str = "image/jpeg",
    expiry_seconds: int = 300,
) -> str:
    """Generate a presigned URL for the client to PUT a file directly to S3."""
    log.info(
        "s3_presigned_upload_url_requested",
        s3_key=s3_key,
        content_type=content_type,
        expiry_seconds=expiry_seconds,
        bucket=settings.AWS_S3_BUCKET,
    )
    try:
        client = _get_client()
        url = client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.AWS_S3_BUCKET,
                "Key": s3_key,
                "ContentType": content_type,
            },
            ExpiresIn=expiry_seconds,
        )
        log.debug("s3_presigned_upload_url_generated", s3_key=s3_key)
        return url
    except ClientError as exc:
        log.error(
            "s3_presigned_upload_url_failed",
            s3_key=s3_key,
            error=str(exc),
            error_code=exc.response.get("Error", {}).get("Code") if hasattr(exc, "response") else None,
            exc_info=True,
        )
        raise


def generate_presigned_download_url(s3_key: str, expiry_seconds: int = 900) -> str:
    """
    Generate a 15-minute presigned GET URL for a private S3 object.
    Use this for admin review of verification documents.
    """
    log.info(
        "s3_presigned_download_url_requested",
        s3_key=s3_key,
        expiry_seconds=expiry_seconds,
    )
    try:
        client = _get_client()
        url = client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.AWS_S3_BUCKET,
                "Key": s3_key,
            },
            ExpiresIn=expiry_seconds,
        )
        log.debug("s3_presigned_download_url_generated", s3_key=s3_key)
        return url
    except ClientError as exc:
        log.error(
            "s3_presigned_download_url_failed",
            s3_key=s3_key,
            error=str(exc),
            exc_info=True,
        )
        raise


def delete_object(s3_key: str) -> None:
    """Permanently delete an S3 object (e.g. for data retention policy)."""
    log.info("s3_delete_requested", s3_key=s3_key)
    try:
        client = _get_client()
        client.delete_object(Bucket=settings.AWS_S3_BUCKET, Key=s3_key)
        log.info("s3_delete_success", s3_key=s3_key)
    except ClientError as exc:
        # Deletion is best-effort — log but don't raise
        log.warning(
            "s3_delete_failed",
            s3_key=s3_key,
            error=str(exc),
            error_code=exc.response.get("Error", {}).get("Code") if hasattr(exc, "response") else None,
        )


def upload_bytes(key: str, data: bytes, content_type: str = "image/jpeg") -> None:
    """Upload raw bytes to S3 at the given key."""
    log.info(
        "s3_upload_bytes_started",
        key=key,
        content_type=content_type,
        size_bytes=len(data),
    )
    try:
        _get_client().put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        log.info("s3_upload_bytes_success", key=key)
    except ClientError as exc:
        log.error(
            "s3_upload_bytes_failed",
            key=key,
            error=str(exc),
            error_code=exc.response.get("Error", {}).get("Code") if hasattr(exc, "response") else None,
            exc_info=True,
        )
        raise


def verification_key(user_id: str, doc_type: str, filename: str) -> str:
    """Build the S3 key for a verification document."""
    return f"verifications/{user_id}/{doc_type}/{filename}"


def listing_image_key(host_id: str, listing_id: str, filename: str) -> str:
    """Build the S3 key for a listing image."""
    return f"listings/{host_id}/{listing_id}/{filename}"


def listing_image_prefix(host_id: str, listing_id: str, upload_ts: int) -> str:
    """Build the S3 key prefix for a single image upload (without trailing slash)."""
    return f"listings/{host_id}/{listing_id}/{upload_ts}"


def avatar_key(user_id: str, filename: str) -> str:
    """Build the S3 key for a user avatar."""
    return f"avatars/{user_id}/{filename}"
