#!/bin/bash

# ==============================================================================
# 故事成片项目 - AI 全栈自动化部署脚本 (目标环境: Conda S2V)
# 依赖项: Ollama (Qwen2.5), ComfyUI (Flux.1 + CogVideoX), CosyVoice
# 假设: Conda环境 S2V 已存在，且已安装 Python/Torch/CUDA 相关依赖。
# ==============================================================================

set -e  # 遇到错误立即停止

# --- 配置区域 ---
INSTALL_DIR="$HOME/workspace/story_project_ai"
COMFY_DIR="$INSTALL_DIR/ComfyUI"
COSY_DIR="$INSTALL_DIR/CosyVoice"
CONDA_ENV_NAME="s2v" # 使用用户指定的 Conda 环境
HF_MIRROR="https://hf-mirror.com"
PYPI_MIRROR="https://pypi.tuna.tsinghua.edu.cn/simple"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}[1/6] 系统环境检查与初始化...${NC}"

# 检查 Conda 环境是否存在
if ! conda info --envs | grep -q "$CONDA_ENV_NAME"; then
    echo -e "${RED}错误: Conda 环境 '$CONDA_ENV_NAME' 不存在。请先创建并安装基础依赖。${NC}"
    exit 1
fi
echo "确认目标环境: $CONDA_ENV_NAME 已就绪。"

# 检查显卡及基础工具
# if ! command -v nvidia-smi &> /dev/null; then
#     echo -e "${RED}错误: 未检测到 NVIDIA 驱动。${NC}"
#     exit 1
# fi
# echo "显卡状态正常。"

# 创建工作目录
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 安装基础系统依赖 (git, curl, ffmpeg)
echo "安装系统依赖 (git, curl, ffmpeg)..."
sudo apt-get update && sudo apt-get install -y git curl ffmpeg

# 设置 HF 镜像环境变量
export HF_ENDPOINT=$HF_MIRROR


# ==============================================================================
echo -e "${GREEN}[2/6] 部署 Ollama & Qwen2.5-7B-Instruct (Int4)...${NC}"
# ==============================================================================

if ! command -v ollama &> /dev/null; then
    echo "正在安装 Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "Ollama 已安装。"
fi

# 启动 Ollama 服务 (后台)
if ! pgrep -x "ollama" > /dev/null; then
    echo "启动 Ollama 服务..."
    ollama serve &
    sleep 5 # 等待服务启动
fi

echo "拉取 Qwen2.5-7B 模型..."
ollama pull qwen2.5:7b-instruct-q4_K_M


# # ==============================================================================
# echo -e "${GREEN}[3/6] 部署 ComfyUI & Flux.1-schnell (安装应用依赖)...${NC}"
# # ==============================================================================

# if [ ! -d "$COMFY_DIR" ]; then
#     git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFY_DIR"
# fi

# cd "$COMFY_DIR"

# # 在 S2V 环境中安装 ComfyUI 依赖
# echo "在 $CONDA_ENV_NAME 环境中安装 ComfyUI 依赖..."
# conda run -n "$CONDA_ENV_NAME" pip install -r requirements.txt -i "$PYPI_MIRROR"
# conda run -n "$CONDA_ENV_NAME" pip install huggingface_hub -i "$PYPI_MIRROR"


# # 下载 Flux.1-schnell (FP8)
# MODEL_PATH="$COMFY_DIR/models/checkpoints"
# FLUX_FILE="$MODEL_PATH/flux1-schnell-fp8.safetensors"

# if [ ! -f "$FLUX_FILE" ]; then
#     echo "下载 Flux.1-schnell (FP8) 模型 (约12GB)..."
#     # 使用 S2V 环境中的 huggingface-cli
#     conda run -n "$CONDA_ENV_NAME" huggingface-cli download Kijai/flux-fp8 flux1-schnell-fp8.safetensors --local-dir "$MODEL_PATH" --local-dir-use-symlinks False
# else
#     echo "Flux.1-schnell 模型已存在。"
# fi

# cd "$INSTALL_DIR"


# # ==============================================================================
# echo -e "${GREEN}[4/6] 配置 CogVideoX 环境 (ComfyUI 插件)...${NC}"
# # ==============================================================================

# # 安装 CogVideoWrapper 插件
# CUSTOM_NODES="$COMFY_DIR/custom_nodes"
# WRAPPER_DIR="$CUSTOM_NODES/ComfyUI-CogVideoXWrapper"

# if [ ! -d "$WRAPPER_DIR" ]; then
#     echo "安装 ComfyUI-CogVideoXWrapper..."
#     git clone https://github.com/kijai/ComfyUI-CogVideoXWrapper.git "$WRAPPER_DIR"
#     # 安装插件依赖
#     conda run -n "$CONDA_ENV_NAME" pip install -r "$WRAPPER_DIR/requirements.txt" -i "$PYPI_MIRROR"
# fi

# # 下载 CogVideoX 配置文件 (大权重需手动补齐)
# COG_MODEL_DIR="$COMFY_DIR/models/diffusers/CogVideoX-5b-I2V"
# mkdir -p "$COG_MODEL_DIR"

# echo "下载 CogVideoX 配置文件..."
# conda run -n "$CONDA_ENV_NAME" huggingface-cli download THUDM/CogVideoX-5b-I2V --include "vae/*" "text_encoder/*" "scheduler/*" "model_index.json" --local-dir "$COG_MODEL_DIR" --local-dir-use-symlinks False
# echo "注意：核心 Transformer 模型权重需手动补齐。"

# ==============================================================================
echo -e "${GREEN}[5/6] 部署 CosyVoice (安装应用依赖)...${NC}"
# ==============================================================================

cd "$INSTALL_DIR"
if [ ! -d "$COSY_DIR" ]; then
    git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git "$COSY_DIR"
fi

cd "$COSY_DIR"

# 在 S2V 环境中安装 CosyVoice 依赖
echo "在 $CONDA_ENV_NAME 环境中安装 CosyVoice 依赖..."
# 安装 pynini (CosyVoice 难点，先尝试 Conda)
conda run -n "$CONDA_ENV_NAME" conda install -y -c conda-forge pynini=2.1.5 || conda run -n "$CONDA_ENV_NAME" pip install pynini -i "$PYPI_MIRROR"

# 安装其余依赖
conda run -n "$CONDA_ENV_NAME" pip install -r requirements.txt -i "$PYPI_MIRROR"
conda run -n "$CONDA_ENV_NAME" pip install modelscope -i "$PYPI_MIRROR"

# 下载模型
echo "下载 CosyVoice-300M 模型..."
conda run -n "$CONDA_ENV_NAME" python3 -c "from modelscope import snapshot_download; snapshot_download('iic/CosyVoice-300M', local_dir='pretrained_models/CosyVoice-300M')"

cd "$INSTALL_DIR"

# ==============================================================================
echo -e "${GREEN}[6/6] 部署完成！正在生成启动命令...${NC}"
# ==============================================================================

echo "-----------------------------------------------------"
echo -e "${GREEN}所有依赖已安装到 Conda 环境 '$CONDA_ENV_NAME' 中。${NC}"
echo "启动命令提示:"
echo "1. 启动 ComfyUI (生图/生视频):"
echo "   conda run -n $CONDA_ENV_NAME python $COMFY_DIR/main.py --listen"
echo "2. 启动 CosyVoice (TTS):"
echo "   conda run -n $CONDA_ENV_NAME python $COSY_DIR/webui.py --port 9233 --model_dir pretrained_models/CosyVoice-300M"
echo "3. 启动 Ollama (LLM):"
echo "   ollama serve"
echo "-----------------------------------------------------"