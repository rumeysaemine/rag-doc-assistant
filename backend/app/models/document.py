from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship 
from app.db.base import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
        
    # Durum Sütunu: PENDING, PROCESSING, READY, FAILED
    status = Column(String, default="PENDING", nullable=False)

    created_at = Column(DateTime, default=func.now())

    # Bu belgeye ait tüm chunk'ları çeker
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.filename}', status='{self.status}')>"
