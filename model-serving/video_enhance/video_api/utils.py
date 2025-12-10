import os
import logging
import pathlib
import urllib.parse
import requests

def ensure_dir(path: str):
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)

def setup_logger(name: str):
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger

def parse_ids_from_url(url: str):
    qs = urllib.parse.urlparse(url).query
    params = urllib.parse.parse_qs(qs)
    user_id = (params.get('user_id') or [''])[0]
    story_id = (params.get('story_id') or [''])[0]
    shot_id = (params.get('shot_id') or [''])[0]
    return user_id, story_id, shot_id

def download_to(path: str, url: str):
    ensure_dir(os.path.dirname(path))
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
    return path

def public_url(base: str, local_path: str):
    name = os.path.basename(local_path)
    return base.rstrip('/') + '/files/' + urllib.parse.quote(name)
