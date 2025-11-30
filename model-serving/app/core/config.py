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
DATA_DIR: Path = PROJECT_ROOT / "data"

# 测试快速返回开关：开启后渲染接口直接返回占位视频路径，但后台仍执行真实生成流程
TEST_FAST_RETURN: bool = os.getenv("TEST_FAST_RETURN", "false").lower() in {"1", "true", "yes"}

# 初始化必要目录
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)
DATA_DIR.mkdir(exist_ok=True, parents=True)

# OSS 配置
OSS_ENDPOINT: str = os.getenv("OSS_ENDPOINT", "oss-cn-beijing.aliyuncs.com")
OSS_ACCESS_KEY_ID: str = os.getenv("OSS_ACCESS_KEY_ID", "LTAI5tSADQjYfXrA2WuoLbXy")
OSS_ACCESS_KEY_SECRET: str = os.getenv("OSS_ACCESS_KEY_SECRET", "3WRvSjX3rX1mwoXKjcCqVMx41mXR8F")
OSS_BUCKET: str = os.getenv("OSS_BUCKET", "bytedance-s2v")
OSS_BASE_URL: str = os.getenv("OSS_BASE_URL", "")
OSS_URL_EXPIRES: int = int(os.getenv("OSS_URL_EXPIRES", "86400"))
