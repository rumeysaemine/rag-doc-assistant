from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.chunk import Chunk
from app.models.document import Document 
from app.services.embeddings import get_embedding_async 
from app.services.gemini import get_gemini_response
from typing import List, Set

router = APIRouter()

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]

@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Kullanıcı sorgusuna en uygun cevabı bulmak için
    Vektör arama (Kosinüs Benzerliği) ve Gemini API'yi kullanır. 
    Kaynak olarak dosya adlarını döndürür.
    """
    try:
        # 1. Sorgunun embedding'ini oluştur (Asenkron olarak thread havuzunda çalışır)
        query_embedding = await get_embedding_async(request.query)
        
        # 2. Vektör araması yap (Kosinüs Mesafesi <-> ile en yakın 5 parçayı bul)
        # pgvector'da <-> operatörü Kosinüs Mesafesi (Cosine Distance) hesaplar.
        search_results = await db.execute(
            select(Chunk)
            .order_by(Chunk.embedding.op('<->')(query_embedding))
            .limit(5)
        )
        chunks = search_results.scalars().all()

        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sorguyla ilgili herhangi bir bilgi yüklenen dokümanlarda bulunamadı."
            )

        # 3. Bağlamı oluştur (parçaların içeriğini birleştir)
        context = "\n---\n".join([chunk.content for chunk in chunks])

        # 4. Kaynak dokümanların isimlerini veritabanından çek
        unique_doc_ids: Set[int] = set([chunk.document_id for chunk in chunks])
        
        # Tek bir veritabanı sorgusu ile tüm doküman isimlerini getir
        documents_result = await db.execute(
            select(Document.id, Document.filename).where(Document.id.in_(unique_doc_ids))
        )
        
        # ID'den dosya adına eşleme (mapping) oluştur
        doc_map = {doc_id: filename for doc_id, filename in documents_result.all()}

        # 5. Prompt'u Gemini için hazırla
        prompt = f"""
        SEN BİR DOKÜMAN SORGULAMA ASİSTANISIN. Aşağıdaki 'Bağlam' bölümünde verilen bilgilere dayanarak, kullanıcının sorusunu yanıtla. 
        Eğer bağlamda soruya cevap verecek yeterli bilgi yoksa, "Yüklenen dokümanlar içinde bu soruyu yanıtlayacak bilgi bulunmamaktadır." şeklinde yanıt ver.
        Cevaplarında markdown, LaTeX, kod bloğu, özel karakter (“ ”, **, \`\`, *) veya biçimlendirme kullanma. Sadece düz metin cümleleriyle yanıtla.

        Soru: "{request.query}"

        Bağlam:
        {context}
        """
        
        # 6. Gemini API'sinden cevap al
        answer = await get_gemini_response(prompt)

        # 7. Kaynakları dosya adı formatında listeye dönüştür (benzersiz olmalarını sağlayarak)
        source_filenames = sorted(list(set([doc_map.get(chunk.document_id, "Bilinmeyen Doküman") for chunk in chunks])))

        return {"answer": answer, "sources": source_filenames}

    except HTTPException:
        raise 
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bir hata oluştu: {str(e)}"
        )