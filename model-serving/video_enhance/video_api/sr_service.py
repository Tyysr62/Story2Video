import os
import torch
from typing import Tuple
from .flashvsr_wrapper import init_pipeline, prepare_tensors, prepare_input_tensor, tensor2video, save_video
def vsr_log(msg, message_type="normal"):
    print(msg)

class SRService:
    def __init__(self, version: str = "10", mode: str = "tiny", dtype_str: str = "bf16", device: str = "auto"):
        dtype_map = {
            "fp16": torch.float16,
            "bf16": torch.bfloat16,
        }
        self.dtype = dtype_map.get(dtype_str, torch.bfloat16)
        self.version = version
        self.mode = mode
        self.device = device
        self.pipe = None

    def warmup(self):
        if self.pipe is None:
            vsr_log("[SRService] Loading FlashVSR pipeline...", message_type="info")
            dev = self.device
            if dev == "auto":
                dev = "cuda:0" if torch.cuda.is_available() else "cpu"
            self.device = dev
            self.pipe = init_pipeline(self.version, self.mode, dev, self.dtype)
            vsr_log("[SRService] FlashVSR ready", message_type="finish")

    def super_resolve(self, input_path: str, scale: int, output_path: str) -> Tuple[str, int]:
        self.warmup()
        frames, fps = prepare_tensors(input_path, dtype=self.dtype)
        # 直接走非 tiny-long 路径，使用一次性管线
        LQ, th, tw, F = prepare_input_tensor(frames, self.device, scale=scale, dtype=self.dtype)
        LQ = LQ.to(self.device)
        video = self.pipe(
            prompt="", negative_prompt="", cfg_scale=1.0, num_inference_steps=1, seed=0, tiled=False,
            LQ_video=LQ, num_frames=F, height=th, width=tw, is_full_block=False, if_buffer=True,
            topk_ratio=2*768*1280/(th*tw), kv_ratio=3, local_range=11,
            color_fix=False, unload_dit=False, fps=fps, output_path=output_path, tiled_dit=True
        )
        final = tensor2video(video).to("cpu")
        save_video(final, output_path, fps=fps, quality=6)
        return output_path, fps
