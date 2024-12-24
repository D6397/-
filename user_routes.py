from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional, List
from passlib.context import CryptContext
from jose import JWTError, jwt
import sqlite3
import os
from contextlib import contextmanager
import logging

# 配置
SECRET_KEY = "your-secret-key-here"  # 在生产环境中应该使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 数据库配置
DATABASE_URL = "app.db"

# 创建路由
router = APIRouter(prefix="/api", tags=["users"])

# 密码上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# 数据模型
class User(BaseModel):
    username: str
    hashed_password: str
    created_at: datetime
    is_active: bool = True

class UserCreate(BaseModel):
    username: str
    password: str

class UserInDB(User):
    id: int

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserHistory(BaseModel):
    id: int
    user_id: int
    text: str
    audio_path: str
    subtitle_path: Optional[str]
    created_at: datetime

# 数据库函数
def init_db():
    with sqlite3.connect(DATABASE_URL) as conn:
        # 创建用户表
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN NOT NULL DEFAULT 1
        )
        """)
        
        # 创建历史记录表
        conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            audio_path TEXT NOT NULL,
            subtitle_path TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        """)
        conn.commit()

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_URL)
    try:
        yield conn
    finally:
        conn.close()

# 用户认证函数
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception

    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE username = ?", 
            (token_data.username,)
        ).fetchone()
        
    if user is None:
        raise credentials_exception
    return UserInDB(**dict(zip(['id', 'username', 'hashed_password', 'created_at', 'is_active'], user)))

# 路由
@router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    """注册新用户"""
    with get_db() as db:
        if db.execute("SELECT 1 FROM users WHERE username = ?", (user.username,)).fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="用户名已被注册"
            )
        
        hashed_password = get_password_hash(user.password)
        db.execute(
            "INSERT INTO users (username, hashed_password) VALUES (?, ?)",
            (user.username, hashed_password)
        )
        db.commit()
    return {"message": "注册成功"}

@router.post("/auth/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """用户登录"""
    with get_db() as db:
        user = db.execute(
            "SELECT * FROM users WHERE username = ?", 
            (form_data.username,)
        ).fetchone()
        
    if not user or not verify_password(form_data.password, user[2]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user[1]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/verify", response_model=dict)
async def verify_token(current_user: User = Depends(get_current_user)):
    """验证令牌并返回用户信息"""
    return {
        "username": current_user.username,
        "registration_date": current_user.created_at.isoformat()
    }

@router.get("/users/me", response_model=dict)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return {
        "username": current_user.username,
        "created_at": current_user.created_at
    }

@router.get("/user/stats", response_model=dict)
async def read_user_stats(current_user: User = Depends(get_current_user)):
    """获取用户使用统计"""
    try:
        logging.info(f"正在获取用户 {current_user.username} (ID: {current_user.id}) 的统计信息")
        
        with get_db() as db:
            # 获取总转换次数
            cursor = db.execute(
                "SELECT COUNT(*) FROM history WHERE user_id = ?",
                (current_user.id,)
            )
            total_conversions = cursor.fetchone()[0]
            logging.info(f"总转换次数: {total_conversions}")

            # 获取生成字幕数
            cursor = db.execute(
                "SELECT COUNT(*) FROM history WHERE user_id = ? AND subtitle_path IS NOT NULL",
                (current_user.id,)
            )
            total_subtitles = cursor.fetchone()[0]
            logging.info(f"生成字幕数: {total_subtitles}")

            # 获取总字数
            cursor = db.execute(
                "SELECT SUM(LENGTH(text)) FROM history WHERE user_id = ?",
                (current_user.id,)
            )
            total_chars = cursor.fetchone()[0] or 0
            logging.info(f"总字数: {total_chars}")

            result = {
                "total_conversions": total_conversions,
                "total_subtitles": total_subtitles,
                "total_chars": total_chars
            }
            logging.info(f"返回统计信息: {result}")
            return result
            
    except Exception as e:
        logging.error(f"获取用户统计信息失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取用户统计信息失败")

@router.get("/user/history", response_model=List[dict])
async def read_user_history(current_user: User = Depends(get_current_user)):
    """获取用户历史记录"""
    try:
        with get_db() as db:
            cursor = db.execute(
                """
                SELECT id, text, audio_path, subtitle_path, created_at
                FROM history
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 10
                """,
                (current_user.id,)
            )
            history = []
            for row in cursor.fetchall():
                history.append({
                    "id": row[0],
                    "text": row[1],
                    "audio_path": f"/static/{row[2]}" if row[2] else None,
                    "subtitle_path": f"/static/{row[3]}" if row[3] else None,
                    "created_at": row[4]
                })
            return history
    except Exception as e:
        logging.error(f"获取历史记录失败: {str(e)}")
        raise HTTPException(status_code=500, detail="获取历史记录失败")

@router.delete("/users/history/{history_id}", response_model=dict)
async def delete_history_item(
    history_id: int,
    current_user: User = Depends(get_current_user)
):
    """删除历史记录项"""
    with get_db() as db:
        # 先获取文件路径
        result = db.execute("""
            SELECT audio_path, subtitle_path
            FROM history 
            WHERE id = ? AND user_id = ?
        """, (history_id, current_user.id)).fetchone()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="记录不存在或无权删除"
            )
            
        # 删除文件
        try:
            if result[0]:  # audio_path
                file_path = result[0].lstrip('/')
                if os.path.exists(file_path):
                    os.remove(file_path)
            if result[1]:  # subtitle_path
                file_path = result[1].lstrip('/')
                if os.path.exists(file_path):
                    os.remove(file_path)
        except OSError as e:
            print(f"删除文件时出错: {str(e)}")  # 记录错误但续执行
            
        # 删除数据库记录
        db.execute("""
            DELETE FROM history 
            WHERE id = ? AND user_id = ?
        """, (history_id, current_user.id))
        db.commit()
            
    return {"message": "记录已删除"}

async def add_history_record(user_id: int, text: str, audio_path: str, subtitle_path: Optional[str] = None):
    """添加历史记录"""
    try:
        # 从路径中移除 /static/ 前缀
        audio_path = audio_path.replace('/static/', '')
        if subtitle_path:
            subtitle_path = subtitle_path.replace('/static/', '')
            
        with get_db() as db:
            db.execute("""
                INSERT INTO history (user_id, text, audio_path, subtitle_path)
                VALUES (?, ?, ?, ?)
            """, (user_id, text, audio_path, subtitle_path))
            db.commit()
            
        logging.info(f"历史记录已添加 - 用户ID: {user_id}, 音频: {audio_path}, 字幕: {subtitle_path}")
        return True
    except Exception as e:
        logging.error(f"添加历史记录失败: {str(e)}")
        return False

# 导出需要的函数和变量
__all__ = [
    'router',
    'init_db',
    'get_current_user',
    'add_history_record',
    'User',
    'UserCreate',
    'UserInDB',
    'Token',
    'TokenData',
    'UserHistory'
] 