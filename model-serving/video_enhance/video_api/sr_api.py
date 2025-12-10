import os
from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from .config import PORT, PUBLIC_BASE, IF_BASE
from .utils import setup_logger, ensure_dir, download_to, public_url, parse_ids_from_url
from .sr_service import SRService
from .rife_service import IFService
from .oss import put_file, make_key

# OSS 配置
OSS_ENDPOINT: str = os.getenv("OSS_ENDPOINT", "oss-cn-beijing.aliyuncs.com")
OSS_ACCESS_KEY_ID: str = os.getenv("OSS_ACCESS_KEY_ID", "LTAI5tSADQjYfXrA2WuoLbXy")
OSS_ACCESS_KEY_SECRET: str = os.getenv("OSS_ACCESS_KEY_SECRET", "3WRvSjX3rX1mwoXKjcCqVMx41mXR8F")
OSS_BUCKET: str = os.getenv("OSS_BUCKET", "bytedance-s2v")
OSS_BASE_URL: str = os.getenv("OSS_BASE_URL", "")
OSS_URL_EXPIRES: int = int(os.getenv("OSS_URL_EXPIRES", "86400"))

app = FastAPI(title="Super-Resolution API")
logger = setup_logger("video_api.sr_api")

WORK_DIR = os.path.join(os.getcwd(), "video_api", "_work_sr")
ensure_dir(WORK_DIR)
app.mount("/files", StaticFiles(directory=WORK_DIR), name="files")

sr = SRService(version="10", mode="tiny", dtype_str="bf16", device="cuda:0" if os.environ.get("CUDA") else "auto")
if_service = IFService()

@app.on_event("startup")
def _startup():
    logger.info("startup warmup begin")
    try:
        sr.warmup()
        if_service.warmup()
        logger.info("startup warmup done")
    except Exception as e:
        logger.error(f"warmup error: {e}")

@app.post("/superres")
def superres(url: str = Body(""), scale: int = Body(4)):
    try:
        logger.info(f"/superres url={url} scale={scale}")
        name = os.path.basename(url.split('?')[0]) or 'input.mp4'
        src = os.path.join(WORK_DIR, f"src_{name}")
        download_to(src, url)
        out = os.path.join(WORK_DIR, f"sr_{name}")
        path, fps = sr.super_resolve(src, scale=scale, output_path=out)
        return {"path": path, "url": public_url(PUBLIC_BASE, path)}
    except Exception as e:
        logger.exception("superres failed")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/process")
def process(url: str = Body(""), path: str = Body(""), scale: int = Body(4), multi: int = Body(2), user_id: str = Body(""), story_id: str = Body(""), shot_id: str = Body("")):
    try:
        logger.info(f"/process url={url} path={path} scale={scale} multi={multi}")
        if not path:
            name = os.path.basename((url or 'input.mp4').split('?')[0])
            src = os.path.join(WORK_DIR, f"src_{name}")
            if url:
                download_to(src, url)
            else:
                raise ValueError("path or url required")
        else:
            src = path
        sr_out = os.path.join(WORK_DIR, f"sr_{os.path.basename(src)}")
        sr.super_resolve(src, scale=scale, output_path=sr_out)
        if_out = os.path.join(WORK_DIR, f"if_{os.path.basename(sr_out)}")
        if_service.interpolate(sr_out, multi=multi, output_path=if_out)
        if not user_id or not story_id or not shot_id:
            _u, _s, _h = parse_ids_from_url(url)
            user_id = user_id or _u or "unknown_user"
            story_id = story_id or _s or "unknown_story"
            shot_id = shot_id or _h or "unknown_shot"
        key = make_key(user_id, story_id, shot_id)
        try:
            oss_url = put_file(key, if_out)
            return {"path": if_out, "url": oss_url, "oss_key": key}
        except Exception as oss_e:
            logger.exception("OSS upload failed")
            return {"path": if_out, "url": public_url(PUBLIC_BASE, if_out), "oss_key": key, "oss_error": str(oss_e)}
    except Exception as e:
        logger.exception("process failed")
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
