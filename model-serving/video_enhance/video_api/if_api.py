import os
from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from .config import PORT, PUBLIC_BASE
from .utils import setup_logger, ensure_dir, public_url
from .rife_service import IFService

# OSS 配置
OSS_ENDPOINT: str = os.getenv("OSS_ENDPOINT", "oss-cn-beijing.aliyuncs.com")
OSS_ACCESS_KEY_ID: str = os.getenv("OSS_ACCESS_KEY_ID", "LTAI5tSADQjYfXrA2WuoLbXy")
OSS_ACCESS_KEY_SECRET: str = os.getenv("OSS_ACCESS_KEY_SECRET", "3WRvSjX3rX1mwoXKjcCqVMx41mXR8F")
OSS_BUCKET: str = os.getenv("OSS_BUCKET", "bytedance-s2v")
OSS_BASE_URL: str = os.getenv("OSS_BASE_URL", "")
OSS_URL_EXPIRES: int = int(os.getenv("OSS_URL_EXPIRES", "86400"))

app = FastAPI(title="Frame Interpolation API")
logger = setup_logger("video_api.if_api")

WORK_DIR = os.path.join(os.getcwd(), "video_api", "_work_if")
ensure_dir(WORK_DIR)
app.mount("/files", StaticFiles(directory=WORK_DIR), name="files")

if_service = IFService()

@app.on_event("startup")
def _startup():
    logger.info("startup warmup begin")
    try:
        if_service.warmup()
        logger.info("startup warmup done")
    except Exception as e:
        logger.error(f"warmup error: {e}")

@app.post("/interpolate")
def interpolate(path: str = Body(""), multi: int = Body(2)):
    try:
        logger.info(f"/interpolate path={path} multi={multi}")
        if not path:
            raise ValueError("path required")
        name = os.path.basename(path)
        out = os.path.join(WORK_DIR, f"if_{name}")
        p = if_service.interpolate(path, multi=multi, output_path=out)
        return {"path": p, "url": public_url(PUBLIC_BASE, p)}
    except Exception as e:
        logger.exception("interpolate failed")
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
