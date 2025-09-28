import React, { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  FileTextIcon,
  UploadCloudIcon,
  Trash2Icon,
  SendIcon,
  BookMarkedIcon,
  Loader2Icon,
  CheckCircleIcon,
  XCircleIcon,
  MessageCircleMoreIcon,
} from 'lucide-react';

const API_BASE_URL = "http://localhost:8000/api";

const App = () => {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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
      console.error("Dokümanlar getirilirken hata oluştu: Backend'e erişilemiyor.", error);
      if (documents.length === 0) {
        setUploadStatus("Backend'e erişim sağlanamıyor. Lütfen sunucunun çalıştığından emin olun.");
      }
    }
  };

  // --- POLLING ve İlk Yükleme ---
  useEffect(() => {
    // İlk karşılama mesajını ekle
    setMessages([{
      id: "intro",
      type: "assistant",
      text: "Merhaba! 😊 Dokümanlarınızı yükleyin ve bana soru sorun."
    }]);
    
    // Polling (Durum kontrolü) başlat
    fetchDocuments(); // İlk yükleme
    const interval = setInterval(fetchDocuments, 5000); // Her 5 saniyede bir kontrol

    return () => clearInterval(interval); // Komponent temizlenince interval'i durdur
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
    },
    disabled: isUploading, // Yükleme devam ederken yeni yüklemeyi engelle
  });

  // Doküman yükleme
  const handleUpload = async (file) => {
    setIsUploading(true);
    setUploadStatus("Doküman yükleniyor...");

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
      setUploadStatus(`"${file.name}" başarıyla yüklendi! İşleme arka planda başladı.`);
      
      // Polling mekanizmasının hızlıca yakalaması için manuel fetch
      fetchDocuments();

    } catch (error) {
      setUploadStatus(`Hata: ${error.message}. Lütfen backend sunucusunu ve dosya formatını kontrol edin.`);
      console.error("Yükleme hatası:", error);
    } finally {
      setIsUploading(false);
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
      if (response.ok || response.status === 204) {
        setUploadStatus("Doküman başarıyla silindi.");
        // UI'ı hemen güncellemek için fetchDocuments'ı çağır
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
    const readyDocs = documents.filter(d => d.status === 'READY');
    
    if (!query.trim()) return;
    if (readyDocs.length === 0) {
      // READY doküman yoksa kullanıcıya mesaj göster
      const noDocMessage = { id: Date.now(), type: "assistant", text: "Lütfen önce en az bir 'READY' (Hazır) statüsünde doküman yükleyin ve işlenmesini bekleyin." };
      setMessages(prev => [...prev, noDocMessage]);
      setQuery('');
      return;
    }

    // Kullanıcının mesajını ekle
    const userMessage = { id: Date.now(), type: "user", text: query };
    setMessages(prev => [...prev, userMessage]);
    setIsQuerying(true);
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
      const aiResponse = { 
        id: Date.now() + 1, 
        type: "assistant", 
        text: data.answer, 
        sources: data.sources 
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorMessage = { 
        id: Date.now() + 1, 
        type: "assistant", 
        text: `Üzgünüm, bir hata oluştu: ${error.message}. Backend'e erişilebilir ve LLM servisi çalışır durumda mı kontrol edin.` 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsQuerying(false);
    }
  };

  // Sohbet arayüzünde mesajları render etme
  const renderMessage = React.useCallback((message) => {
    const isUser = message.type === "user";
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        {/* Mavi tonu İndigo ile değiştirildi */}
        <div className={`p-4 rounded-xl max-w-lg ${isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none shadow-md'}`}>
          <p className="whitespace-pre-wrap">{message.text}</p>
          {message.sources && message.sources.length > 0 && (
            // Kaynak çizgi rengi açıldı
            <div className="mt-2 text-xs text-gray-500 border-t border-gray-300 pt-2">
              <p className="font-semibold mb-1 flex items-center">
                <FileTextIcon className="w-3 h-3 mr-1" /> Kaynaklar:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                {message.sources.map((source, index) => (
                  <li key={index} className="truncate">{source}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }, []);

  // Doküman listesi öğesini render etme
  const renderDocumentItem = (doc) => {
    let statusClasses = '';
    let statusIcon = null;

    switch (doc.status) {
      case 'READY':
        statusClasses = 'text-green-800 bg-green-300';
        statusIcon = <CheckCircleIcon className="text-green-600 w-5 h-5" />;
        break;
      case 'PROCESSING':
      case 'PENDING':
        statusClasses = 'text-yellow-800 bg-yellow-300';
        statusIcon = <Loader2Icon className="text-yellow-600 w-5 h-5 animate-spin" />;
        break;
      case 'FAILED':
        statusClasses = 'text-red-800 bg-red-300';
        statusIcon = <XCircleIcon className="text-red-600 w-5 h-5" />;
        break;
      default:
        statusClasses = 'text-gray-800 bg-gray-300';
        statusIcon = <FileTextIcon className="text-gray-500 w-5 h-5" />;
    }

    return (
        <li key={doc.id} className={`flex items-center justify-between p-3 rounded-lg shadow-sm transition-all duration-300 ${doc.status === 'PROCESSING' ? 'bg-yellow-100 border-l-4 border-yellow-500' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <div className="flex items-center space-x-3 truncate">
                {statusIcon}
                {/* Status yazısı kaldırıldığı için sadece dosya adı kaldı */}
                <span className="text-sm font-medium text-gray-700 truncate">{doc.filename}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
                <button 
                    onClick={() => handleDeleteClick(doc.id)} 
                    className="p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors duration-300 disabled:opacity-50"
                    disabled={isUploading || isQuerying}
                >
                    <Trash2Icon className="w-5 h-5" />
                </button>
            </div>
        </li>
    );
  };
  
  // Sorgulama butonu için READY doküman kontrolü
  const isQueryDisabled = isQuerying || isUploading || documents.filter(d => d.status === 'READY').length === 0;


  return (
    <div className="font-['Inter', sans-serif] flex h-screen bg-gray-50 text-gray-800">
      {/* Onay Modalı */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4 text-red-600">Dokümanı Sil</h3>
            <p>
              {/* Onay mesajındaki ** ** kaldırıldı */}
              {documents.find(d => d.id === docToDelete)?.filename || "Bu dokümanı"} silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
                disabled={isUploading || isQuerying}
              >
                İptal
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={isUploading || isQuerying}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sol Panel - Doküman Yönetimi */}
      <div className="w-full md:w-1/3 border-r border-gray-100 bg-white shadow-xl flex flex-col p-4 md:p-6">
        {/* Logo ve Başlık */}
        <div className="flex items-center space-x-2 mb-6">
          <BookMarkedIcon className="text-indigo-600 h-8 w-8" />
          <h1 className="text-2xl font-bold">Doc Assistant</h1>
        </div>

        {/* Dosya sürükle-bırak alanı */}
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 mb-4 cursor-pointer 
            ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
            ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <Loader2Icon className="mx-auto h-8 w-8 text-indigo-500 animate-spin" />
          ) : (
            <UploadCloudIcon className="mx-auto h-8 w-8 text-gray-500" />
          )}
          
          <p className="mt-2 text-sm font-medium text-gray-700">
            {isUploading ? "Yükleniyor ve işleniyor..." : (isDragActive ? "Dosyayı bırakın!" : "Dosyaları sürükle-bırak veya tıkla")}
          </p>
          <p className="text-xs text-gray-500">(.txt, .pdf, .docx)</p>
          
          {uploadStatus && (
            <p className={`mt-2 text-xs font-semibold whitespace-pre-wrap ${uploadStatus.includes("Hata") ? "text-red-500" : "text-green-600"}`}>
              {uploadStatus}
            </p>
          )}
        </div>
        
        {/* Yüklenen Dokümanların Listesi Başlığı */}
        <div className="flex items-center justify-between mb-3 border-b border-gray-300 pb-2">
            <h2 className="text-lg font-semibold text-gray-700">Yüklü Dokümanlar ({documents.length})</h2>
        </div>
        <div className="flex-grow overflow-y-auto pr-1">
          {documents.length > 0 ? (
            <ul className="space-y-3">
              {documents.map(renderDocumentItem)}
            </ul>
          ) : (
            <p className="text-center text-gray-500 italic mt-8 text-sm">Başlamak için bir doküman yükleyin 📄</p>
          )}
        </div>
      </div>

      {/* Sağ Panel - Sohbet Arayüzü */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Sohbet Başlığı */}
        <div className="p-4 md:p-6 bg-white shadow-md border-b border-gray-300">
            <h2 className="text-xl font-bold text-indigo-700 flex items-center">
                <MessageCircleMoreIcon className="w-6 h-6 mr-2"/> Sohbet Penceresi
            </h2>
            {documents.filter(d => d.status === 'READY').length > 0 && (
                <p className='text-sm text-gray-600 mt-1'>
                    <CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-600"/> 
                    {documents.filter(d => d.status === 'READY').length} doküman sorgulamaya hazır.
                </p>
            )}
            {documents.filter(d => d.status === 'PROCESSING').length > 0 && (
                <p className='text-sm text-gray-600 mt-1'>
                    <Loader2Icon className="w-4 h-4 inline mr-1 text-yellow-600 animate-spin"/> 
                    {documents.filter(d => d.status === 'PROCESSING').length} doküman işleniyor...
                </p>
            )}
        </div>
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">
          {messages.map(renderMessage)}
          {isQuerying && (
            <div className="flex justify-start">
              <div className="p-4 rounded-xl bg-gray-100 text-gray-800 rounded-bl-none max-w-sm shadow-md">
                <div className="flex items-center space-x-3">
                  <Loader2Icon className="h-4 w-4 animate-spin text-gray-500"/>
                  <span className="text-sm italic text-gray-600">Cevap aranıyor...</span>
                </div>
              </div>
            </div>
          )}
          {/* Bu div, sohbetin en altını temsil eder */}
          <div ref={messagesEndRef} />
        </div>

        {/* Mesaj Yazma Alanı */}
        <div className="p-4 bg-white border-t border-gray-300 shadow-lg">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              className="flex-grow p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 disabled:bg-gray-50"
              placeholder={isQueryDisabled && !isQuerying ? "Sorgulama yapmak için READY doküman yükleyin..." : "Dokümanlarınızla ilgili sorunuzu yazın..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              disabled={isQueryDisabled}
            />
            <button
              onClick={handleQuery}
              className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isQueryDisabled}
            >
              {isQuerying ? (
                 <Loader2Icon className="h-6 w-6 animate-spin"/>
              ) : (
                <SendIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
