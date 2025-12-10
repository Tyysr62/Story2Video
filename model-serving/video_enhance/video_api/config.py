import os

PORT: int = int(os.getenv("PORT", "6006"))
PUBLIC_BASE: str = os.getenv("PUBLIC_BASE", "http://127.0.0.1:%d" % PORT)
SR_BASE: str = os.getenv("SR_BASE", "http://127.0.0.1:6006")
IF_BASE: str = os.getenv("IF_BASE", "http://127.0.0.1:6008")

OSS_ENDPOINT: str = os.getenv("OSS_ENDPOINT", "")
OSS_ACCESS_KEY_ID: str = os.getenv("OSS_ACCESS_KEY_ID", "")
OSS_ACCESS_KEY_SECRET: str = os.getenv("OSS_ACCESS_KEY_SECRET", "")
OSS_BUCKET: str = os.getenv("OSS_BUCKET", "")
OSS_BASE_URL: str = os.getenv("OSS_BASE_URL", "")
OSS_URL_EXPIRES: int = int(os.getenv("OSS_URL_EXPIRES", "86400"))
