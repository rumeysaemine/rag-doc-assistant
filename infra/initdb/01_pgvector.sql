-- pgvector eklentisi
CREATE EXTENSION IF NOT EXISTS vector;

-- Önce tabloları temizleyelim (dev/test için güvenli, prod'da dikkat!)
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Documents tablosu (Document modeline uygun)
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE,  -- modelde filename alanı var
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chunks tablosu (Chunk modeline uygun)
CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT,
    embedding VECTOR(384), -- GEMINI embedding boyutuna göre ayarladık
    created_at TIMESTAMP DEFAULT NOW()
);
