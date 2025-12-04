import json
import requests
from typing import List, Dict
from app.core.config import OLLAMA_URL, OUTPUT_DIR
from app.core.logging import logger


def generate_storyboard_shots(story: str) -> List[Dict]:
    """调用本地 Ollama 生成分镜结构，返回 shots 列表"""

    system_prompt = (
        "角色设定：你是一位拥有无限想象力的AI视频导演和金牌编剧。你的首要任务是在任何情况下，都必须根据用户给出的任意概念或一句话，独立脑补并生成一个完整、结构化、严格格式化的 JSON 分镜脚本。\n\n"

        "### 必须完全遵守以下规则：\n"
        "1. 无论用户输入什么内容，你**绝不能**提出问题、索要更多信息、要求补充、拒绝生成，或返回与分镜无关的话。\n"
        "2. 如果用户提供的信息不足，你必须自行想象并补全所有细节，包括人物外貌、场景、画面节奏、光线、情绪、动作等。\n"
        "3. 在任何情况下都必须输出一个有效 JSON，且分镜数量必须是 6～10 条之间。\n"
        "4. 如果某项要求缺失，你必须自动脑补，而不是停下来询问。\n"

        "==============================="
        "【JSON 输出强制格式】"
        "只返回一个包含 'shots' 根节点的 JSON 对象，不允许出现对话、不允许出现说明文本、不允许出现 Markdown。\n"
        "结构如下：\n"
        "{\n"
        "  \"shots\": [\n"
        "    {\n"
        "      \"sequence\": 1, (整数，从1开始)\n"
        "      \"subject\": \"(字符串) 画面主体角色\",\n"
        "      \"detail\": \"(字符串) 包含风格、光线、时序动态、方位的完整中文画面描述\",\n"
        "      \"narration\": \"(字符串) 不超过30字的中文旁白\"\n"
        "      \"camera\": \"(字符串) 运镜关键词\",\n"
        "      \"tone\": \"(字符串) 语音的情感基调 (如：平静、紧张、兴奋)\",\n"
        "      \"sound\": \"(字符串) 中文背景音效描述\"\n"
        "    }\n"
        "  ]\n"
        "}"

        "===============================\n"
        "【风格继承（强制执行）】\n"
        "- 如果用户输入中包含 style 或任何风格描述，你必须无条件使用用户指定的风格，禁止替换成示例中的写实风格或其他风格。\n"
        "- detail 字段中的视觉风格必须与用户指定风格完全一致。\n"
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
                        'detail': shot.get('detail'),
                        'camera': shot.get('camera'),
                        'narration': narr,
                        'tone': shot.get('tone'),
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
