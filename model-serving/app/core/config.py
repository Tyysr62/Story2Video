import os
from pathlib import Path
from typing import List

# 配置中心：集中读取环境变量并设定默认值，便于生产环境注入和本地开发调试

PROJECT_ROOT = Path(os.path.expanduser("~/workspace/story2video"))

COMFY_HOSTS_LIST: List[str] = [
    os.getenv("COMFY_HOST_1", "http://localhost:8188"),
    os.getenv("COMFY_HOST_2", "http://localhost:8189"),
]

OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
COSYVOICE_URL: str = os.getenv("COSYVOICE_URL", "http://localhost:9233/v1/tts")

COMFY_BASE_DIR: Path = PROJECT_ROOT / "ComfyUI"
COMFY_INPUT_DIR: Path = COMFY_BASE_DIR / "input"
COMFY_OUTPUT_DIR: Path = COMFY_BASE_DIR / "output"

OUTPUT_DIR: Path = PROJECT_ROOT / "result"

# 测试快速返回开关：开启后渲染接口直接返回占位视频路径，但后台仍执行真实生成流程
TEST_FAST_RETURN: bool = os.getenv("TEST_FAST_RETURN", "false").lower() in {"1", "true", "yes"}

SERVICE_PORT: int = int(os.getenv("SERVICE_PORT", "12345"))

# 初始化必要目录
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

# OSS 配置
OSS_ENDPOINT: str = os.getenv("OSS_ENDPOINT", "oss-cn-beijing.aliyuncs.com")
OSS_ACCESS_KEY_ID: str = os.getenv("OSS_ACCESS_KEY_ID", "LTAI5tSADQjYfXrA2WuoLbXy")
OSS_ACCESS_KEY_SECRET: str = os.getenv("OSS_ACCESS_KEY_SECRET", "3WRvSjX3rX1mwoXKjcCqVMx41mXR8F")
OSS_BUCKET: str = os.getenv("OSS_BUCKET", "bytedance-s2v")
OSS_BASE_URL: str = os.getenv("OSS_BASE_URL", "")
OSS_URL_EXPIRES: int = int(os.getenv("OSS_URL_EXPIRES", "86400"))

LOCAL_INFERENCE: bool = os.getenv("LOCAL_INFERENCE", "false").lower() in {"1", "true", "yes"}

SEEDANCE_API_URL: str = os.getenv("SEEDANCE_API_URL", os.getenv("ARK_API_URL", "https://ark.cn-beijing.volces.com/api/v3"))
SEEDANCE_API_KEY: str = os.getenv("SEEDANCE_API_KEY", os.getenv("ARK_API_KEY", "775bd32d-cb41-4486-b511-5206a8b4e13e"))

QIANFAN_API_KEY: str = os.getenv("QIANFAN_API_KEY", "bce-v3/ALTAK-3i0EaJEhiZWKxYiH4vMea/416e978da32e307af68eaeeb55b144f2238b6d0b")
QIANFAN_CREATE_URL: str = os.getenv("QIANFAN_CREATE_URL", "https://qianfan.baidubce.com/video/generations")
QIANFAN_QUERY_URL: str = os.getenv("QIANFAN_QUERY_URL", "https://qianfan.baidubce.com/video/generations?task_id={task_id}")
QIANFAN_MODEL: str = os.getenv("QIANFAN_MODEL", "musesteamer-2.0-turbo-i2v-audio")
QIANFAN_DURATION: int = int(os.getenv("QIANFAN_DURATION", "5"))
QIANFAN_POLL_INTERVAL: int = int(os.getenv("QIANFAN_POLL_INTERVAL", "5"))
QIANFAN_MAX_POLL_TIMES: int = int(os.getenv("QIANFAN_MAX_POLL_TIMES", "60"))
QIANFAN_MAX_CONCURRENCY: int = int(os.getenv("QIANFAN_MAX_CONCURRENCY", "3"))

# Pixverse API 配置
PIXVERSE_MAX_CONCURRENCY: int = int(os.getenv("PIXVERSE_MAX_CONCURRENCY", "25"))
PIXVERSE_API_KEY: str = os.getenv("PIXVERSE_API_KEY", "sk-707f87c967e6e096ce52f82d544a0c6c")
PIXVERSE_UPLOAD_URL: str = os.getenv("PIXVERSE_UPLOAD_URL", "https://app-api.pixverseai.cn/openapi/v2/image/upload")
PIXVERSE_GENERATE_URL: str = os.getenv("PIXVERSE_GENERATE_URL", "https://app-api.pixverseai.cn/openapi/v2/video/img/generate")
PIXVERSE_RESULT_URL: str = os.getenv("PIXVERSE_RESULT_URL", "https://app-api.pixverseai.cn/openapi/v2/video/result")
