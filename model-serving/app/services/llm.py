import json
import requests
from typing import List, Dict
from app.core.config import OLLAMA_URL, OUTPUT_DIR
from app.core.logging import logger


def generate_storyboard_shots(story: str) -> List[Dict]:
    """调用本地 Ollama 生成分镜结构，返回 shots 列表"""

    system_prompt = (
        "角色设定：一位拥有无限想象力的AI视频导演和金牌编剧。你的核心能力是将哪怕最简短的一个概念或一句话，瞬间扩写成一个画面感极强的分镜脚本。。你的任务是将用户的故事大纲转化为结构化的JSON分镜脚本。\n\n"

        "### 核心指令 (Critical Instructions)：\n"
        "1. **必须生成**：无论用户输入多么简短（例如只有“一个悲伤的男人”），你**绝不能**返回错误或要求更多信息。**必须**基于该概念自动创作出一个完整的微电影剧情。\n"
        "2. **自动脑补**：如果缺少细节，请自行想象环境、人物外观、具体动作。你是导演，你有最终决定权。\n"
        "3. **格式强制**：只返回符合下述定义的 JSON 格式。\n\n"

        "### 核心限制 (Constraints)：\n"
        "1. **强制数量**：生成最少 5 个分镜，最多 8 个分镜。\n"
        "2. **语言要求**：JSON中的**所有值必须严格使用中文**。\n"
        "3. **旁白限制**：'narration' 字段必须是中文，且严格控制在 20 字以内。\n\n"

        "### 字段填写指南 (Field Guidelines)：\n\n"

        "**1. detail (画面详细描述):**\n"
        "必须包含以下四个维度的中文描述，组合成一段通顺的提示词：\n"
        "   A. **视觉风格**：(如：写实风格、赛博朋克、水墨画、电影感)\n"
        "   B. **光线控制 (必须包含)**：\n"
        "      - 照明风格 (柔和/硬光/霓虹)\n"
        "      - 光线方向 (侧光/顶光/逆光)\n"
        "      - 阴影细节 (高对比度/柔和渐变)\n"
        "      - 色温 (暖色/冷色/黄金时刻)\n"
        "   C. **动态时序 (关键)**：必须使用“**先……然后……最后……**”的句式描述主体动作。\n"
        "   D. **空间方位**：明确指出物体位置 (如：画面左侧、前景、背景)。\n"
        "   *示例*：写实风格。暖色调的黄金时刻光线，柔和的侧光打在脸上。画面左侧，一个穿着白衬衫的男子先低头看手表，然后抬头望向画面右上方，最后露出焦虑的表情。\n\n"

        "**2. camera (运镜):**\n"
        "**只能**从以下中文关键词中选择一个，不要创造新词：\n"
        "   - [基础移动]：垂直升降拍摄、水平横移拍摄、镜头推进、镜头后退\n"
        "   - [角度调整]：仰视或俯视调整、绕轴横向左/右旋转\n"
        "   - [环绕旋转]：围绕主体拍摄、全方位环绕\n"
        "   - [特殊模式]：锁定主体移动、固定机位\n\n"

        "**3. subject (主体):**\n"
        "   - 描述画面核心角色 (如：穿红裙的女孩)，若无明确主体则填 'None'。\n\n"

        "### 输出格式 (Output Format)：\n"
        "仅返回一个包含 'shots' 根节点的有效 JSON 对象。不要使用 markdown 格式化。\n"
        "{\n"
        "  \"shots\": [\n"
        "    {\n"
        "      \"sequence\": 1, (整数，从1开始)\n"
        "      \"subject\": \"(字符串) 画面主体角色\",\n"
        "      \"detail\": \"(字符串) 包含风格、光线、时序动态、方位的完整中文画面描述\",\n"
        "      \"camera\": \"(字符串) 必须是上述运镜关键词之一\",\n"
        "      \"narration\": \"(字符串) 不超过20字的中文旁白\"\n"
        "      \"tone\": \"(字符串) 语音的情感基调 (如：平静、紧张、兴奋)\",\n"
        "    }\n"
        "  ]\n"
        "}"
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
                if count < 4 or count > 8:
                    logger.warning(f"分镜数量不在 4-8 范围内 ({count})，重新生成 (attempt={attempts+1})")
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
