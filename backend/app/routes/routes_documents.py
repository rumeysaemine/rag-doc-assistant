from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.db.session import get_db
from app.models.document import Document
from app.models.chunk import Chunk
from typing import List

router = APIRouter()

@router.get("/documents", response_model=List[dict])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """
    Veritabanındaki tüm dokümanları listeler.
    """
    result = await db.execute(select(Document))
    documents = result.scalars().all()
    
    # JSON serileştirmesi için uygun formata dönüştür
    return [
        {"id": doc.id, "filename": doc.filename, "created_at": doc.created_at, "status": doc.status} 
        for doc in documents
    ]

@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(document_id: int, db: AsyncSession = Depends(get_db)):
    """
    Belirli bir dokümanı ve ona bağlı tüm parçaları veritabanından siler.
    """
    # Dokümanın varlığını kontrol et
    document_result = await db.execute(
        select(Document).where(Document.id == document_id)
    )
    document = document_result.scalars().first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with id {document_id} not found."
        )

    # Dokümanı veritabanından sil (ondelete="CASCADE" kullanıldığından chunks da silinir)
    await db.delete(document)
    
    await db.commit()
    
    return