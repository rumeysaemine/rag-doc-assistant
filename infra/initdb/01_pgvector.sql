-- pgvector eklentisi
CREATE EXTENSION IF NOT EXISTS vector;

-- Önce tabloları temizleyelim (dev/test için güvenli, prod'da dikkat!)
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;

-- Documents tablosu 
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL, 
    status TEXT DEFAULT 'PENDING' NOT NULL, 
    created_at TIMESTAMP DEFAULT NOW()
);

-- Chunks tablosu 
CREATE TABLE chunks (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id) ON DELETE CASCADE, 
    content TEXT NOT NULL,
    embedding VECTOR(384), 
    created_at TIMESTAMP DEFAULT NOW()
);
