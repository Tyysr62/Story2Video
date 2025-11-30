import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import DATA_DIR
from app.core.logging import logger


def _atomic_write(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def update_operation(operation_id: str, status: str, detail: Optional[str] = None) -> None:
    path = DATA_DIR / "operations" / f"{operation_id}.json"
    payload = {"operation_id": operation_id, "status": status}
    if detail:
        payload["detail"] = detail
    _atomic_write(path, payload)
    logger.info(f"Operation 更新: {operation_id} -> {status}")


def upsert_story(story_id: str, display_name: str, style: str, script_content: str) -> None:
    path = DATA_DIR / "stories" / f"{story_id}.json"
    data = {
        "story_id": story_id,
        "display_name": display_name,
        "style": style,
        "script_content": script_content,
    }
    _atomic_write(path, data)
    logger.info(f"Story 保存: {story_id}")


def save_story_shots(story_id: str, shots: List[Dict[str, Any]]) -> None:
    path = DATA_DIR / "stories" / f"{story_id}.shots.json"
    payload = {"story_id": story_id, "shots": shots}
    _atomic_write(path, payload)
    logger.info(f"Shots 保存: {story_id} -> {len(shots)} 个分镜")


def upsert_shot(story_id: str, shot_id: str, shot: Dict[str, Any]) -> None:
    path = DATA_DIR / "stories" / story_id / "shots" / f"{shot_id}.json"
    _atomic_write(path, shot)
    logger.info(f"Shot 更新: {story_id}/{shot_id}")


def update_story_video_url(story_id: str, url: str) -> None:
    path = DATA_DIR / "stories" / f"{story_id}.json"
    data = {}
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    data["video_url"] = url
    _atomic_write(path, data)
    logger.info(f"Story 视频地址更新: {story_id} -> {url}")


def get_story_shots(story_id: str) -> List[Dict[str, Any]]:
    path = DATA_DIR / "stories" / f"{story_id}.shots.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("shots", [])
    except Exception:
        return []

