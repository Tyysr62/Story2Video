import os
import requests
from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse
from .config import PORT, SR_BASE, IF_BASE, PUBLIC_BASE
from .utils import setup_logger, parse_ids_from_url
from .oss import put_file, make_key

# OSS 配置
OSS_ENDPOINT: str = os.getenv("OSS_ENDPOINT", "")
OSS_ACCESS_KEY_ID: str = os.getenv("OSS_ACCESS_KEY_ID", "")
OSS_ACCESS_KEY_SECRET: str = os.getenv("OSS_ACCESS_KEY_SECRET", "")
OSS_BUCKET: str = os.getenv("OSS_BUCKET", "")
OSS_BASE_URL: str = os.getenv("OSS_BASE_URL", "")
OSS_URL_EXPIRES: int = int(os.getenv("OSS_URL_EXPIRES", "86400"))

app = FastAPI(title="Main Orchestrator API")
logger = setup_logger("video_api.main_api")

@app.post("/process")
def process(url: str = Body(""), path: str = Body(""), scale: int = Body(4), multi: int = Body(2), user_id: str = Body(""), story_id: str = Body(""), shot_id: str = Body("")):
    try:
        logger.info(f"main /process url={url} path={path} scale={scale} multi={multi}")
        if not path:
            if not url:
                raise ValueError("path or url required")
            r = requests.post(SR_BASE.rstrip('/') + '/superres', json={"url": url, "scale": scale}, timeout=3600)
            r.raise_for_status()
            sr_data = r.json()
            path = sr_data["path"]
        r2 = requests.post(IF_BASE.rstrip('/') + '/interpolate', json={"path": path, "multi": multi}, timeout=3600)
        r2.raise_for_status()
        if_data = r2.json()
        final_path = if_data["path"]
        if not user_id or not story_id or not shot_id:
            _u, _s, _h = parse_ids_from_url(url)
            user_id = user_id or _u or "unknown_user"
            story_id = story_id or _s or "unknown_story"
            shot_id = shot_id or _h or "unknown_shot"
        key = make_key(user_id, story_id, shot_id)
        try:
            oss_url = put_file(key, final_path)
            return {"path": final_path, "url": oss_url, "oss_key": key}
        except Exception as oss_e:
            logger.exception("OSS upload failed")
            return {"path": final_path, "url": if_data.get("url"), "oss_key": key, "oss_error": str(oss_e)}
    except Exception as e:
        logger.exception("main process failed")
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
