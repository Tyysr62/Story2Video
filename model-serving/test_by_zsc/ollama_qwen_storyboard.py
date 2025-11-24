from fastapi import FastAPI, HTTPException
import requests
import json
from pydantic import BaseModel, Field
from typing import List, Optional
import os
from fastapi.middleware.cors import CORSMiddleware  # 新增导入
# -------------------------- 全局配置 --------------------------
app = FastAPI(
    title="Qwen分镜脚本生成服务",
    description="调用Ollama部署的Qwen模型生成英文分镜脚本，并传递给SDXL文生图服务"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境需指定具体前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ollama服务配置（Qwen模型部署地址）
OLLAMA_API_URL = "http://localhost:11434/api/generate"  # Ollama默认API地址
OLLAMA_MODEL = "qwen:7b"  # 部署的Qwen模型名称

# SDXL服务接口地址（接收英文分镜JSON）
SDXL_API_URL = "http://localhost:8001/generate_storyboard_images"

# -------------------------- 数据模型定义 --------------------------
class GenerateRequest(BaseModel):
    """用户输入请求模型：仅包含视频主题和风格要求（支持中文输入）"""
    video_topic: str  # 视频主题（可中文）
    style: str  # 电影风格（可中文）
    # 移除shot_count参数，由模型自主决定

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
    shot_list: List[ShotItem]

# -------------------------- 核心工具函数 --------------------------
def translate_with_qwen(text: str) -> str:
    """使用Qwen模型将中文翻译成英文"""
    if not text.strip():
        return text
    
    translate_prompt = f"""Translate the following Chinese text to English. 
    Requirements:
    1. Only return the translated English text, no explanations or additional content.
    2. Maintain the original meaning accurately.
    3. Use natural and professional expressions.
    
    Chinese text: {text}"""
    
    try:
        response = requests.post(
            OLLAMA_API_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": translate_prompt,
                "stream": False,
                "format": "json"
            },
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        translated_text = result.get("response", "").strip()
        
        if not translated_text or translated_text.lower() == "null":
            raise ValueError(f"Qwen翻译结果为空: {text}")
        return translated_text
    except Exception as e:
        raise RuntimeError(f"Qwen翻译失败: {str(e)}")

def build_storyboard_prompt(english_topic: str, english_style: str) -> str:
    """构建生成英文分镜脚本的提示词（让模型自主决定分镜数量）"""
    example_json = {
        "video_topic": "Mountain Adventure Documentary",
        "style": "Exploration film, natural lighting, vibrant colors",
        "shot_list": [
            {
                "shot_id": 1,
                "shot_type": "Aerial shot",
                "content": "Dramatic mountain range at sunrise, clouds floating between peaks",
                "duration": 6,
                "camera_move": "Slow downward pan",
                "bgm": "Soft orchestral music with nature sounds"
            },
            {
                "shot_id": 2,
                "shot_type": "Medium shot",
                "content": "Hiker with backpack walking along a narrow trail",
                "duration": 5,
                "camera_move": "Follow shot",
                "bgm": "Light acoustic guitar"
            }
        ]
    }
    
    return f"""You are a professional storyboard designer. Create a storyboard script based on the following requirements.

REQUIREMENTS:
- Video topic: {english_topic}
- Film style: {english_style}
- Number of shots: Decide合理的数量 based on the content (typically 5-15 shots, ensure logical flow)

OUTPUT FORMAT (MANDATORY):
Only return a valid JSON object with these fields:
1. "video_topic": English title of the video
2. "style": English description of the film style
3. "shot_list": Array of shot objects (数量由你决定), each containing:
   - "shot_id": Sequential integer (starting from 1)
   - "shot_type": Camera shot type (e.g., wide shot, close-up)
   - "content": Detailed English description of the scene
   - "duration": Seconds per shot (integer, 3-10)
   - "camera_move": Camera movement (e.g., pan left, static)
   - "bgm": Background music style (e.g., upbeat pop, ambient)

EXAMPLE JSON STRUCTURE (仅展示格式，数量可变):
{json.dumps(example_json, indent=2)}

IMPORTANT: No explanations, only the JSON object. Ensure all content is in English.
Ensure the number of shots is reasonable for the topic (not too few or too many)."""

def call_ollama(prompt: str) -> str:
    """通用Ollama调用函数"""
    try:
        response = requests.post(
            OLLAMA_API_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json"
            },
            timeout=60
        )
        response.raise_for_status()
        return response.json().get("response", "")
    except Exception as e:
        raise RuntimeError(f"Ollama调用失败: {str(e)}")

def send_to_sdxl(storyboard_json: dict) -> dict:
    """将英文分镜JSON发送到SDXL服务"""
    try:
        response = requests.post(
            SDXL_API_URL,
            json=storyboard_json,
            timeout=300
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise RuntimeError(f"SDXL服务调用失败: {str(e)}")

# -------------------------- 核心接口 --------------------------
@app.post("/generate_storyboard", response_model=dict)
async def generate_storyboard(request: GenerateRequest):
    """
    生成英文分镜脚本并调用SDXL服务生成分镜图片
    1. 使用Qwen将用户输入的中文主题/风格翻译为英文
    2. 调用Qwen生成英文分镜JSON（分镜数量由模型自主决定）
    3. 传递给SDXL服务生成图片
    """
    try:
        # 1. 翻译用户输入（中文→英文）
        english_topic = translate_with_qwen(request.video_topic)
        english_style = translate_with_qwen(request.style)
        
        # 2. 构建分镜生成提示词（无固定数量）
        storyboard_prompt = build_storyboard_prompt(english_topic, english_style)
        
        # 3. 调用Qwen生成分镜JSON
        qwen_response = call_ollama(storyboard_prompt)
        if not qwen_response:
            raise ValueError("Qwen未返回有效分镜内容")
        
        # 4. 解析并验证JSON
        storyboard_data = json.loads(qwen_response)
        required_keys = ["video_topic", "style", "shot_list"]
        if not all(key in storyboard_data for key in required_keys):
            raise ValueError("分镜JSON结构不完整")
        
        # 5. 验证分镜列表不为空
        if not storyboard_data["shot_list"]:
            raise ValueError("分镜列表不能为空")
        
        # 6. 发送到SDXL服务
        sdxl_result = send_to_sdxl(storyboard_data)
        
        return {
            "code": 200,
            "message": "分镜生成及图片渲染成功",
            "translated_topic": english_topic,
            "translated_style": english_style,
            "storyboard_json": storyboard_data,
            "shot_count": len(storyboard_data["shot_list"]),  # 返回实际分镜数量
            "sdxl_result": sdxl_result
        }
    
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Qwen生成的内容不是有效JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------- 启动服务 --------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app="ollama_qwen_storyboard:app",
        host="0.0.0.0",
        port=8002,
        reload=True
    )
