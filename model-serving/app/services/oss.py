from pathlib import Path
from urllib.parse import urlparse

from app.core.config import (
    OSS_ENDPOINT,
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET,
    OSS_BASE_URL,
    OSS_URL_EXPIRES,
)

def _public_base_url() -> str:
    if OSS_BASE_URL:
        return OSS_BASE_URL.rstrip("/")
    if not OSS_ENDPOINT or not OSS_BUCKET:
        return ""
    host = urlparse(OSS_ENDPOINT).netloc
    return f"https://{OSS_BUCKET}.{host}"

def upload_to_oss(object_key: str, local_path: Path) -> str:
    if not local_path.exists():
        return ""
    if not OSS_ENDPOINT or not OSS_BUCKET or not OSS_ACCESS_KEY_ID or not OSS_ACCESS_KEY_SECRET:
        return ""
    try:
        import oss2
    except Exception:
        return ""
    auth = oss2.Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET)
    with local_path.open("rb") as f:
        bucket.put_object(object_key, f)
    # 返回预签名 URL（私有桶也可用），按配置的过期秒数
    try:
        presigned = bucket.sign_url('GET', object_key, OSS_URL_EXPIRES)
        return presigned
    except Exception:
        base = _public_base_url()
        return f"{base}/{object_key}" if base else ""
