import os
import time
from typing import Optional
from .config import (
    OSS_ENDPOINT,
    OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET,
    OSS_BASE_URL,
    OSS_URL_EXPIRES,
)
from .utils import setup_logger

logger = setup_logger("video_api.oss")

def get_bucket():
    import importlib
    oss2 = importlib.import_module('oss2')
    auth = oss2.Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
    bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET)
    return bucket

def put_file(key: str, local_path: str) -> str:
    bucket = get_bucket()
    logger.info(f"OSS upload start key={key} path={local_path}")
    bucket.put_object_from_file(key, local_path)
    logger.info("OSS upload done")
    if OSS_BASE_URL:
        return OSS_BASE_URL.rstrip('/') + '/' + key
    # fallback to signed url
    url = bucket.sign_url('GET', key, OSS_URL_EXPIRES)
    return url

def make_key(user_id: str, story_id: str, shot_id: str) -> str:
    return f"story/{user_id}/{story_id}/{shot_id}/enhace_video_{shot_id}.mp4"
