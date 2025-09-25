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
from pypdf import PdfReader
from docx import Document as DocxDocument
import io

router = APIRouter()
UPLOAD_DIR = "uploaded_docs"

# Dizin yoksa oluştur
os.makedirs(UPLOAD_DIR, exist_ok=True)

logger = logging.getLogger(__name__)

def read_file_content(file: UploadFile):
    """
    Dosya uzantısına göre içeriği okur ve metin olarak döndürür.
    Desteklenen türler: .txt, .pdf, .docx
    """
    try:
        if file.filename.endswith(".pdf"):
            pdf_reader = PdfReader(file.file)
            content = ""
            for page in pdf_reader.pages:
                content += page.extract_text() or ""
            return content
        elif file.filename.endswith(".docx"):
            doc = DocxDocument(io.BytesIO(file.file.read()))
            content = ""
            for para in doc.paragraphs:
                content += para.text + "\n"
            return content
        elif file.filename.endswith(".txt"):
            return file.file.read().decode("utf-8")
        else:
            raise ValueError("Desteklenmeyen dosya formatı.")
    except Exception as e:
        logger.error(f"Dosya okuma hatası: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dosya içeriği okunamadı: {file.filename}. Hata: {str(e)}"
        )

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(file: UploadFile, db: AsyncSession = Depends(get_db)):
    """
    Yüklenen dosyayı işler, parçalara ayırır,
    embedding oluşturur ve veritabanına kaydeder.
    """
    # Dosya içeriğini oku
    content = read_file_content(file)

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
        chunks = chunk_text(content)
        if not chunks:
             raise ValueError("Dosya içeriği boş veya işlenemedi.")
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