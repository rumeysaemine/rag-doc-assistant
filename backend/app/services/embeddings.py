from typing import List
from sentence_transformers import SentenceTransformer
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

model = SentenceTransformer(settings.EMBED_MODEL)
logger.info(f"Vektörleme modeli başarıyla yüklendi: {settings.EMBED_MODEL}")

def get_embedding_sync(text: str) -> List[float]:
    """
    Senkron embedding oluşturma fonksiyonu (thread havuzunda çalıştırılacak).
    """
    embedding = model.encode(text)
    return embedding.tolist()

# Asenkron bir endpoint'ten çağrılmak üzere:
async def get_embedding_async(text: str) -> List[float]:
    """
    Embedding işlemini bir thread havuzunda çalıştırarak ana event loop'u bloke etmez.
    """
    from fastapi.concurrency import run_in_threadpool
    return await run_in_threadpool(get_embedding_sync, text)