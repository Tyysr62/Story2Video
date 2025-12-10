import os
import sys
import torch
import cv2
import numpy as np
from typing import Tuple
from queue import Queue

# allow importing from 'Practical-RIFE' directory (contains a hyphen)
PR_ROOT = os.path.join(os.getcwd(), 'Practical-RIFE')
if PR_ROOT not in sys.path:
    sys.path.append(PR_ROOT)
from train_log.RIFE_HDv3 import Model

class IFService:
    def __init__(self):
        self.model = None

    def warmup(self):
        if self.model is None:
            self.model = Model()
            self.model.load_model('Practical-RIFE/train_log', -1)
            self.model.eval()
            self.model.device()

    def interpolate(self, input_path: str, multi: int, output_path: str) -> str:
        self.warmup()
        cap = cv2.VideoCapture(input_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc('m', 'p', '4', 'v')
        out = cv2.VideoWriter(output_path, fourcc, fps * multi, (w, h))
        ret, last = cap.read()
        if not ret:
            cap.release()
            raise RuntimeError("cannot read first frame")
        last_rgb = last[:, :, ::-1].copy()
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            cur_rgb = frame[:, :, ::-1].copy()
            I0 = torch.from_numpy(np.transpose(last_rgb, (2, 0, 1))).unsqueeze(0).float() / 255.0
            I1 = torch.from_numpy(np.transpose(cur_rgb, (2, 0, 1))).unsqueeze(0).float() / 255.0
            I0 = I0.to('cuda' if torch.cuda.is_available() else 'cpu')
            I1 = I1.to('cuda' if torch.cuda.is_available() else 'cpu')
            mids = []
            for _ in range(multi - 1):
                mids.append(self.model.inference(I0, I1))
            out.write(last_rgb[:, :, ::-1])
            for mid in mids:
                img = (mid[0] * 255.).byte().cpu().numpy().transpose(1, 2, 0)
                out.write(img[:, :, ::-1])
            last_rgb = cur_rgb
        out.write(last_rgb[:, :, ::-1])
        cap.release()
        out.release()
        return output_path
