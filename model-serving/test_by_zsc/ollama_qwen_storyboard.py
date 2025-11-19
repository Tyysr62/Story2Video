from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import json
import re
import json5  # 用于解析非标准JSON

# -------------------------- 全局配置 --------------------------
# 1. FastAPI初始化
app = FastAPI(title="分镜生成+文生图联动服务", description="基于Ollama-Qwen生成分镜JSON，自动调用SDXL生成图片")

# 2. Ollama配置（Qwen模型）
OLLAMA_BASE_URL = "http://localhost:11434"  # Ollama默认服务地址
OLLAMA_MODEL = "qwen:7b"  # 部署的Qwen模型名称
OLLAMA_MAX_TOKENS = 32768  # 生成的最大token数

# 3. SDXL文生图接口配置
SDXL_BASE_URL = "http://localhost:8001"  # SDXL接口的IP+端口（默认8001）
SDXL_API_PATH = "/generate_storyboard_images"  # SDXL文生图接口路径
SDXL_TIMEOUT = 300  # SDXL接口超时时间（5分钟，适配多分镜生成）

# -------------------------- 数据模型定义 --------------------------
class PromptRequest(BaseModel):
    prompt: str  # 用户原始提示词（如"生成踏青的电影风格分镜"）

# -------------------------- Prompt自动补全优化（全新设计，强制JSON） --------------------------
def optimize_prompt(original_prompt: str) -> str:
    """全新设计的Prompt，强制Qwen输出标准JSON，适配Ollama的Qwen模型"""
    
    # 更详细的JSON示例，包含多个分镜
    json_example = {
        "video_topic": "春日踏青电影风格视频",
        "style": "治愈系文艺电影，暖色调、柔和光影",
        "shot_list": [
            {
                "shot_id": 1,
                "shot_type": "远景",
                "content": "清晨郊外草地，阳光透过树梢洒下，微风拂过草地泛起绿浪",
                "duration": 5,
                "camera_move": "缓慢横移",
                "bgm": "轻柔钢琴独奏+鸟鸣声"
            },
            {
                "shot_id": 2,
                "shot_type": "中景",
                "content": "年轻女孩背着背包走在林间小径上，脸上洋溢着期待的笑容",
                "duration": 4,
                "camera_move": "跟随拍摄",
                "bgm": "轻柔钢琴独奏+鸟鸣声"
            },
            {
                "shot_id": 3,
                "shot_type": "特写",
                "content": "女孩手中拿着一朵刚摘下的野花，花瓣上的露珠晶莹剔透",
                "duration": 3,
                "camera_move": "静态特写",
                "bgm": "轻柔钢琴独奏"
            }
        ]
    }
    
    example_str = json.dumps(json_example, ensure_ascii=False, indent=2)
    
    # 简化Prompt指令，移除Ollama Qwen不兼容的特殊标记，用自然语言强制约束
    optimize_template = f"""
你是专业的视频分镜生成助手，必须严格按照以下规则生成内容：
1. 输出格式：仅返回标准JSON字符串，不包含任何额外文字、注释、Markdown格式、引导语
2. 禁止输出：```json、```、"以下是分镜JSON"、"生成结果如下"等任何非JSON内容
3. JSON结构必须包含：video_topic（字符串）、style（字符串）、shot_list（数组）三个一级字段
4. shot_list要求：包含8-15个分镜对象，每个分镜必须有shot_id（整数，从1开始）、shot_type、content、duration（整数）、camera_move、bgm字段
5. 分镜类型参考：远景、中景、近景、特写、全景；运镜方式参考：静态、缓慢横移、跟随拍摄、推镜、拉镜

需求：{original_prompt}
参考示例（仅参考结构，内容需重新创作）：
{example_str}

现在直接输出符合要求的JSON字符串，无需任何额外内容！
    """
    # 压缩Prompt，移除多余换行
    return "".join([line.strip() for line in optimize_template.split("\n") if line.strip()])

# -------------------------- 提取JSON片段（增强版，修复正则语法错误） --------------------------
def extract_json_from_text(text: str) -> str:
    """从文本中提取JSON字符串 - 强制提取模式，修复正则语法错误"""
    print(f"[提取JSON] 原始文本长度: {len(text)}")
    print(f"[提取JSON] 原始文本前500字符:\n{text[:500]}")
    
    # 清理文本 - 移除常见的前导字符
    cleaned_text = text.strip()
    
    # 定义JSON提取的正则模式（修复语法错误，补充闭合）
    patterns = [
        # 严格匹配独立的JSON对象
        r'\{[\s\S]*\}',
        # 匹配Markdown代码块中的JSON
        r'```json\s*([\s\S]*?)\s*```',
        # 匹配无标记的代码块
        r'```\s*([\s\S]*?)\s*```'
    ]
    
    # 遍历模式提取JSON
    for i, pattern in enumerate(patterns):
        matches = re.findall(pattern, cleaned_text)
        if matches:
            print(f"[提取JSON] 模式{i+1}匹配成功，提取到{len(matches)}个片段")
            # 取最长的片段（最完整的JSON）
            json_str = max(matches, key=len).strip() if isinstance(matches[0], str) else matches[0].strip()
            # 验证是否包含核心字段
            if json_str.startswith('{') and all(k in json_str for k in ["video_topic", "style", "shot_list"]):
                print(f"[提取JSON] 提取到有效JSON，长度: {len(json_str)}")
                return json_str
    
    # 暴力提取：找第一个{和最后一个}之间的内容
    print("[提取JSON] 正则模式匹配失败，尝试暴力提取")
    start_idx = cleaned_text.find('{')
    end_idx = cleaned_text.rfind('}')
    
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        json_str = cleaned_text[start_idx:end_idx+1]
        print(f"[提取JSON] 暴力提取成功，长度: {len(json_str)}")
        return json_str
    
    print("[提取JSON] 无法提取有效JSON，返回空字符串")
    return ""

# -------------------------- JSON清理与解析（增强版） --------------------------
def clean_json_string(json_str: str) -> str:
    """清理JSON字符串中的常见问题：中文引号、多余字符、格式错误"""
    if not json_str:
        return ""
    
    print(f"[清理JSON] 原始字符串前200字符:\n{json_str[:200]}")
    
    # 移除非JSON字符
    json_str = json_str.strip()
    # 替换中文引号为英文引号
    json_str = json_str.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")
    # 移除多余的逗号（最后一个元素后的逗号）
    json_str = re.sub(r',\s*}', '}', json_str)
    json_str = re.sub(r',\s*]', ']', json_str)
    # 移除注释
    json_str = re.sub(r'//.*?\n', '', json_str)
    
    print(f"[清理JSON] 清理后前200字符:\n{json_str[:200]}")
    return json_str

def safe_load_json(json_str: str) -> dict:
    """容错解析JSON，支持标准JSON和非标准JSON（单引号、多余逗号）"""
    if not json_str:
        raise ValueError("未从模型输出中提取到JSON片段")
    
    # 先清理JSON
    cleaned_json = clean_json_string(json_str)
    
    # 优先用标准JSON解析
    try:
        result = json.loads(cleaned_json)
        print("[JSON解析] 标准JSON解析成功")
        return result
    except json.JSONDecodeError as e:
        print(f"[JSON解析] 标准JSON解析失败: {str(e)}")
        # 用json5解析非标准JSON
        try:
            result = json5.loads(cleaned_json)
            print("[JSON解析] json5解析成功")
            return result
        except Exception as e2:
            print(f"[JSON解析] json5解析也失败: {str(e2)}")
            raise ValueError(f"JSON解析失败，错误：{str(e2)}")

# -------------------------- 数据修复逻辑（核心：解决422错误） --------------------------
def fix_storyboard_data(storyboard_json: dict) -> dict:
    """
    自动修复分镜JSON的字段缺失、类型错误，确保符合SDXL接口的Pydantic约束
    解决核心的422 Unprocessable Entity错误
    """
    print("[数据修复] 开始修复分镜JSON数据")
    
    # 1. 补全一级缺失字段
    storyboard_json.setdefault("video_topic", "默认视频主题")
    storyboard_json.setdefault("style", "默认电影风格")
    storyboard_json.setdefault("shot_list", [])
    
    # 2. 修复shot_list中的分镜数据
    fixed_shot_list = []
    for idx, shot in enumerate(storyboard_json["shot_list"]):
        if not isinstance(shot, dict):
            shot = {}
        
        # 补全子字段
        shot.setdefault("shot_id", idx + 1)
        shot.setdefault("shot_type", "远景")
        shot.setdefault("content", "默认画面内容")
        shot.setdefault("duration", 5)
        shot.setdefault("camera_move", "静态")
        shot.setdefault("bgm", "默认背景音乐")
        
        # 强制类型转换（核心：解决422的类型不匹配问题）
        shot["shot_id"] = int(shot["shot_id"]) if str(shot["shot_id"]).isdigit() else idx + 1
        shot["duration"] = int(shot["duration"]) if str(shot["duration"]).isdigit() else 5
        shot["shot_type"] = str(shot["shot_type"])
        shot["content"] = str(shot["content"])
        shot["camera_move"] = str(shot["camera_move"])
        shot["bgm"] = str(shot["bgm"])
        
        fixed_shot_list.append(shot)
    
    # 3. 确保shot_list有8-15个分镜（补充默认分镜）
    current_len = len(fixed_shot_list)
    if current_len < 8:
        print(f"[数据修复] 分镜数量不足8个，补充{8 - current_len}个默认分镜")
        for i in range(current_len, 8):
            fixed_shot_list.append({
                "shot_id": i + 1,
                "shot_type": "远景",
                "content": f"默认分镜{i + 1}：自然风景",
                "duration": 4,
                "camera_move": "缓慢横移",
                "bgm": "轻柔纯音乐"
            })
    elif current_len > 15:
        fixed_shot_list = fixed_shot_list[:15]
        print("[数据修复] 分镜数量超过15个，截断为15个")
    
    storyboard_json["shot_list"] = fixed_shot_list
    print(f"[数据修复] 完成，最终分镜数量：{len(fixed_shot_list)}")
    return storyboard_json

# -------------------------- 调用Ollama的Qwen模型 --------------------------
def call_ollama_qwen(prompt: str) -> str:
    """调用Ollama的REST API，获取Qwen模型的生成结果"""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "max_tokens": OLLAMA_MAX_TOKENS,
        "temperature": 0.6,
        "top_p": 0.9,
        "repetition_penalty": 1.1
    }

    try:
        print(f"[Qwen模型] 调用Ollama API: {url}")
        response = requests.post(url, json=payload, timeout=120)
        response.raise_for_status()
        result = response.json()
        raw_response = result.get("response", "")
        
        print(f"[Qwen模型] 响应长度: {len(raw_response)}")
        return raw_response
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail="无法连接到Ollama服务，请检查Ollama是否启动（执行ollama serve）")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Qwen模型生成超时，请缩短Prompt或减少分镜数量")
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=response.status_code, detail=f"Ollama服务返回错误：{str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用Qwen模型失败：{str(e)}")

# -------------------------- 调用SDXL文生图接口 --------------------------
def call_sdxl_api(storyboard_json: dict) -> dict:
    """调用SDXL的文生图接口，传递修复后的分镜JSON，获取图片生成结果"""
    sdxl_url = f"{SDXL_BASE_URL}{SDXL_API_PATH}"
    try:
        print(f"[SDXL调用] 开始调用SDXL接口: {sdxl_url}")
        print(f"[SDXL调用] 发送的分镜数量: {len(storyboard_json['shot_list'])}")
        
        response = requests.post(
            sdxl_url,
            json=storyboard_json,
            timeout=SDXL_TIMEOUT,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"[SDXL调用] 响应状态码: {response.status_code}")
        if response.status_code != 200:
            error_detail = response.text[:500]
            print(f"[SDXL调用] 接口错误响应: {error_detail}")
            response.raise_for_status()
        
        result = response.json()
        print(f"[SDXL调用] 接口调用成功，返回{len(result.get('data', []))}个图片结果")
        return result
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=503, detail=f"无法连接到SDXL文生图服务，请检查SDXL接口是否启动（地址：{SDXL_BASE_URL}）")
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="SDXL生成图片超时，多分镜生成建议增加超时时间或减少分镜数量")
    except requests.exceptions.HTTPError as e:
        error_msg = f"SDXL服务返回错误：{str(e)}"
        raise HTTPException(status_code=response.status_code, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"调用SDXL文生图接口失败：{str(e)}")

# -------------------------- 分镜生成核心逻辑（整合SDXL调用） --------------------------
def generate_storyboard(optimized_prompt: str) -> dict:
    """生成分镜JSON，修复数据后调用SDXL生成图片"""
    print("[主流程] 开始生成分镜...")
    
    # 1. 调用Qwen生成原始内容
    raw_content = call_ollama_qwen(optimized_prompt)
    if not raw_content:
        raise ValueError("Qwen模型生成内容为空")

    # 2. 提取并解析分镜JSON
    json_str = extract_json_from_text(raw_content)
    if not json_str:
        raise ValueError(f"未提取到JSON片段，Qwen原始输出：{raw_content[:500]}...")
    
    storyboard_json = safe_load_json(json_str)

    # 3. 自动修复分镜数据（核心解决422错误）
    storyboard_json = fix_storyboard_data(storyboard_json)

    # 4. 验证修复后的JSON结构
    required_fields = ["video_topic", "style", "shot_list"]
    for field in required_fields:
        if field not in storyboard_json:
            raise ValueError(f"JSON缺少必要字段「{field}」")
    
    print(f"[主流程] JSON验证通过，包含{len(storyboard_json['shot_list'])}个分镜")

    # 5. 调用SDXL接口生成图片
    sdxl_result = call_sdxl_api(storyboard_json)

    # 6. 整合结果
    final_result = {
        "storyboard_json": storyboard_json,
        "image_generation_result": sdxl_result
    }
    print("[主流程] 分镜生成+图片调用完成")
    return final_result

# -------------------------- 接口路由 --------------------------
@app.post("/generate_storyboard_with_images", response_model=dict)
async def generate_storyboard_with_images(request: PromptRequest):
    """主接口：输入需求，返回分镜JSON + 图片生成结果"""
    try:
        optimized_prompt = optimize_prompt(request.prompt)
        final_result = generate_storyboard(optimized_prompt)
        return {
            "code": 200,
            "message": "分镜JSON生成成功，且已自动调用SDXL生成图片",
            "data": final_result
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务内部错误：{str(e)}")

@app.post("/generate_storyboard", response_model=dict)
async def generate_storyboard_api(request: PromptRequest):
    """兼容接口：仅生成分镜JSON，不调用SDXL"""
    try:
        optimized_prompt = optimize_prompt(request.prompt)
        raw_content = call_ollama_qwen(optimized_prompt)
        json_str = extract_json_from_text(raw_content)
        storyboard_json = safe_load_json(json_str)
        storyboard_json = fix_storyboard_data(storyboard_json)
        
        required_fields = ["video_topic", "style", "shot_list"]
        for field in required_fields:
            if field not in storyboard_json:
                raise ValueError(f"JSON缺少必要字段「{field}」")
        
        return {
            "code": 200,
            "message": "分镜脚本生成成功（仅JSON，未调用SDXL）",
            "data": storyboard_json
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"服务内部错误：{str(e)}")

# -------------------------- 启动服务 --------------------------
if __name__ == "__main__":
    import uvicorn
    # 修复启动代码的语法错误（移除多余逗号）
    uvicorn.run(
        "ollama_qwen_storyboard:app",  # 替换为你的脚本文件名（如本文件名为ollama_qwen_storyboard.py）
        host="0.0.0.0",
        port=8000,
        reload=True
    )