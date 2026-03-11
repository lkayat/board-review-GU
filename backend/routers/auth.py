from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from database import get_db
from models.professor import Professor

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_access_token(data: dict) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({**data, "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


async def get_current_professor(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Professor:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(Professor).where(Professor.username == username))
    professor = result.scalar_one_or_none()
    if not professor:
        raise credentials_exception
    return professor


async def _ensure_default_professor(db: AsyncSession):
    """Create the default professor account on first run if it doesn't exist."""
    result = await db.execute(
        select(Professor).where(Professor.username == settings.professor_username)
    )
    if not result.scalar_one_or_none():
        p = Professor(
            username=settings.professor_username,
            hashed_password=_hash_password(settings.professor_password),
        )
        db.add(p)
        await db.commit()


@router.post("/login", response_model=TokenOut)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    await _ensure_default_professor(db)
    result = await db.execute(select(Professor).where(Professor.username == form.username))
    professor = result.scalar_one_or_none()
    if not professor or not _verify_password(form.password, professor.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = _create_access_token({"sub": professor.username})
    return TokenOut(access_token=token)


@router.get("/me")
async def me(professor: Professor = Depends(get_current_professor)):
    return {"id": professor.id, "username": professor.username}
