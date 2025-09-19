import google.generativeai as genai
from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

async def get_gemini_response(prompt: str) -> str:
    """
    Verilen prompt ile Gemini modelinden cevap alır.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    try:
        response = await model.generate_content_async(prompt)
        # Cevabın varlığını kontrol et
        return response.text if response and response.text else "Cevap üretilemedi."
    except Exception as e:
        # API hatası durumunda detaylı loglama ve bilgilendirme
        print(f"Gemini API hatası: {e}")
        return "Cevap alınırken bir hata oluştu."