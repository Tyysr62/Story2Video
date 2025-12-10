import json
import requests
from typing import List, Dict, Any
from pathlib import Path
from app.core.config import OLLAMA_URL, OUTPUT_DIR, DASHSCOPE_API_KEY, DASHSCOPE_API_URL
from app.core.logging import logger


def generate_storyboard_shots(story: str) -> List[Dict]:
    """调用本地 Ollama 生成分镜结构，返回 shots 列表"""

    system_prompt = (
        "角色设定：你是一位拥有无限想象力的AI视频导演和金牌编剧。你的首要任务是在任何情况下，都必须根据用户给出的任意概念或一句话，独立脑补并生成一个完整、结构化、严格格式化的 JSON 分镜脚本。\n"

        "### 必须完全遵守以下规则：\n"
        "1. 无论用户输入什么内容，你**绝不能**提出问题、索要更多信息、要求补充、拒绝生成，或返回与分镜无关的话。\n"
        "2. 如果用户提供的信息不足，你必须自行想象并补全所有细节，包括人物外貌、场景、画面节奏、光线、情绪、动作等。\n"
        "3. 在任何情况下都必须输出一个有效 JSON，且分镜数量必须是 6～10 条之间。\n"
        "4. 如果某项要求缺失，你必须自动脑补，而不是停下来询问。\n"
        "==============================="
        "### 关键规则 1：视觉风格的强制升级（Style Injection）\n"
        "用户给出的风格词通常很短（如“国漫”）。你必须在每个分镜的 `detail` 字段开头，**强制**加上一套具体的、高权重的视觉描述词。\n"
        "举例：\n"
        "- 如果用户说“国漫风格”，你可以扩写为：“(3D玄幻国漫风格)，UE5引擎渲染，极致的皮肤纹理，如梦似幻的东方美学，电影级布光”\n"
        "- 如果用户说“赛博朋克”，你可以扩写为：“(赛博朋克风格)，霓虹灯效，雨夜，高对比度，机械义肢细节，未来都市”\n"
        "**注意：所有分镜必须共享这一套视觉描述，以确保视频画风绝对统一。**\n\n"

        "### 关键规则 2：动态描述\n"
        "在 `detail` 字段中，描述动作必须严格遵循 **“时序逻辑”**：\n"
        "- 必须使用句式：“先 [动作A]，然后 [动作B]，最后 [动作C]”。\n"
        "- 动作必须是物理可见的（如“他手里的薯片掉落在地”），不能是抽象心理（如“他感到失落”）。\n\n"

        "### 关键规则 3：JSON 输出格式\n"
        "只返回 JSON，不要任何 Markdown，不要任何废话。格式如下：\n"

        "### 关键规则 4：J静态描述格式\n"
        "在'image_detail' **必须**描写画面定格那一瞬间的状态。：\n"
        "  - **禁止**出现“然后”、“接着”、“最后”等时间推移词。\n"
        "  - 格式：[风格扩写] + [画面主体静态描述] + [环境背景] + [光照] + [构图/画质标签]\n\n"
        "{\n"
        "  \"shots\": [\n"
        "    {\n"
        "      \"sequence\": 1,\n"
        "      \"subject\": \"(字符串) 画面主体的具体外观（如：体型肥硕的短发青年，穿着破旧道袍），只要出现在detail或者image_detail中，就必须包含\",\n"
        "      \"image_detail\": \"(字符串) [T2I专用] 风格扩写 + 静态画面描述 + 构图, masterpiece, high quality,必填\",\n"
        "      \"detail\": \"(字符串) [视觉风格扩写] + [光影] + [先...然后...最后...] + [环境细节],必填\",\n"
        "      \"narration\": \"(字符串) 对应情节的中文旁白，≤30字\",\n"
        "      \"camera\": \"(字符串) 必须从以下词库中选一个：垂直升降拍摄、水平横移拍摄、镜头推进、镜头后退、全方位环绕、固定机位\",\n"
        "      \"tone\": \"(字符串) 情感基调\",\n"
        "      \"sound\": \"(字符串) 仅包含环境音和动作音效\"\n"
        "    }\n"
        "  ]\n"
        "}"

        "===============================\n"
        "【风格继承（强制执行）】\n"
        "- 如果用户输入中包含 style 或任何风格描述，你必须无条件使用用户指定的风格，禁止替换成示例中的写实风格或其他风格。\n"
        "- 如果用户未提供风格，你才可自行选择视觉风格。\n"
        "===============================\n"
        "【字段填充规则】\n"
        "1. detail（必须包含以下内容）：\n"
        "   - 视觉风格（写实风格/水墨/电影感/科幻…任选）\n"
        "   - 光线（必须有：照明风格、方向、阴影、色温）\n"
        "   - 时序：必须使用“先……然后……最后……”句式\n"
        "   - 空间方位：如前景/画面左侧/背景等\n"
        "   - 背景音效：如风声/呼啸声/雨声/机械声等\n"

        "2. camera（必须从以下列表选择且只选一个）：\n"
        "   - 垂直升降拍摄、水平横移拍摄、镜头推进、镜头后退、\n"
        "   - 仰视或俯视调整、绕轴横向左旋转、绕轴横向右旋转、\n"
        "   - 围绕主体拍摄、全方位环绕、锁定主体移动、固定机位\n"

        "3. narration：必须是中文，≤30 字\n"

        "4. 语言要求：所有值都必须是中文\n"

        "===============================\n"
        "【分镜数量规则】\n"
        "任意输入都必须自动生成 6～10 条分镜，并以你的最佳理解编排情节节奏。\n"
    )

    user_message = f"请将以下创意概念扩写并制作成视频分镜脚本：\n【{story}】"

    payload = {
        "model": "qwen3:latest",
        "format": "json",
        "stream": False,
        "system": system_prompt,
        "prompt": user_message,
        "options": {"temperature": 0.8, "num_ctx": 8192},
    }
    try:
        logger.info(f"发送 Ollama 请求 (全中文模式), 故事片段: {story[:30]}...")
        attempts = 0
        last_err = None
        while attempts < 3:
            try:
                resp = requests.post(OLLAMA_URL, json=payload, timeout=120)
                if resp.status_code != 200:
                    last_err = Exception(f"HTTP {resp.status_code} - {resp.text}")
                    attempts += 1
                    continue
                data = resp.json().get("response", "").strip()
                (OUTPUT_DIR / "ollama_raw.txt").write_text(data, encoding="utf-8")
                try:
                    json_obj = json.loads(data)
                except json.JSONDecodeError:
                    start = data.find('{')
                    end = data.rfind('}') + 1
                    if start != -1 and end != -1:
                        json_obj = json.loads(data[start:end])
                    else:
                        last_err = Exception("JSON 解析失败")
                        attempts += 1
                        continue
                shots = json_obj.get('shots', [])
                valid_shots = []
                for i, shot in enumerate(shots):
                    seq = int(shot.get('sequence', i + 1))
                    narr = shot.get('narration', '')
                    if len(narr) > 20:
                        narr = narr[:19] + "…"
                    valid_shots.append({
                        'id': f"shot_{seq:02d}",
                        'sequence': seq,
                        'subject': shot.get('subject'),
                        'image_detail': shot.get('image_detail'),
                        'detail': shot.get('detail'),
                        'camera': shot.get('camera'),
                        'narration': narr,
                        'tone': shot.get('tone'),
                        'sound': shot.get('sound'),
                    })
                count = len(valid_shots)
                if count < 5 or count > 10:
                    logger.warning(f"分镜数量不在 5-10 范围内 ({count})，重新生成 (attempt={attempts+1})")
                    attempts += 1
                    continue
                logger.info(f"成功生成 {count} 个中文分镜")
                return valid_shots
            except Exception as e:
                last_err = e
                attempts += 1
        logger.error(f"Ollama 多次重试仍失败: {last_err}")
        raise RuntimeError("LLM 分镜生成失败，请重试")
    except Exception as e:
        logger.error(f"Ollama 调用失败: {e}")
        raise




def call_dashscope_llm(messages: List[Dict[str, str]]) -> str:
    """调用阿里云 DashScope API，返回生成的文本内容"""
    if not DASHSCOPE_API_KEY:
        raise ValueError("DASHSCOPE_API_KEY 未配置")
    
    headers = {
        "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "qwen-plus-latest",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048
    }
    
    logger.info(f"调用 DashScope API, 消息长度: {len(str(messages))}")
    
    attempts = 0
    max_attempts = 3
    last_error = None
    
    while attempts < max_attempts:
        try:
            response = requests.post(
                DASHSCOPE_API_URL,
                headers=headers,
                json=payload,
                timeout=60
            )
            
            response.raise_for_status()
            data = response.json()
            
            if data.get("choices") and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"].strip()
            else:
                raise ValueError(f"DashScope API 返回格式异常: {data}")
        except requests.exceptions.RequestException as e:
            attempts += 1
            last_error = e
            logger.warning(f"DashScope API 调用失败 (尝试 {attempts}/{max_attempts}): {e}")
        except (ValueError, KeyError) as e:
            attempts += 1
            last_error = e
            logger.warning(f"DashScope API 响应解析失败 (尝试 {attempts}/{max_attempts}): {e}")
    
    logger.error(f"DashScope API 多次调用失败: {last_error}")
    raise RuntimeError(f"DashScope API 调用失败: {last_error}")


def optimize_i2v_response(i2v_json: Dict[str, Any]) -> Dict[str, Any]:
    """优化图生视频的 JSON 响应，返回优化后的 JSON"""
    optimized_json = json.loads(json.dumps(i2v_json))  # 深拷贝
    for shot in optimized_json.get("shots", []):
        # 1. 将 detail 属性翻译为英文
        detail = shot.get("detail", "")
        if detail:
            logger.debug(f"优化 detail: {detail[:50]}...")
            try:
                messages = [
                    {
                        "role": "system",
                        "content": """You are an expert Prompt Engineer for HunyuanVideo 1.5, specialized in converting structured JSON data into cinematic Image-to-Video prompts.

                Your task is to translate the user's Chinese JSON input into a SINGLE, high-quality English prompt block.

                ### INPUT DATA STRUCTURE
                - "subject": The main character or object.
                - "detail": Description of style, lighting, sequential actions, and spatial details.
                - "narration": Chinese voiceover text.
                - "camera": Camera movement keywords.
                - "tone": Emotional tone.
                - "sound": Background sound description.

                ### GENERATION RULES (Strictly Follow)
                1.  **Structure**: Assemble the prompt in this specific order based on the HunyuanVideo Core Formula:
                    `[Style/Atmosphere] + [Subject Description] + [Sequential Motion/Dynamics] + [Scene/Lighting] + [Camera Movement] + [Sound/Voiceover]`

                2.  **Translation & Refinement**:
                    - Translate all fields to English (EXCEPT the specific content inside "narration").
                    - **Motion**: Convert the `detail` field into a time-sequenced description using conjunctions like "First..., then..., next..., finally..." to ensure fluid video generation.
                    - **Camera**: Map Chinese camera terms to cinematic English terms (e.g., "推" -> "Dolly in", "摇" -> "Pan", "跟随" -> "Camera follows", "旋转" -> "Orbit").
                    - **Details**: Convert abstract emotions in `tone` into visible action details (e.g., "anxious" -> "frowning and pacing").

                3.  **Voiceover Constraint**:
                    - You must append the audio instruction at the very end of the prompt.
                    - Format: **Background sound: [English sound description]. Voiceover says in Chinese "[Original Chinese Narration Content]"**.

                4.  **Output Format**:
                    - Return ONLY the final prompt string. Do not use markdown blocks. Do not add explanations.
                """
                    },
                    {
                        "role": "user",
                        "content": f"""请将以下数据转化为一段单纯的视频生成提示词：
                        {shot}"""
                    }
                ]
                optimized_detail = call_dashscope_llm(messages)
                shot["detail"] = optimized_detail
                logger.info(f"翻译后: {optimized_detail[:50]}...")
            except Exception as e:
                logger.error(f"翻译 detail 失败: {e}")
        
        # # 2. 优化 narration 属性为指定格式
        # narration = shot.get("narration", "")
        # if narration:
        #     logger.info(f"优化 narration: {narration}")
        #     try:
        #         messages = [
        #             {
        #                 "role": "system",
        #                 "content": """你是一个专业的AI视频生成提示词专家。你的唯一任务是将输入的JSON分镜转化为符合I2V模型的高质量Prompt。"
        #                 **转化规则：**
        #                 1. **画面 (Visuals)**: 用英文扩写 `subject` 和 `detail`。加入光影、质感描述，确保画面描述丰富、生动。开头固定用 "The video shows..."。
        #                 2. **运镜 (Camera)**: 将 `camera` 融入画面描述。
        #                 3. **旁白 (Narration)**: 这是画外音。格式必须是：A voiceover says in Chinese: "保留中文内容"。
        #                 4. **音效 (Sound)**: 翻译为英文描述，放在最后。
        #                 5. **基调 (Tone)**: 确保形容词符合 `tone` 的情感（如紧张、悲伤）。
        #                 """
        #             },
        #             {
        #                 "role": "user",
        #                 "content": f"请处理这个分镜数据：{json.dumps(shot, ensure_ascii=False)}\n\n"
        #             } 
        #         ]
        #         optimized_narr = call_dashscope_llm(messages)
        #         shot["narration"] = optimized_narr
        #          logger.info(f"优化后: {optimized_narr}")
        #     except Exception as e:
        #         logger.error(f"优化 narration 失败: {e}")
    
    return optimized_json