import copy
import os
import random
import shutil
import time
from pathlib import Path
from queue import Queue
from typing import Dict, Tuple
from app.core.config import TEST_FAST_RETURN

import requests

from app.core.config import COMFY_HOSTS_LIST, COMFY_INPUT_DIR, COMFY_OUTPUT_DIR
from app.core.logging import logger


# 资源池：多个 ComfyUI 实例轮询分发
_comfy_host_queue: Queue[str] = Queue()
for url in COMFY_HOSTS_LIST:
    _comfy_host_queue.put(url)


def acquire_comfy_host() -> str:
    return _comfy_host_queue.get()


def release_comfy_host(host: str) -> None:
    _comfy_host_queue.put(host)


def execute_workflow(host: str, workflow: Dict, output_node_id: str, output_type: str) -> Tuple[str | None, str | None]:
    """调用 ComfyUI /prompt 并轮询 /history 获取结果文件名与子目录"""
    prompt_url = f"{host}/prompt"
    history_url = f"{host}/history"
    try:
        req = requests.post(prompt_url, json={"prompt": workflow})
        prompt_id = req.json()["prompt_id"]
        logger.info(f"提交 ComfyUI 任务: {prompt_id} @ {host}")
        while True:
            try:
                history_resp = requests.get(f"{history_url}/{prompt_id}", timeout=5)
                history = history_resp.json()
            except Exception:
                time.sleep(1)
                continue
            if prompt_id in history:
                data = history[prompt_id]
                outputs = data.get("outputs", {})
                if output_node_id in outputs:
                    item = outputs[output_node_id]["images" if output_type == "image" else "videos"][0]
                    return item["filename"], item["subfolder"]
            time.sleep(1)
    except Exception as e:
        logger.error(f"ComfyUI 工作流执行失败: {e}")
        return None, None


def run_t2i(prompt: str, target_path: Path, workflow_t2i: Dict) -> bool:
    host = acquire_comfy_host()
    try:
        if TEST_FAST_RETURN:
            logger.info(f"TEST_FAST_RETURN 模式，prompt: {prompt}")
        logger.info(f"T2I 开始，Host: {host}")
        wf = copy.deepcopy(workflow_t2i)
        wf['6']['inputs']['text'] = prompt
        wf['3']['inputs']['seed'] = random.randint(1, 10**10)
        wf['60']['inputs']['filename_prefix'] = target_path.stem
        filename, subfolder = execute_workflow(host, wf, '60', 'image')
        if filename:
            src = Path(COMFY_OUTPUT_DIR) / subfolder / filename
            shutil.copy(src, target_path)
            return True
        return False
    finally:
        release_comfy_host(host)


def run_i2v(start_image: Path, text_prompt: str, target_path: Path, workflow_i2v: Dict) -> bool:
    host = acquire_comfy_host()
    try:
        if TEST_FAST_RETURN:
            logger.info(f"TEST_FAST_RETURN 模式，prompt: {text_prompt}")
        logger.info(f"I2V 开始，Host: {host}")
        temp_name = f"temp_i2v_{random.randint(10000,99999)}.png"
        target_input = Path(COMFY_INPUT_DIR) / temp_name
        shutil.copy(start_image, target_input)

        wf = copy.deepcopy(workflow_i2v)
        wf['44']['inputs']['text'] = text_prompt
        wf['80']['inputs']['image'] = temp_name
        wf['127']['inputs']['noise_seed'] = random.randint(1, 10**14)
        wf['102']['inputs']['filename_prefix'] = target_path.stem

        filename, subfolder = execute_workflow(host, wf, '102', 'video')
        try:
            os.remove(target_input)
        except Exception:
            pass

        if filename:
            src = Path(COMFY_OUTPUT_DIR) / subfolder / filename
            shutil.move(src, target_path)
            return True
        return False
    finally:
        release_comfy_host(host)
