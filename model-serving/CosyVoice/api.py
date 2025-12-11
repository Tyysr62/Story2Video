import sys
import os
# 将当前目录及 Matcha-TTS 加入路径
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'third_party/Matcha-TTS'))

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
# 注意：这里导入的是 CosyVoice2
from cosyvoice.cli.cosyvoice import CosyVoice2
from cosyvoice.utils.file_utils import load_wav
import torchaudio
import uvicorn
import io
from fastapi.responses import Response

# --- 配置区域 ---
# 请确保您已经下载了 CosyVoice2-0.5B 模型到此目录
MODEL_DIR = 'pretrained_models/CosyVoice2-0.5B'

# 定义默认的参考音频（用于 Zero-Shot 克隆）
# CosyVoice2 需要一段参考音频和对应的文本来确定音色
# 这里使用仓库自带的示例音频
DEFAULT_PROMPT_WAV = './asset/zero_shot_prompt.wav'
DEFAULT_PROMPT_TEXT = '希望你以后能够做的比我还好呦。'

print(f"正在初始化 CosyVoice2 模型，路径: {MODEL_DIR} ...")

try:
    # 初始化 CosyVoice2
    # 注意：如果显存紧张，可以尝试 fp16=True
    cosyvoice = CosyVoice2(MODEL_DIR, load_jit=False, load_trt=False, fp16=False)
    
    # 预加载参考音频 (16k采样率)
    if os.path.exists(DEFAULT_PROMPT_WAV):
        prompt_speech_16k = load_wav(DEFAULT_PROMPT_WAV, 16000)
        print(f"✅ 模型加载成功！已加载默认参考音频: {DEFAULT_PROMPT_WAV}")
    else:
        print(f"❌ 错误: 找不到参考音频文件 {DEFAULT_PROMPT_WAV}")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ 模型加载失败: {e}")
    print("提示: 请确保已下载 CosyVoice2-0.5B 模型: git clone https://www.modelscope.cn/iic/CosyVoice2-0.5B.git pretrained_models/CosyVoice2-0.5B")
    sys.exit(1)

# --- 定义 API ---
app = FastAPI()

class TTSRequest(BaseModel):
    text: str
    speaker: str = ""     # CosyVoice2 模式下，此参数将被忽略（或用于扩展切换不同的prompt wav）
    speed: float = 1.0

@app.post("/v1/tts")
async def generate_tts(request: TTSRequest):
    try:
        # CosyVoice2 主要使用 Zero-Shot 模式
        # 我们忽略 request.speaker，统一使用预加载的 prompt_speech_16k 进行克隆
        # 这样可以兼容之前写的 test.py，无论传什么 speaker 都能跑通
        
        print(f"正在生成 (CosyVoice2 Zero-Shot): '{request.text}'")

        # 使用 inference_zero_shot
        # 参数: (目标文本, 参考文本, 参考音频, stream, speed)
        output_gen = cosyvoice.inference_zero_shot(
            request.text, 
            DEFAULT_PROMPT_TEXT, 
            prompt_speech_16k, 
            stream=False, 
            speed=request.speed
        )
        
        # 获取生成结果 (取出生成器的第一个结果)
        output = next(output_gen)
        tts_audio = output['tts_speech']
        
        # 转为 WAV 格式返回
        buffer = io.BytesIO()
        # 注意：使用模型配置的采样率保存
        torchaudio.save(buffer, tts_audio, cosyvoice.sample_rate, format="wav")
        buffer.seek(0)
        
        return Response(content=buffer.read(), media_type="audio/wav")

    except Exception as e:
        print(f"❌ 生成失败详情: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9233)
