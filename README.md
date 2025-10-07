# RAG Document Assistant

This project is a powerful **Retrieval-Augmented Generation (RAG)** system capable of generating contextual and up-to-date information based on specialized documents (PDF, TXT, DOCX) uploaded by the user.

## 🛠️ Technologies

-   **Backend**: FastAPI, SQLAlchemy (async), PostgreSQL + pgvector
    
-   **Embedding**: SentenceTransformers
    
-   **LLM (Large Language Model)**: Google Gemini (2.5-flash)
    
-   **Frontend**: React, Tailwind CSS, Lucide React
    

## ✨ Key Features

-   **Document Upload:** Users can easily incorporate PDF, TXT, and DOCX files into the system via drag-and-drop or file selection.
    
-   **Asynchronous Processing:** Heavy computation tasks like chunking and embedding are executed in the background (FastAPI BackgroundTask) without blocking the main server thread.
    
-   **State Management:** The processing status of each document (*PENDING*, *PROCESSING*, *READY*, *FAILED*) is tracked in the database and displayed in real-time on the frontend (via Polling).
    
-   **Text Chunking:** Large uploaded documents are segmented into smaller, meaningful text fragments suitable for vectorization and the RAG workflow.
    
-   **Embedding + Vector Search:** Text chunks are converted into vector space (embedding), enabling the rapid retrieval of the most relevant document chunks based on the user's query (Cosine Similarity).
    
-   **Gemini Integration:** Takes the user query and relevant document chunks (context) to generate contextually enriched and accurate responses.
    
-   **Enhanced UX:** Improved user experience through a friendly interface, real-time status updates, quick interactions, and confirmation modals.
    

## 💡 Usage

1.  Open the application in your browser.
    
2.  Upload a document (PDF, TXT, DOCX) to the *Drag-and-Drop* area in the left panel.
    
3.  After the document is uploaded, its status will change to *PENDING* and then *PROCESSING* (tracked via Polling).
    
4.  Once the status is *READY*, you can start asking questions about the content of your uploaded documents using the chat window on the right.
    
5.  The answers you receive will be contextually enriched responses provided by Gemini.