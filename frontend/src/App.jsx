import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileTextIcon,
  UploadCloudIcon,
  Trash2Icon,
  MessageCircleMoreIcon,
  SendIcon,
  BookMarkedIcon,
  XIcon
} from 'lucide-react';

const API_BASE_URL = "http://localhost:8000/api";

const App = () => {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  // Sohbet kutusu için referans oluştur
  const messagesEndRef = useRef(null);

  // Otomatik kaydırma fonksiyonu
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Dokümanları backend'den getirir
  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`);
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch (error) {
      // Backend'e erişim hatası, genellikle CORS veya sunucunun kapalı olması
      console.error("Dokümanlar getirilirken hata oluştu: Backend'e erişilemiyor.", error);
      setUploadStatus("Backend'e erişim sağlanamıyor. Lütfen sunucunun çalıştığından emin olun.");
    }
  };

  useEffect(() => {
    fetchDocuments();
    // İlk karşılama mesajını ekle
    setMessages([{
      id: "intro",
      type: "assistant",
      text: "Merhaba! 😊 Dokümanlarınızı yükleyin ve bana soru sorun."
    }]);
  }, []);
  
  // Mesajlar her güncellendiğinde en alta kaydır
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Dosya sürükle-bırak işlevi için
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleUpload(acceptedFiles[0]);
      }
    },
    accept: { 
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  // Doküman yükleme
  const handleUpload = async (file) => {
    setLoading(true);
    setUploadStatus("Doküman yükleniyor ve işleniyor...");
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Dosya yüklenirken bir hata oluştu.");
      }

      await response.json();
      setUploadStatus("Doküman başarıyla yüklendi!");
      fetchDocuments();
    } catch (error) {
      setUploadStatus(`Hata: ${error.message}. Lütfen backend sunucusunu kontrol edin.`);
      console.error("Yükleme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // Doküman silme işlemini başlatır (onay penceresi açar)
  const handleDeleteClick = (docId) => {
    setDocToDelete(docId);
    setShowConfirm(true);
  };

  // Dokümanı gerçekten siler
  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${docToDelete}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setUploadStatus("Doküman başarıyla silindi.");
        fetchDocuments();
      } else {
        throw new Error("Doküman silinirken hata oluştu.");
      }
    } catch (error) {
      setUploadStatus(`Silme hatası: ${error.message}`);
      console.error("Silme hatası:", error);
    } finally {
      setDocToDelete(null);
      setShowConfirm(false);
    }
  };

  // Soru gönderme
  const handleQuery = async () => {
    if (!query.trim()) return;

    // Kullanıcının mesajını ekle
    const userMessage = { id: Date.now(), type: "user", text: query };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setQuery('');

    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Cevap alınırken bir hata oluştu.");
      }

      const data = await response.json();
      // AI'ın cevabını ekle
      const aiResponse = { id: Date.now() + 1, type: "assistant", text: data.answer, sources: data.sources };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorMessage = { id: Date.now() + 1, type: "assistant", text: `Üzgünüm, bir hata oluştu: ${error.message}. Backend'e erişilemiyor veya işlem tamamlanamadı.` };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Sohbet arayüzünde mesajları render etme
  const renderMessage = (message) => {
    const isUser = message.type === "user";
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`p-4 rounded-xl max-w-lg ${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
          <p>{message.text}</p>
          {message.sources && message.sources.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 italic">
              <p>Kaynaklar:</p>
              <ul className="list-disc list-inside">
                {message.sources.map((source, index) => (
                  <li key={index}>{source}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Onay Modalı */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Onay</h3>
            <p>Bu dokümanı silmek istediğinizden emin misiniz?</p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sol Panel - Doküman Yönetimi */}
      <div className="w-full md:w-1/3 border-r border-gray-200 bg-white shadow-lg flex flex-col p-6">
        {/* Logo ve Başlık */}
        <div className="flex items-center space-x-2 mb-8">
          <BookMarkedIcon className="text-blue-600 h-8 w-8" />
          <h1 className="text-2xl font-bold">Doc Assistant</h1>
        </div>

        {/* Doküman Alanı Başlığı ve Butonları */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Dokümanlar</h2>
          <label htmlFor="file-upload" className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 cursor-pointer transition-colors duration-300">
            <UploadCloudIcon className="w-5 h-5 mr-2" />
            Yükle
            <input id="file-upload" type="file" className="hidden" onChange={(e) => handleUpload(e.target.files[0])} accept=".txt, .pdf, .docx" />
          </label>
        </div>

        {/* Dosya sürükle-bırak alanı */}
        <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 mb-4 ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
          <input {...getInputProps()} />
          <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            {isDragActive ? "Dosyayı buraya bırakın..." : "Dosyaları sürükleyip bırakın veya tıklayın (.txt, .pdf, .docx)"}
          </p>
          {uploadStatus && <p className={`mt-2 text-xs font-semibold ${uploadStatus.includes("Hata") ? "text-red-500" : "text-green-500"}`}>{uploadStatus}</p>}
        </div>

        {/* Yüklenen Dokümanların Listesi */}
        <div className="flex-grow overflow-y-auto">
          {documents.length > 0 ? (
            <ul className="space-y-2">
              {documents.map(doc => (
                <li key={doc.id} className="flex items-center justify-between bg-gray-100 p-3 rounded-lg shadow-sm">
                  <div className="flex items-center space-x-3">
                    <FileTextIcon className="text-gray-500 w-5 h-5" />
                    <span className="text-sm font-medium text-gray-700">{doc.filename}</span>
                  </div>
                  <button onClick={() => handleDeleteClick(doc.id)} className="text-red-500 hover:text-red-700 transition-colors duration-300">
                    <Trash2Icon className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 italic mt-8">Başlamak için bir doküman yükleyin 📄</p>
          )}
        </div>
      </div>

      {/* Sağ Panel - Sohbet Arayüzü */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-grow p-6 overflow-y-auto">
          {messages.map(renderMessage)}
          {loading && (
            <div className="flex justify-start">
              <div className="p-4 rounded-xl bg-gray-200 text-gray-800 rounded-bl-none max-w-sm">
                <div className="flex space-x-2">
                  <span className="animate-pulse h-2 w-2 bg-gray-400 rounded-full"></span>
                  <span className="animate-pulse h-2 w-2 bg-gray-400 rounded-full"></span>
                  <span className="animate-pulse h-2 w-2 bg-gray-400 rounded-full"></span>
                </div>
              </div>
            </div>
          )}
          {/* Bu div, sohbetin en altını temsil eder */}
          <div ref={messagesEndRef} />
        </div>

        {/* Mesaj Yazma Alanı */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              className="flex-grow p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
              placeholder="Sorunuzu yazın..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              disabled={loading}
            />
            <button
              onClick={handleQuery}
              className="p-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <SendIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
