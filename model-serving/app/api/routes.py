from typing import List
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from fastapi import APIRouter, BackgroundTasks

from app.core.logging import logger
from app.core.config import OUTPUT_DIR, TEST_FAST_RETURN
from app.models.schemas import (
    CreateStoryboardRequest, CreateStoryboardResponse,
    RegenerateShotRequest, RegenerateShotResponse,
    RenderVideoRequest, RenderVideoResponse,
    OperationStatus, Shot
)
from app.services.llm import generate_storyboard_shots
from app.services.comfy import run_t2i, run_i2v
from app.services.tts import synthesize_tts
from app.services.ffmpeg_merge import merge_clip, concat_clips
from app.services.oss import upload_to_oss
from app.storage.repository import (
    update_operation, upsert_story, save_story_shots,
    upsert_shot, update_story_video_url, get_story_shots
)


# 复制 test.py 中的工作流模板（真实项目可从文件加载或配置中心提供）
COMFY_WORKFLOW_T2I = {
  "3": {"inputs": {"seed": 42, "steps": 20, "cfg": 4, "sampler_name": "euler", "scheduler": "simple", "denoise": 1, "model": ["66", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["58", 0]}, "class_type": "KSampler"},
  "6": {"inputs": {"text": "PLACEHOLDER_PROMPT", "clip": ["38", 0]}, "class_type": "CLIPTextEncode"},
  "7": {"inputs": {"text": "", "clip": ["38", 0]}, "class_type": "CLIPTextEncode"},
  "8": {"inputs": {"samples": ["3", 0], "vae": ["39", 0]}, "class_type": "VAEDecode"},
  "37": {"inputs": {"unet_name": "qwen_image_fp8_e4m3fn.safetensors", "weight_dtype": "default"}, "class_type": "UNETLoader"},
  "38": {"inputs": {"clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "type": "qwen_image", "device": "default"}, "class_type": "CLIPLoader"},
  "39": {"inputs": {"vae_name": "qwen_image_vae.safetensors"}, "class_type": "VAELoader"},
  "58": {"inputs": {"width": 1280, "height": 720, "batch_size": 2}, "class_type": "EmptySD3LatentImage"},
  "60": {"inputs": {"filename_prefix": "T2I_Keyframe", "images": ["8", 0]}, "class_type": "SaveImage"},
  "66": {"inputs": {"shift": 3.5, "model": ["37", 0]}, "class_type": "ModelSamplingAuraFlow"}
}

COMFY_WORKFLOW_I2V = {
  "8": {"inputs": {"samples": ["125", 0], "vae": ["10", 0]}, "class_type": "VAEDecode"},
  "10": {"inputs": {"vae_name": "hunyuanvideo15_vae_fp16.safetensors"}, "class_type": "VAELoader"},
  "11": {"inputs": {"clip_name1": "qwen_2.5_vl_7b_fp8_scaled.safetensors", "clip_name2": "byt5_small_glyphxl_fp16.safetensors", "type": "hunyuan_video_15", "device": "default"}, "class_type": "DualCLIPLoader"},
  "12": {"inputs": {"unet_name": "hunyuanvideo1.5_720p_i2v_fp16.safetensors", "weight_dtype": "default"}, "class_type": "UNETLoader"},
  "44": {"inputs": {"text": "PLACEHOLDER_PROMPT", "clip": ["11", 0]}, "class_type": "CLIPTextEncode"},
  "78": {"inputs": {"width": 1280, "height": 720, "length": 85, "batch_size": 2, "positive": ["44", 0], "negative": ["93", 0], "vae": ["10", 0], "start_image": ["80", 0], "clip_vision_output": ["79", 0]}, "class_type": "HunyuanVideo15ImageToVideo"},
  "79": {"inputs": {"crop": "center", "clip_vision": ["81", 0], "image": ["80", 0]}, "class_type": "CLIPVisionEncode"},
  "80": {"inputs": {"image": "PLACEHOLDER_IMAGE_FILENAME"}, "class_type": "LoadImage"},
  "81": {"inputs": {"clip_name": "sigclip_vision_patch14_384.safetensors"}, "class_type": "CLIPVisionLoader"},
  "93": {"inputs": {"text": "blur, distortion, low quality, watermark", "clip": ["11", 0]}, "class_type": "CLIPTextEncode"},
  "101": {"inputs": {"fps": 24, "images": ["8", 0]}, "class_type": "CreateVideo"},
  "102": {"inputs": {"filename_prefix": "Hunyuan_I2V", "format": "auto", "codec": "h264", "video": ["101", 0]}, "class_type": "SaveVideo"},
  "125": {"inputs": {"noise": ["127", 0], "guider": ["129", 0], "sampler": ["128", 0], "sigmas": ["126", 0], "latent_image": ["78", 2]}, "class_type": "SamplerCustomAdvanced"},
  "126": {"inputs": {"scheduler": "simple", "steps": 20, "denoise": 1, "model": ["12", 0]}, "class_type": "BasicScheduler"},
  "127": {"inputs": {"noise_seed": 0}, "class_type": "RandomNoise"},
  "128": {"inputs": {"sampler_name": "euler"}, "class_type": "KSamplerSelect"},
  "129": {"inputs": {"cfg": 6, "model": ["130", 0], "positive": ["78", 0], "negative": ["78", 1]}, "class_type": "CFGGuider"},
  "130": {"inputs": {"shift": 7, "model": ["12", 0]}, "class_type": "ModelSamplingSD3"}
}


router = APIRouter(prefix="/api/v1")


@router.post("/storyboard/create", response_model=CreateStoryboardResponse)
def create_storyboard(req: CreateStoryboardRequest, background_tasks: BackgroundTasks):
    logger.info(f"CreateStoryboardTask 开始: op={req.operation_id}, story={req.story_id}")
    upsert_story(req.story_id, req.display_name, req.style, req.script_content)
    try:
        shots_raw = generate_storyboard_shots(req.script_content)
    except Exception as e:
        update_operation(req.operation_id, "Failed", detail=str(e))
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail="LLM 分镜生成失败，请稍后重试")
    processed_shots: List[Shot] = []
    for i, s in enumerate(shots_raw):
        shot = Shot(
            id=s.get('id', f'shot_{i+1:02d}'),
            sequence=s.get('sequence', i+1),
            subject=s.get('subject'),
            detail=s.get('detail'),
            camera=s.get('camera'),
            narration=s.get('narration'),
            tone=s.get('tone'),
        )
        processed_shots.append(shot)
    # 在生成分镜后，同步执行文生图（生成关键帧）并生成 image_url
    num_gpu_workers = 2
    with ThreadPoolExecutor(max_workers=num_gpu_workers) as ex:
        futures = []
        for shot in processed_shots:
            keyframe = OUTPUT_DIR / f"{req.story_id}_shot_{shot.sequence:02d}_keyframe.png"
            text_prompt = shot.detail or ""
            futures.append(ex.submit(run_t2i, text_prompt, keyframe, COMFY_WORKFLOW_T2I))
        for _ in as_completed(futures):
            pass

    # 为每个已生成的关键帧上传到 OSS，并设置 image_url（HTTP URL）
    for shot in processed_shots:
        keyframe = OUTPUT_DIR / f"{req.story_id}_shot_{shot.sequence:02d}_keyframe.png"
        if keyframe.exists():
            object_key = f"stories/{req.story_id}/shots/{shot.sequence:02d}/keyframe.png"
            url = upload_to_oss(object_key, keyframe)
            shot.image_url = url or f"/static/{keyframe.name}"

    # 保存 shots 初始结构到“数据库”
    save_story_shots(req.story_id, [shot.dict() for shot in processed_shots])

    # 仅生成分镜并落库，按接口规范立即标记为 Success
    update_operation(req.operation_id, "Success")
    return CreateStoryboardResponse(operation=OperationStatus(operation_id=req.operation_id, status="Success"), shots=processed_shots)


@router.post("/shot/regenerate", response_model=RegenerateShotResponse)
def regenerate_shot(req: RegenerateShotRequest, background_tasks: BackgroundTasks):
    logger.info(f"RegenerateShot 开始: op={req.operation_id}, story={req.story_id}, shot={req.shot_id}")
    # 读取已有分镜，保留除 detail 以外的字段
    shots_list = get_story_shots(req.story_id)
    existed = None
    for s in shots_list:
        if s.get('id') == req.shot_id:
            existed = s
            break

    detail_text = (req.detail or req.details or req.prompt or (existed or {}).get('detail') or "").strip()
    subject = req.subject if req.subject is not None else (existed or {}).get('subject')
    camera = req.camera if req.camera is not None else (existed or {}).get('camera')
    narration = req.narration if req.narration is not None else (existed or {}).get('narration')
    tone = req.tone if req.tone is not None else (existed or {}).get('tone')
    sequence = (existed or {}).get('sequence') or 0

    # 生成关键帧（同步），避免返回空 URL
    keyframe = OUTPUT_DIR / f"{req.story_id}_{req.shot_id}_keyframe.png"
    text_prompt = detail_text
    if not text_prompt and existed and existed.get('detail'):
        text_prompt = existed['detail']
    if not text_prompt and existed:
        text_prompt = f"参考上一帧风格，保持镜头语义一致：{existed.get('subject','')}。{existed.get('narration','')}"

    run_t2i(text_prompt, keyframe, COMFY_WORKFLOW_T2I)
    k_obj = f"stories/{req.story_id}/shots/{req.shot_id}/keyframe.png"
    k_url = upload_to_oss(k_obj, keyframe)

    # 构造返回的 Shot，保留原有字段，仅更新 detail 与 image_url
    shot = Shot(
        id=req.shot_id,
        sequence=sequence,
        subject=subject,
        detail=detail_text,
        camera=camera,
        narration=narration,
        tone=tone,
        image_url=k_url or f"/static/{keyframe.name}",
        video_url=(existed or {}).get('video_url')
    )

    # 持久化当前分镜与列表
    upsert_shot(req.story_id, req.shot_id, shot.dict())
    if shots_list:
        for s in shots_list:
            if s.get('id') == req.shot_id:
                s.update({
                    'detail': shot.detail,
                    'image_url': shot.image_url,
                    'subject': shot.subject,
                    'camera': shot.camera,
                    'narration': shot.narration,
                    'tone': shot.tone,
                    'sequence': shot.sequence,
                    'video_url': shot.video_url,
                })
                break
        save_story_shots(req.story_id, shots_list)

    update_operation(req.operation_id, "Success")
    logger.info("RegenerateShot 完成：保留其他字段，只更新 detail 与 image_url")
    return RegenerateShotResponse(operation=OperationStatus(operation_id=req.operation_id, status="Success"), shot=shot)


@router.post("/video/render", response_model=RenderVideoResponse)
def render_video(req: RenderVideoRequest, background_tasks: BackgroundTasks):
    logger.info(f"RenderVideo 开始: op={req.operation_id}, story={req.story_id}")
    final_out = OUTPUT_DIR / f"{req.story_id}_FINAL_MOVIE.mp4"

    def worker_concat():
        valid_clips = sorted([p for p in OUTPUT_DIR.glob(f"{req.story_id}_shot_*_final.mp4")])
        if valid_clips:
            list_file = OUTPUT_DIR / "concat_list.txt"
            with list_file.open("w", encoding="utf-8") as f:
                for p in valid_clips:
                    f.write(f"file '{p.resolve()}'\n")
            concat_clips(list_file, final_out)
        # 上传合成总视频到 OSS
        mv_obj = f"stories/{req.story_id}/movie/final.mp4"
        mv_url = upload_to_oss(mv_obj, final_out)
        update_story_video_url(req.story_id, mv_url or str(final_out.resolve()))
        update_operation(req.operation_id, "Success")
        logger.info("RenderVideo 完成，Operation 标记为 Success")

    update_operation(req.operation_id, "Running")
    background_tasks.add_task(worker_concat)
    if TEST_FAST_RETURN:
        logger.info(f"TEST_FAST_RETURN 模式，直接返回")
        placeholder = next(OUTPUT_DIR.glob("*_FINAL_MOVIE.mp4"), final_out)
        return RenderVideoResponse(operation=OperationStatus(operation_id=req.operation_id, status="Running"), video_url=f"/static/{placeholder.name}")
    mv_obj = f"stories/{req.story_id}/movie/final.mp4"
    mv_url = upload_to_oss(mv_obj, final_out)
    return RenderVideoResponse(operation=OperationStatus(operation_id=req.operation_id, status="Running"), video_url=mv_url or f"/static/{final_out.name}")
