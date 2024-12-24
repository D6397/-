from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Request, Body
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, validator, ValidationError
from typing import Optional
import edge_tts
import logging
import os
from datetime import datetime
from user_routes import router as user_router, get_current_user, init_db, add_history_record, User

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    init_db()
    yield
    # 关闭时执行
    pass

# FastAPI 应用
app = FastAPI(lifespan=lifespan)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

# 模板
templates = Jinja2Templates(directory="templates")

# 包含用户路由
app.include_router(user_router)

# 数据模型
class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    voice: str = Field(..., min_length=1)
    subtitle: bool = Field(default=False)
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, ge=0.5, le=2.0)

    @validator('voice')
    def validate_voice(cls, v):
        valid_voices = [
            "zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural", "zh-CN-YunjianNeural",
            "zh-CN-XiaoyiNeural", "zh-CN-YunyangNeural", "zh-CN-XiaochenNeural",
            "zh-CN-XiaohanNeural", "zh-CN-XiaomengNeural", "zh-CN-XiaomoNeural",
            "zh-CN-XiaoqiuNeural", "zh-CN-XiaoruiNeural", "zh-CN-XiaoshuangNeural",
            "zh-CN-XiaoxuanNeural", "zh-CN-XiaoyanNeural", "zh-CN-XiaozhenNeural"
        ]
        if v not in valid_voices:
            raise ValueError(f"无效的声音选择: {v}")
        return v

    @validator('text')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError("文本内容不能为空")
        return v.strip()

# TTS 辅助函数
def format_time(seconds):
    """将秒数转换为 SRT 格式的时间字符串 (HH:MM:SS,mmm)"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    milliseconds = int((seconds % 1) * 1000)
    seconds = int(seconds)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

async def generate_speech_and_subtitle(text: str, voice: str, audio_filename: str, subtitle_filename: str = None, speed: float = 1.0, pitch: float = 1.0):
    try:
        # 构建 Edge-TTS 通信对象，添加速度和音调参数
        speed_percent = int((speed - 1.0) * 100)  # 0.5-2.0 -> -50% to +100%
        pitch_change = int((pitch - 1.0) * 50)    # 0.5-2.0 -> -25 to +50
        
        # 确保速度和音调在有效范围内
        speed_percent = max(-50, min(100, speed_percent))
        pitch_change = max(-25, min(50, pitch_change))
        
        # 准备参数
        tts_params = {
            "text": text,
            "voice": voice,
            "rate": f"{speed_percent:+d}%",
            "pitch": f"{pitch_change:+d}Hz"
        }
            
        logging.info(f"转换参数: {tts_params}")
        
        communicate = edge_tts.Communicate(**tts_params)
        
        if subtitle_filename:
            logging.info(f"开始生成字幕，文件名: {subtitle_filename}")
            
            subtitles = []
            subtitle_index = 1
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    with open(audio_filename, "ab") as audio_file:
                        audio_file.write(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    start_time = format_time(chunk["offset"] / 10000000)
                    end_time = format_time((chunk["offset"] + chunk["duration"]) / 10000000)
                    subtitles.append(f"{subtitle_index}\n{start_time} --> {end_time}\n{chunk['text']}\n")
                    subtitle_index += 1
            
            try:
                with open(subtitle_filename, "w", encoding="utf-8") as sub_file:
                    sub_file.write("\n".join(subtitles))
                logging.info(f"字幕文件已生成: {subtitle_filename}")
                return True, subtitle_filename
            except Exception as write_error:
                logging.error(f"写入字幕文件出错: {str(write_error)}")
                return False, None
        else:
            await communicate.save(audio_filename)
            return True, None
            
    except Exception as e:
        logging.error(f"生成失败: {str(e)}")
        if os.path.exists(audio_filename):
            os.remove(audio_filename)
        if subtitle_filename and os.path.exists(subtitle_filename):
            os.remove(subtitle_filename)
        return False, None

# 路由
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/profile", response_class=HTMLResponse)
async def read_profile(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})

@app.post("/api/tts")
async def text_to_speech(
    text: str = Body(...),
    voice: str = Body(...),
    subtitle: bool = Body(default=False),
    speed: float = Body(default=1.0),
    pitch: float = Body(default=1.0),
    current_user: Optional[User] = None
):
    try:
        # 记录请求数据
        logger.info("收到TTS请求:")
        logger.info(f"- 文本: {text[:50]}...")
        logger.info(f"- 声音: {voice}")
        logger.info(f"- 字幕: {subtitle}")
        logger.info(f"- 语速: {speed}")
        logger.info(f"- 音调: {pitch}")

        # 验证文本
        if not text.strip():
            logger.error("文本内容为空")
            raise HTTPException(status_code=400, detail="文本内容不能为空")

        # 验证声音选择
        valid_voices = [
            "zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural", "zh-CN-YunjianNeural",
            "zh-CN-XiaoyiNeural", "zh-CN-YunyangNeural", "zh-CN-XiaochenNeural",
            "zh-CN-XiaohanNeural", "zh-CN-XiaomengNeural", "zh-CN-XiaomoNeural",
            "zh-CN-XiaoqiuNeural", "zh-CN-XiaoruiNeural", "zh-CN-XiaoshuangNeural",
            "zh-CN-XiaoxuanNeural", "zh-CN-XiaoyanNeural", "zh-CN-XiaozhenNeural"
        ]
        if voice not in valid_voices:
            logger.error(f"无效的声音选择: {voice}")
            raise HTTPException(status_code=400, detail=f"无效的声音选择: {voice}")
        
        # 生成文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        audio_filename = f"static/audio/{timestamp}_{current_user.id if current_user else 'guest'}.mp3"
        subtitle_filename = f"static/subtitles/{timestamp}_{current_user.id if current_user else 'guest'}.srt" if subtitle else None
        
        # 确保目录存在
        os.makedirs("static/audio", exist_ok=True)
        if subtitle_filename:
            os.makedirs("static/subtitles", exist_ok=True)
        
        logger.info(f"音频文件路径: {audio_filename}")
        if subtitle_filename:
            logger.info(f"字幕文件路径: {subtitle_filename}")
        
        success, srt_filename = await generate_speech_and_subtitle(
            text, 
            voice, 
            audio_filename, 
            subtitle_filename,
            speed=speed,
            pitch=pitch
        )
        
        if success:
            response = {
                "status": "success",
                "audio_url": f"/static/audio/{os.path.basename(audio_filename)}"
            }
            
            if srt_filename:
                response["subtitle_url"] = f"/static/subtitles/{os.path.basename(srt_filename)}"
            
            # 如果用户登录，保存到历史记录
            if current_user:
                await add_history_record(
                    current_user.id,
                    text,
                    response["audio_url"],
                    response.get("subtitle_url")
                )
            
            logger.info("TTS转换成功")
            logger.info(f"响应数据: {response}")
            return response
        else:
            logger.error("生成失败")
            raise HTTPException(status_code=500, detail="生成失败，请重试")
            
    except HTTPException as he:
        logger.error(f"HTTP异常: {str(he)}")
        raise he
    except Exception as e:
        logger.error(f"TTS处理失败: {str(e)}", exc_info=True)
        if os.path.exists(audio_filename):
            os.remove(audio_filename)
        if subtitle_filename and os.path.exists(subtitle_filename):
            os.remove(subtitle_filename)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/voices")
async def get_voices():
    try:
        # 获取所有可用的声音
        all_voices = await edge_tts.list_voices()
        logger.info(f"Raw voice data: {all_voices[0] if all_voices else 'No voices found'}")  # 打印第一个声音的数据结构
        
        # 筛选中文声音并添加友好描述
        voice_descriptions = {
            "zh-CN-XiaoxiaoNeural": "小筱 - 清新自然的女声",
            "zh-CN-YunxiNeural": "云溪 - 阳光男声",
            "zh-CN-YunjianNeural": "云剑 - 专业播音男声",
            "zh-CN-XiaoyiNeural": "小艺 - 温柔女声",
            "zh-CN-YunyangNeural": "云扬 - 专业新闻男声"
        }

        # 过滤中文声音并格式化返回数据
        voices = []
        for voice in all_voices:
            try:
                if voice.get("Locale", "").startswith("zh-"):  # 使用get方法安全获取Locale
                    voice_name = voice.get("ShortName")  # 使用get方法安全获取ShortName
                    if voice_name and voice_name in voice_descriptions:
                        voices.append({
                            "name": voice_name,
                            "description": voice_descriptions[voice_name],
                            "language": voice.get("Locale", "zh-CN"),
                            "gender": "Female" if "female" in voice.get("Name", "").lower() else "Male",
                            "style_list": voice.get("StyleList", [])
                        })
            except Exception as ve:
                logger.error(f"处理单个声音时出错: {str(ve)}, voice data: {voice}")
                continue
        
        if not voices:
            logger.warning("没有找到可用的中文声音")
            return []
            
        # 按性别和描述排序
        voices.sort(key=lambda x: (x["gender"], x["description"]))
        
        return voices
    except Exception as e:
        logger.error(f"获取声音列表失败: {str(e)}")
        logger.exception(e)  # 打印完整的错误堆栈
        raise HTTPException(status_code=500, detail="获取声音列表失败")