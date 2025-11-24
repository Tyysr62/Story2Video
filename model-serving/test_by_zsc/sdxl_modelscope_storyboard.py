from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import torch
import os
import uuid
import base64
from io import BytesIO
# ModelScope相关导入（核心）
from modelscope import AutoPipelineForText2Image, snapshot_download

# -------------------------- 全局配置 --------------------------
# 1. 模型配置（ModelScope的SDXL-Turbo模型ID）
MODEL_ID = "AI-ModelScope/sdxl-turbo"
# 2. 图片保存目录（自动创建）
IMAGE_SAVE_DIR = "./storyboard_images_modelscope"
os.makedirs(IMAGE_SAVE_DIR, exist_ok=True)
# 3. 设备配置（自动检测GPU/CPU）
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
# 4. FastAPI初始化
app = FastAPI(
    title="分镜文生图服务（ModelScope版）",
    description="接收Qwen语言模型的分镜JSON，通过ModelScope调用SDXL-Turbo生成分镜图片"
)

# -------------------------- 数据模型定义（适配Qwen的JSON输出） --------------------------
# 单条分镜结构（与Qwen输出的shot_list字段匹配）
class ShotItem(BaseModel):
    shot_id: int  # 分镜序号
    shot_type: str  # 镜头类型（远景/中景/特写）
    content: str  # 画面内容描述（核心提示词）
    duration: int  # 镜头时长（秒）
    camera_move: str  # 运镜方式
    bgm: str  # 背景音乐风格（辅助提示词）

# 分镜整体JSON结构（与Qwen输出完全一致）
class StoryboardJSON(BaseModel):
    video_topic: str  # 视频主题
    style: str  # 电影风格（如治愈系文艺、赛博朋克）
    shot_list: List[ShotItem] = Field(..., min_items=1, description="分镜列表，至少包含1个分镜")

# -------------------------- 加载ModelScope的SDXL-Turbo模型（全局仅加载一次） --------------------------
print(f"正在通过ModelScope加载SDXL-Turbo模型，设备：{DEVICE}")
try:
    # 从ModelScope下载/加载模型（首次运行自动下载，后续从缓存加载）
    model_dir = snapshot_download(MODEL_ID)
    # 初始化文生图Pipeline
    pipe = AutoPipelineForText2Image.from_pretrained(
        model_dir,
        torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
        variant="fp16" if DEVICE == "cuda" else None
    )
    # 模型移至指定设备（GPU/CPU）
    pipe.to(DEVICE)
    print("SDXL-Turbo模型（ModelScope版）加载成功！")
except Exception as e:
    raise RuntimeError(f"ModelScope模型加载失败：{str(e)}")

# -------------------------- 核心工具函数 --------------------------
def optimize_prompt(shot_content: str, movie_style: str) -> str:
    """
    优化文生图提示词：结合分镜画面描述+电影风格，生成SDXL-Turbo适配的提示词
    :param shot_content: 分镜画面内容（如"清晨郊外草地，阳光透过树梢洒下"）
    :param movie_style: 电影风格（如"治愈系文艺电影，暖色调"）
    :return: 优化后的正面提示词、通用负面提示词
    """
    # 通用负面提示词（避免生成模糊、低质内容）
    negative_prompt = "blurry, low quality, ugly, deformed, messy, text, watermark, logo, duplicate"
    # 正面提示词：融合画面内容+电影风格+分镜专属关键词
    positive_prompt = f"{shot_content}，{movie_style}，movie storyboard, 8k, high definition, cinematic lighting, film-level composition, no text, no watermark"
    return positive_prompt, negative_prompt

def save_image_to_local(image) -> str:
    """
    保存图片到本地，返回相对路径
    :param image: ModelScope Pipeline生成的PIL图像
    :return: 图片保存路径
    """
    img_name = f"storyboard_{uuid.uuid4()}.png"  # 唯一文件名避免冲突
    img_path = os.path.join(IMAGE_SAVE_DIR, img_name)
    image.save(img_path, format="PNG")
    return img_path

def image_to_base64(image) -> str:
    """
    将图片转为Base64编码（无需本地保存，直接返回前端）
    :param image: PIL图像
    :return: Base64编码字符串
    """
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return img_base64

# -------------------------- 核心接口：分镜图片生成 --------------------------
@app.post("/generate_storyboard_images", response_model=dict)
async def generate_storyboard_images(storyboard: StoryboardJSON):
    """
    接收Qwen输出的分镜JSON，调用ModelScope的SDXL-Turbo生成对应分镜图片
    - 入参：与Qwen输出一致的分镜JSON
    - 出参：包含分镜ID、提示词、图片路径/Base64的结果
    """
    try:
        print(f"收到分镜生成请求，视频主题: {storyboard.video_topic}")
        print(f"电影风格: {storyboard.style}")
        print(f"分镜数量: {len(storyboard.shot_list)}")
        
        result_list = []  # 存储每个分镜的生成结果
        movie_style = storyboard.style  # 全局电影风格
        shot_list = storyboard.shot_list  # 分镜列表

        # 遍历每个分镜，逐一生成图片
        for shot in shot_list:
            shot_id = shot.shot_id
            shot_content = shot.content  # 分镜核心画面描述

            # 1. 优化提示词
            positive_prompt, negative_prompt = optimize_prompt(shot_content, movie_style)

            # 2. 调用ModelScope的SDXL-Turbo生成图片（与你的测试脚本参数一致）
            image = pipe(
                prompt=positive_prompt,
                negative_prompt=negative_prompt,
                num_inference_steps=1,  # SDXL-Turbo专属：1步最快，可选2/4步提升质量
                guidance_scale=0.0,     # 关闭CFG加速推理
                width=512,              # 图像分辨率（512/1024可选）
                height=512
            ).images[0]

            # 3. 保存图片到本地 / 转为Base64（二选一，按需注释）
            img_path = save_image_to_local(image)  # 本地保存模式（推荐）
            # img_base64 = image_to_base64(image)  # Base64模式（无本地文件）

            # 4. 记录当前分镜的生成结果
            result_list.append({
                "shot_id": shot_id,
                "shot_type": shot.shot_type,
                "used_prompt": positive_prompt,  # 实际使用的提示词
                "image_path": img_path,          # 本地图片路径（本地模式）
                # "image_base64": img_base64,    # Base64编码（Base64模式）
                "camera_move": shot.camera_move,
                "bgm": shot.bgm
            })

        # 构造返回结果
        return {
            "code": 200,
            "message": "分镜图片生成成功（ModelScope SDXL-Turbo）",
            "video_topic": storyboard.video_topic,
            "movie_style": movie_style,
            "data": result_list
        }

    except Exception as e:
        import traceback
        error_detail = f"分镜图片生成失败：{str(e)}"
        print(f"SDXL接口错误详情: {error_detail}")
        print(f"错误堆栈: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_detail)

# -------------------------- 辅助接口：访问本地生成的图片 --------------------------
@app.get("/get_image/{image_name}")
async def get_image(image_name: str):
    """
    通过图片名称访问本地生成的分镜图片（前端可直接拼接URL调用）
    :param image_name: 图片文件名（如storyboard_xxx.png）
    """
    img_path = os.path.join(IMAGE_SAVE_DIR, image_name)
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="图片不存在")
    return FileResponse(path=img_path, media_type="image/png")

# -------------------------- 启动服务 --------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app="sdxl_modelscope_storyboard:app",  # 替换为你的脚本文件名（如当前脚本是sdxl_modelscope_storyboard.py）
        host="0.0.0.0",
        port=8001,  # 与Qwen语言模型接口的8000端口区分开
        reload=True
    )