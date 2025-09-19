from typing import List
from sentence_transformers import SentenceTransformer
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# model = SentenceTransformer('all-MiniLM-L6-v2')
# logger.info("Vektörleme modeli başarıyla yüklendi: all-MiniLM-L6-v2")

model = SentenceTransformer(settings.EMBED_MODEL)
logger.info(f"Vektörleme modeli başarıyla yüklendi: {settings.EMBED_MODEL}")

def get_embedding(text: str) -> List[float]:
    """
    Sentence-Transformers kullanarak verilen metnin embedding'ini oluşturur.
    """
    # Tek bir metnin embedding'ini oluştur
    embedding = model.encode(text)

    # Vektörü bir liste olarak döndür
    return embedding.tolist()