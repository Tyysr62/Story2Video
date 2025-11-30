from loguru import logger
import sys

# 日志初始化：统一设置格式和级别，输出到 stdout；可扩展文件输出

logger.remove()
logger.add(sys.stdout, level="INFO", 
           format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>")

__all__ = ["logger"]

