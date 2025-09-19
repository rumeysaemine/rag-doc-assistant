from app.db.base import Base
from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey
from pgvector.sqlalchemy import Vector

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    content = Column(String)
    embedding = Column(Vector(384))
    created_at = Column(DateTime(timezone=True), server_default=func.now())