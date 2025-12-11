# 🎬 Story2Video (Model Serving)
![](https://img.shields.io/badge/Python-3.12-blue.svg)  
![](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)  
![](https://img.shields.io/badge/License-MIT-green.svg)

**一体化 AI 视频生成模型服务**。本项目旨在提供从剧本到完整视频的全链路自动化服务，涵盖分镜生成、关键帧绘制、图生视频、语音合成及后期拼接。

[🎥 查看演示视频](https://bytedance-s2v.oss-cn-beijing.aliyuncs.com/stories/story_11111111-2222-3333-4444-555555555555_4b7fd35c-e675-47d8-8c70-58fbe0d8c99d_movie_final%20%281%29.mp4)
[🎥 增强视频](https://bytedance-s2v.oss-cn-beijing.aliyuncs.com/stories/test_2X_48fps.mp4)
---

## 📖 目录
+ [项目概览](#-项目概览)
+ [核心工作流](#-核心工作流)
+ [技术栈](#-技术栈)
+ [目录结构](#-目录结构)
+ [环境与安装](#-环境与安装)
+ [配置说明](#-配置说明)
+ [API 使用指南](#-api-使用指南)
+ [视频增强](#-视频增强)

---

## 🔭 项目概览
本项目作为一个独立的服务端模块，对外提供 RESTful API，核心处理链路如下：

1. **分镜生成**：基于 LLM 解析剧本，生成结构化分镜。
2. **文生图 (T2I)**：生成高质量的分镜关键帧。
3. **图生视频 (I2V)**：将静态关键帧转化为动态视频片段。
4. **拼接合成**：结合 TTS 语音、背景音乐与视频片段，合成最终成品。
5. **回传服务**：结果上传 OSS 并回调业务端。

---

## 🔄 核心工作流
![](https://cdn.nlark.com/yuque/0/2025/png/40409063/1765423522762-cc647ea5-e422-472d-9906-544a5fb9bf00.png)

## 🛠 技术栈
+ **核心框架**: `FastAPI`, `Uvicorn`
+ **数据校验**: `Pydantic`
+ **日志管理**: `Loguru`
+ **多媒体处理**: `FFmpeg-python`
+ **网络请求**: `Requests`
+ **外部依赖**:
    - **LLM**: Ollama, 阿里 DashScope
    - **I2V/T2I**: ComfyUI, HunyuanVideo-1.5, Pixverse
    - **TTS**: CosyVoice (Local), DashScope TTS
    - **存储**: 阿里云 OSS
    - **增强**: RIFE, FastVSR

## 📂 目录结构
```plain
model-serving/
├── app/
│   ├── api/                # API 路由与端点定义
│   ├── core/               # 核心配置 (Config, Logging)
│   ├── models/             # Pydantic 数据模型 (Schemas)
│   ├── services/           # 业务逻辑 (LLM, Comfy, OSS, TTS, FFmpeg)
│   ├── storage/            # 持久化层 (JSON原子写)
│   └── main.py             # 程序入口 (App实例, 中间件, 异常处理)
├── CosyVoice/              # [本地] CosyVoice 配音推理服务
│   └── api.py              # API 适配层
├── HunyuanVideo-1.5/       # [本地] HunyuanVideo 视频生成服务
│   └── api.py              # API 适配层
├── video_enhance/          # [工具] 视频增强 (SR, 插帧)
│   ├── video_api/          # 增强逻辑封装
│   └── sr_if.sh            # 启动脚本
├── example/                # 生成结果示例 (I2V, T2I, JSON)
├── deploy.sh               # 自动化部署脚本
├── requirements.txt        # Python 依赖清单
└── README.md               # 说明文档
```

## 💻 环境与安装
1. **基础环境设置**

```plain
# 创建 Conda 环境
conda create -n model_serving python==3.12
conda activate model_serving

# 安装核心依赖
pip install -r requirements.txt

# 运行部署脚本 (安装 Ollama, CosyVoice, ComfyUI 依赖等)
sh deploy.sh
```

2. **推理后端配置**  
根据您的硬件资源选择 本地推理 或 API 推理。

**方案 A：本地推理 (Local Inference)**

+ 适用场景： 拥有高性能 GPU（我们在一台拥有2 X 4090（50G）的情况能够稳定运行,），需数据隐私。
+ 操作：
    - 修改 app/core/config.py 设置 LOCAL_INFERENCE = True。
    - 安装并启动 HunyuanVideo-1.5 和 CosyVoice。

```plain
# 分别在不同终端窗口启动
python HunyuanVideo-1.5/api.py
python CosyVoice/api.py
```

**方案 B：API 推理 (Cloud API)**

+ 适用场景：轻量级部署，依赖第三方服务。
+ 操作：
    - 修改 app/core/config.py 设置 LOCAL_INFERENCE = False。
    - 配置 Pixverse 和 Dashboard 的 API Key。
3. **OSS 配置**  
在 model-serving/app/core/config.py 中填入阿里云 OSS 的 AccessKey、Secret 和 Bucket 信息。

## 🚀 启动服务
```plain
# 启动主服务 (默认端口 12345)
python -m app.main
```

## 📡 API 使用指南
1. **生成分镜和首帧图**  
初始化任务，通过 LLM 生成分镜脚本并绘制第一帧。

```plain
curl -X POST http://localhost:12345/api/v1/storyboard/create 
-H "Content-Type: application/json" 
-d '{
    "operation_id": "op-001",
    "story_id": "story-001",
    "user_id": "u-001",
    "display_name": "温馨短片",
    "script_content": "小狗找妈妈的故事",
    "style": "温馨可爱"
}'

```

2. **重新生成单张分镜**

对不满意的特定分镜进行重绘或修改。

```plain
curl -X POST http://localhost:12345/api/v1/shot/regenerate 
-H "Content-Type: application/json" 
-d '{
    "operation_id": "op-003",
    "story_id": "story-001",
    "shot_id": "shot_03",
    "user_id": "u-001",
    "detail": "动画风格。冷暖交织的侧光，高对比度阴影。画面中央，小狗先绕着屋子转圈，然后冲向门口，最后停在门框前，眼睛里带着疑惑。",
    "style": "温馨可爱"
}'
```

3. **生成完整视频**

触发最终渲染流程：I2V 生成 -> 语音合成 -> 视频拼接 -> 上传。

```plain
curl -X POST http://localhost:12345/api/v1/video/render 
-H "Content-Type: application/json" 
-d '{
    "operation_id": "op-001",
    "story_id": "story-007",
    "user_id": "u-007"
}'

```

## 🔔 视频增强 (选配)
如果生成的视频清晰度或流畅度不足，可以使用内置的增强工具。

工具: [RIFE ](https://github.com/hzwer/Practical-RIFE/tree/main)(插帧), [FastVSR _plus](about:blank)(超分)最终文件夹应该为

```plain
├── video_enhance/          # [工具] 视频增强 (SR, 插帧)
│   ├── FlashVSR/           
│   ├── RIFE/               
│   ├── video_api/
│   └── sr_if.sh            # 启动脚本
```

启用方式: 确保 video_enhance/sr_if.sh 脚本可执行，并在 config.py 中启用增强选项。

