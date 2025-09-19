import shutil
import os
import logging
from fastapi import APIRouter, UploadFile, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.document import Document
from app.models.chunk import Chunk
from app.services.chunking import chunk_text
from app.services.embeddings import get_embedding

router = APIRouter()
UPLOAD_DIR = "uploaded_docs"

# Dizin yoksa oluştur
os.makedirs(UPLOAD_DIR, exist_ok=True)

logger = logging.getLogger(__name__)

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile, db: AsyncSession = Depends(get_db)):
    """
    Yüklenen TXT dosyasını işler, parçalara ayırır,
    embedding oluşturur ve veritabanına kaydeder.
    """
    if not file.filename.endswith(".txt"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yalnızca .txt formatındaki dosyalar kabul edilir."
        )

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    # Dosyayı sunucuya kaydet
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Dosya kaydetme hatası: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dosya sunucuya kaydedilemedi."
        )

    # Veritabanına yeni bir doküman kaydı oluştur
    try:
        new_doc = Document(filename=file.filename)
        db.add(new_doc)
        await db.commit()
        await db.refresh(new_doc)
        logger.info(f"Doküman kaydedildi: {new_doc.filename} (id={new_doc.id})")
    except Exception as e:
        await db.rollback()
        logger.error(f"Doküman veritabanına kaydedilemedi: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dosya bilgisi veritabanına kaydedilirken bir hata oluştu."
        )
    
    # Dosya içeriğini oku ve chunk'lara ayır
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        chunks = chunk_text(content)
        logger.info(f"{len(chunks)} parçaya ayrıldı.")
    except Exception as e:
        logger.error(f"Dosya okuma veya parçalama hatası: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dosya içeriği okunamadı veya işlenemedi."
        )

    # Her bir chunk için embedding oluştur ve kaydet
    for idx, ch in enumerate(chunks, start=1):
        try:
            embedding = get_embedding(ch)
            new_chunk = Chunk(document_id=new_doc.id, content=ch, embedding=embedding)
            db.add(new_chunk)
            logger.info(f"Parça {idx}/{len(chunks)} işlendi ve kaydedildi.")
        except Exception as e:
            logger.error(f"Parça {idx} için embedding hatası: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Parça {idx} için embedding oluşturulurken bir hata oluştu."
            )
    
    # Tüm chunk'ları veritabanına kaydet
    await db.commit()
    logger.info(f"Tüm parçalar doc_id={new_doc.id} için işlendi ve kaydedildi.")

    return {"id": new_doc.id, "filename": new_doc.filename, "message": "Doküman ve parçalar başarıyla yüklendi."}