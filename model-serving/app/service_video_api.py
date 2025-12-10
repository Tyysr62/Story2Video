import os
import time
from typing import Optional, Dict, Any, List
import requests
from flask import Flask, request, jsonify
from concurrent.futures import ThreadPoolExecutor, as_completed

QIANFAN_API_KEY = os.getenv("QIANFAN_API_KEY", "bce-v3/ALTAK-3i0EaJEhiZWKxYiH4vMea/416e978da32e307af68eaeeb55b144f2238b6d0b")
QIANFAN_CREATE_URL = "https://qianfan.baidubce.com/video/generations"
QIANFAN_QUERY_URL = "https://qianfan.baidubce.com/video/generations?task_id={}"
POLL_INTERVAL = 5
MAX_POLL_TIMES = 30
SAVE_DIR = "./generated_videos"

QIANFAN_PARAMS = {
    "model": "musesteamer-2.0-turbo-i2v-audio",
    "duration": 5,
}

def _strip_url(u: Optional[str]) -> Optional[str]:
    if u is None:
        return None
    return u.strip().strip("`")

def qianfan_generate(prompt: str, image_url: str) -> Optional[str]:
    if not QIANFAN_API_KEY:
        raise ValueError("QIANFAN_API_KEY not set")
    headers_post = {"Authorization": f"Bearer {QIANFAN_API_KEY}", "Content-Type": "application/json"}
    payload: Dict[str, Any] = {
        **QIANFAN_PARAMS,
        "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": _strip_url(image_url)}},
        ],
    }
    r = requests.post(QIANFAN_CREATE_URL, headers=headers_post, json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    task_id = data.get("task_id")
    if not task_id:
        return None
    headers_get = {"Authorization": f"Bearer {QIANFAN_API_KEY}", "Accept": "application/json"}
    tries = 0
    while tries < MAX_POLL_TIMES:
        r2 = requests.get(QIANFAN_QUERY_URL.format(task_id), headers=headers_get, timeout=60)
        r2.raise_for_status()
        d2 = r2.json()
        status = str(d2.get("status", "")).lower()
        if status in {"succeeded", "success"}:
            content = d2.get("content") or {}
            url = content.get("video_url")
            return _strip_url(url) if url else None
        if status in {"failed"}:
            return None
        time.sleep(POLL_INTERVAL)
        tries += 1
    return None

def generate_video_link(prompt: str, img_url: str) -> Optional[str]:
    return qianfan_generate(prompt, img_url)

def build_prompt(shot: Dict[str, Any]) -> str:
    subject = str(shot.get("subject", "")).strip()
    detail = str(shot.get("detail", "")).strip()
    narration = str(shot.get("narration", "")).strip()
    tone = str(shot.get("tone", "")).strip()
    scene = "**".join([p for p in [subject, detail, tone] if p])
    if narration:
        return f"{scene}**旁白背景音说：“{narration}”"
    return scene

def download_video(video_url: str, save_dir: str = SAVE_DIR) -> Optional[str]:
    os.makedirs(save_dir, exist_ok=True)
    ts = time.strftime("%Y%m%d_%H%M%S", time.localtime())
    fname = f"video_{ts}.mp4"
    path = os.path.join(save_dir, fname)
    r = requests.get(video_url, stream=True, timeout=600)
    r.raise_for_status()
    with open(path, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
    return path

def call_storyboard_create(body: Dict[str, Any]) -> Dict[str, Any]:
    r = requests.post(
        "http://8.141.6.15:12345/api/v1/storyboard/create",
        json=body,
        timeout=600,
    )
    r.raise_for_status()
    return r.json()

app = Flask(__name__)

def _require_key() -> Optional[Dict[str, Any]]:
    if not QIANFAN_API_KEY:
        return {"error": "QIANFAN_API_KEY not set"}
    return None

@app.route("/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json(force=True) or {}
        missing = _require_key()
        if missing:
            return jsonify(missing), 500
        prompt = str(data.get("prompt", "")).strip()
        img_url = str(data.get("img_url", "")).strip()
        if not prompt or not img_url:
            return jsonify({"error": "prompt and img_url are required"}), 400
        link = generate_video_link(prompt, img_url)
        if not link:
            return jsonify({"error": "failed to generate video"}), 502
        save_path = download_video(link)
        return jsonify({"video_url": link, "save_path": os.path.abspath(save_path)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/storyboard/generate", methods=["POST"])
def storyboard_generate():
    try:
        body = request.get_json(force=True) or {}
        missing = _require_key()
        if missing:
            return jsonify(missing), 500
        sb = call_storyboard_create(body)
        shots = sb.get("shots", [])
        def worker(shot: Dict[str, Any]) -> Dict[str, Any]:
            sid = shot.get("id")
            img = _strip_url(shot.get("image_url"))
            prompt = build_prompt(shot)
            if not img:
                return {"shot_id": sid, "status": "error", "error": "image_url missing"}
            try:
                link = generate_video_link(prompt, img)
                if not link:
                    return {"shot_id": sid, "status": "error", "error": "generation failed"}
                save_path = download_video(link)
                return {"shot_id": sid, "status": "success", "video_url": link, "save_path": os.path.abspath(save_path)}
            except Exception as ex:
                return {"shot_id": sid, "status": "error", "error": str(ex)}
        results: List[Dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=3) as ex:
            future_map = {ex.submit(worker, shot): shot for shot in shots}
            for fut in as_completed(future_map):
                res = fut.result()
                results.append(res)
        results_sorted = []
        order = {shot.get("id"): idx for idx, shot in enumerate(shots)}
        for r in results:
            results_sorted.append(r)
        results_sorted.sort(key=lambda x: order.get(x.get("shot_id"), 0))
        return jsonify({"operation": sb.get("operation"), "results": results_sorted})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"qianfan_key_set": bool(QIANFAN_API_KEY)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8006)

