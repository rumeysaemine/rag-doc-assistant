from sqlalchemy import Column, Integer, String, DateTime, func
from app.db.base import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
