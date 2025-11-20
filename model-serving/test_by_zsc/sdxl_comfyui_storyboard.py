from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import uuid
import base64
import time
import requests
import json

# -------------------------- 全局配置 --------------------------
# 1. ComfyUI核心配置
COMFYUI_PROMPT_URL = "http://localhost:8188/prompt"
COMFYUI_HISTORY_URL = "http://localhost:8188/history/"
COMFYUI_SAVE_IMAGE_NODE_ID = "9"
# 关键配置：ComfyUI的output目录绝对路径（必须修改为你的实际路径！）
# 示例：Windows路径 "E:/ComfyUI/output"，Linux/Mac路径 "/home/user/ComfyUI/output"
COMFYUI_OUTPUT_DIR = "D:\ComfyUI_windows_portable_nvidia\ComfyUI_windows_portable\ComfyUI\output"  
# 2. 分镜图片保存目录
STORYBOARD_SAVE_DIR = "./storyboard_images_comfyui"
os.makedirs(STORYBOARD_SAVE_DIR, exist_ok=True)
# 3. FastAPI初始化
app = FastAPI(
    title="分镜文生图服务（ComfyUI SDXL-Turbo版）",
    description="从ComfyUI本地目录读取图片，适配新版ComfyUI路径返回逻辑"
)

# -------------------------- 数据模型定义 --------------------------
class ShotItem(BaseModel):
    shot_id: int
    shot_type: str
    content: str
    duration: int
    camera_move: str
    bgm: str

class StoryboardJSON(BaseModel):
    video_topic: str
    style: str
    shot_list: List[ShotItem] = Field(..., min_items=1)

# -------------------------- 核心工具函数 --------------------------
def optimize_prompt(shot_content: str, movie_style: str) -> tuple:
    """优化提示词（适配SDXL-Turbo）"""
    negative_prompt = "text, watermark, blurry, low quality, ugly, deformed, messy, duplicate"
    positive_prompt = f"{shot_content}, {movie_style}, movie storyboard, 8k, high definition, cinematic lighting, film-level composition, no text, no watermark"
    return positive_prompt, negative_prompt

def read_comfyui_image(file_name: str, subfolder: str = "") -> str:
    """
    从ComfyUI的output目录读取图片，转换为Base64
    :param file_name: ComfyUI返回的图片文件名
    :param subfolder: ComfyUI返回的子文件夹（通常为空）
    :return: 图片的Base64编码字符串
    """
    # 拼接ComfyUI中图片的绝对路径
    if subfolder:
        img_abs_path = os.path.join(COMFYUI_OUTPUT_DIR, subfolder, file_name)
    else:
        img_abs_path = os.path.join(COMFYUI_OUTPUT_DIR, file_name)
    
    # 检查文件是否存在
    if not os.path.exists(img_abs_path):
        raise FileNotFoundError(f"ComfyUI生成的图片不存在：{img_abs_path}")
    
    # 读取图片并转换为Base64
    with open(img_abs_path, "rb") as f:
        image_bytes = f.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
    
    return image_base64

def save_storyboard_image(image_base64: str) -> str:
    """将Base64图片保存到分镜专属目录"""
    if "," in image_base64:
        image_base64 = image_base64.split(",")[1]
    img_name = f"storyboard_{uuid.uuid4()}.png"
    img_path = os.path.join(STORYBOARD_SAVE_DIR, img_name)
    with open(img_path, "wb") as f:
        f.write(base64.b64decode(image_base64))
    return img_path

def build_comfyui_prompt(positive_prompt: str, negative_prompt: str) -> dict:
    """构建ComfyUI Prompt（完全复用你的导出配置）"""
    prompt = {
        "3": {
            "inputs": {
                "seed": int(time.time() * 1000),
                "steps": 20,
                "cfg": 8,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            },
            "class_type": "KSampler",
            "_meta": {"title": "K采样器"}
        },
        "4": {
            "inputs": {
                "ckpt_name": "sdxl-turbo\\sd_xl_turbo_1.0.safetensors"
            },
            "class_type": "CheckpointLoaderSimple",
            "_meta": {"title": "Checkpoint加载器（简易）"}
        },
        "5": {
            "inputs": {
                "width": 1024,
                "height": 1024,
                "batch_size": 1
            },
            "class_type": "EmptyLatentImage",
            "_meta": {"title": "空Latent图像"}
        },
        "6": {
            "inputs": {
                "text": positive_prompt,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "CLIP文本编码"}
        },
        "7": {
            "inputs": {
                "text": negative_prompt,
                "clip": ["4", 1]
            },
            "class_type": "CLIPTextEncode",
            "_meta": {"title": "CLIP文本编码"}
        },
        "8": {
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            },
            "class_type": "VAEDecode",
            "_meta": {"title": "VAE解码"}
        },
        "9": {
            "inputs": {
                "filename_prefix": "ComfyUI",
                "images": ["8", 0]
            },
            "class_type": "SaveImage",
            "_meta": {"title": "保存图像"}
        }
    }
    return {"prompt": prompt, "client_id": f"storyboard_{uuid.uuid4()}"}

def get_comfyui_image_path(history_data: Dict[str, Any], node_id: str) -> tuple:
    """
    从ComfyUI的history结果中提取图片的文件名和子文件夹
    :return: (file_name, subfolder)
    """
    prompt_id = list(history_data.keys())[0] if history_data else ""
    if not prompt_id or "outputs" not in history_data[prompt_id]:
        raise ValueError("ComfyUI返回的结果中无输出数据")
    
    outputs = history_data[prompt_id]["outputs"]
    if node_id not in outputs:
        raise KeyError(f"未找到SaveImage节点ID {node_id}")
    
    image_output = outputs[node_id]
    if "images" not in image_output or len(image_output["images"]) == 0:
        raise ValueError("ComfyUI未生成任何图片")
    
    # 提取文件名和子文件夹（新版ComfyUI仅返回这些字段）
    image_info = image_output["images"][0]
    file_name = image_info.get("filename", "")
    subfolder = image_info.get("subfolder", "")
    
    if not file_name:
        raise ValueError("ComfyUI返回的图片文件名为空")
    
    return file_name, subfolder

def call_comfyui_api(prompt_data: dict) -> str:
    """调用ComfyUI API，从本地读取图片并返回Base64"""
    try:
        # 1. 提交生成任务
        response = requests.post(COMFYUI_PROMPT_URL, json=prompt_data, timeout=60)
        response.raise_for_status()
        task_data = response.json()
        prompt_id = task_data["prompt_id"]
        print(f"ComfyUI生成任务提交成功，任务ID: {prompt_id}")

        # 2. 轮询查询生成结果（SDXL-Turbo生成快）
        max_retries = 20
        retry_count = 0
        while retry_count < max_retries:
            time.sleep(0.5)
            history_response = requests.get(f"{COMFYUI_HISTORY_URL}{prompt_id}", timeout=30)
            history_response.raise_for_status()
            history_data = history_response.json()

            if prompt_id in history_data and "outputs" in history_data[prompt_id]:
                # 3. 提取图片路径，读取并转换为Base64
                file_name, subfolder = get_comfyui_image_path(history_data, COMFYUI_SAVE_IMAGE_NODE_ID)
                image_base64 = read_comfyui_image(file_name, subfolder)
                return image_base64

            retry_count += 1
            print(f"任务未完成，重试次数: {retry_count}/{max_retries}")

        raise TimeoutError("ComfyUI生成图片超时（超过10秒）")

    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"ComfyUI HTTP请求错误: {str(e)}")
    except FileNotFoundError as e:
        raise RuntimeError(f"图片文件读取失败: {str(e)}")
    except TimeoutError as e:
        raise RuntimeError(str(e))
    except Exception as e:
        raise RuntimeError(f"ComfyUI API调用失败: {str(e)}")

# -------------------------- 核心接口 --------------------------
@app.post("/generate_storyboard_images", response_model=dict)
async def generate_storyboard_images(storyboard: StoryboardJSON):
    """通过ComfyUI生成图片，从本地目录读取结果"""
    try:
        print(f"收到分镜生成请求，视频主题: {storyboard.video_topic}")
        result_list = []
        movie_style = storyboard.style
        shot_list = storyboard.shot_list

        for shot in shot_list:
            shot_id = shot.shot_id
            shot_content = shot.content

            # 1. 优化提示词
            positive_prompt, negative_prompt = optimize_prompt(shot_content, movie_style)

            # 2. 构建ComfyUI请求
            comfyui_prompt = build_comfyui_prompt(positive_prompt, negative_prompt)

            # 3. 调用ComfyUI并获取图片Base64
            image_base64 = call_comfyui_api(comfyui_prompt)

            # 4. 保存到分镜目录
            img_path = save_storyboard_image(image_base64)

            # 5. 记录结果
            result_list.append({
                "shot_id": shot_id,
                "shot_type": shot.shot_type,
                "used_prompt": positive_prompt,
                "image_path": img_path,
                "camera_move": shot.camera_move,
                "bgm": shot.bgm
            })

        return {
            "code": 200,
            "message": "分镜图片生成成功（SDXL-Turbo版）",
            "video_topic": storyboard.video_topic,
            "movie_style": movie_style,
            "data": result_list
        }

    except Exception as e:
        error_detail = f"分镜图片生成失败：{str(e)}"
        print(f"错误详情: {error_detail}")
        raise HTTPException(status_code=500, detail=error_detail)

# -------------------------- 辅助接口 --------------------------
@app.get("/get_image/{image_name}")
async def get_image(image_name: str):
    img_path = os.path.join(STORYBOARD_SAVE_DIR, image_name)
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="图片不存在")
    return FileResponse(path=img_path, media_type="image/png")

# -------------------------- 启动服务 --------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app="sdxl_comfyui_storyboard:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )