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
OLLAMA_MODEL = "qwen3:8b"  # 部署的Qwen模型名称

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
            timeout=300
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
    """构建生成英文分镜脚本的提示词（输出shots字段，严格控制5-8个镜头）"""
    example_json = {
        "video_topic": "Mountain Adventure Documentary",
        "style": "Exploration film, natural lighting, vibrant colors",
        "shots": [
            {
                "sequence": 1,
                "title": "Sunrise over peaks",
                "description": "Aerial view of mountain range during sunrise",
                "details": "Golden light, clouds between peaks, crisp air, expansive vista",
                "narration": "At dawn, the mountains awaken to golden light.",
                "type": "Aerial shot",
                "transition": "fade in",
                "voice": "warm, calming, documentary tone",
                "bgm": "soft orchestral, nature ambience"
            },
            {
                "sequence": 2,
                "title": "Trail journey",
                "description": "Hiker walks along a narrow ridge trail",
                "details": "backpack, wind across grass, distant peaks, steady pace",
                "narration": "The path demands patience and grit.",
                "type": "Medium shot",
                "transition": "cut",
                "voice": "confident, steady",
                "bgm": "light acoustic guitar"
            }
        ]
    }

    return f"""You are a professional storyboard designer. Create a storyboard script based on the following requirements.

REQUIREMENTS:
- Video topic: {english_topic}
- Film style: {english_style}
- Number of shots: Strictly between 5 and 8

Output a valid JSON object with exactly these keys:
- "video_topic": English title of the video
- "style": English description of the film style
- "shots": Array with 5-8 objects. Each object MUST include:
  - "sequence": sequential integer starting at 1
  - "title": short scene title
  - "description": 1-2 sentence scene description
  - "details": concrete visual elements for image generation
  - "narration": voice-over line for this shot
  - "type": camera shot type (e.g., wide, medium, close-up, aerial)
  - "transition": transition to next shot (e.g., cut, fade in/out)
  - "voice": speaking voice style (e.g., warm, confident)
  - "bgm": background music style

Return ONLY the JSON object. No explanations. Ensure all content is in English.

EXAMPLE FORMAT:
{json.dumps(example_json, indent=2)}"""

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
            timeout=600
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
        required_keys = ["video_topic", "style", "shots"]
        if not all(key in storyboard_data for key in required_keys):
            raise ValueError("分镜JSON结构不完整")
        
        # 5. 验证分镜列表不为空
        if not storyboard_data["shots"]:
            raise ValueError("分镜列表不能为空")
        
        # 6. 验证分镜数量在5-8个之间
        shot_count = len(storyboard_data["shots"])
        if shot_count < 5 or shot_count > 8:
            raise ValueError(f"分镜数量必须在5-8个之间，当前：{shot_count}")
        shots = storyboard_data.get("shots", [])

        def normalize_shots(items: list) -> list:
            normalized = []
            for shot in items:
                seq = shot.get("sequence")
                shot["sequence"] = int(seq) if seq is not None else 0
                for k in ["title", "description", "details", "narration", "type", "transition", "voice", "bgm"]:
                    v = shot.get(k, "")
                    shot[k] = str(v) if v is not None else ""
                normalized.append(shot)
            return normalized

        shots = normalize_shots(shots)

        sdxl_payload = {
            "video_topic": english_topic,
            "style": english_style,
            "shot_list": [
                {
                    "shot_id": s["sequence"],
                    "shot_type": s["type"],
                    "content": s["details"] or s["description"],
                    "duration": 5,
                    "camera_move": "Static",
                    "bgm": s["bgm"]
                }
                for s in shots
            ]
        }

        sdxl_result = send_to_sdxl(sdxl_payload)

        image_map = {item.get("shot_id"): item.get("image_path") for item in sdxl_result.get("data", [])}

        final_shots = []
        for s in shots:
            pid = s["sequence"]
            final_shots.append({
                "sequence": s["sequence"],
                "title": s["title"],
                "description": s["description"],
                "details": s["details"],
                "narration": s["narration"],
                "type": s["type"],
                "transition": s["transition"],
                "voice": s["voice"],
                "bgm": s["bgm"],
                "image_data": image_map.get(pid, "")
            })
        
        return {
            "code": 200,
            "message": "ok",
            "video_topic": english_topic,
            "style": english_style,
            "shots": final_shots
        }
    
    except json.JSONDecodeError:
        # 返回错误结构而不是抛出异常
        error_msg = "Qwen生成的内容不是有效JSON"
        return {
            "code": 500,
            "message": error_msg,
            "storyboard_json": {
                "video_topic": request.video_topic,
                "style": request.style,
                "shot_list": [
                    {
                        "shot_id": 1,
                        "shot_type": "远景",
                        "content": f"分镜生成失败: {error_msg}",
                        "duration": 5,
                        "camera_move": "静态",
                        "bgm": "无"
                    },
                    {
                        "shot_id": 2,
                        "shot_type": "中景",
                        "content": "错误处理场景",
                        "duration": 4,
                        "camera_move": "静态",
                        "bgm": "无"
                    }
                ]
            },
            "_error": error_msg
        }
    except Exception as e:
        # 返回错误结构而不是抛出异常
        error_msg = str(e)
        return {
            "code": 500,
            "message": error_msg,
            "storyboard_json": {
                "video_topic": request.video_topic,
                "style": request.style,
                "shot_list": [
                    {
                        "shot_id": 1,
                        "shot_type": "远景",
                        "content": f"分镜生成失败: {error_msg}",
                        "duration": 5,
                        "camera_move": "静态",
                        "bgm": "无"
                    },
                    {
                        "shot_id": 2,
                        "shot_type": "中景",
                        "content": "错误处理场景",
                        "duration": 4,
                        "camera_move": "静态",
                        "bgm": "无"
                    }
                ]
            },
            "_error": error_msg
        }
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
