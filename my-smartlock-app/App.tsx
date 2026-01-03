
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { LOCK_MODELS, UI_CONFIG, BRAND_NAME, TRANSLATIONS } from './constants';
import { AppStatus, LockModel } from './types';

const SmartLockIcon = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="10" width="50" height="120" rx="8" fill="#4f46e5" />
    <circle cx="50" cy="40" r="15" fill="#312e81" />
    <rect x="35" y="80" width="30" height="40" rx="4" fill="#3730a3" />
  </svg>
);

const App: React.FC = () => {
  const [language, setLanguage] = useState<'en' | 'bm' | 'cn'>('cn');
  const [selectedLock, setSelectedLock] = useState<LockModel>(LOCK_MODELS[0]);
  const [doorImage, setDoorImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDoorImage(reader.result as string);
        setResultImage(null);
        setErrorMsg(null);
        setStatus(AppStatus.IDLE);
      };
      reader.readAsDataURL(file);
    }
  };

  const generate = async () => {
    if (!doorImage) { setErrorMsg(t.uploadFirst); return; }
    
    setStatus(AppStatus.GENERATING);
    setErrorMsg(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      // 处理门锁图片转 Base64
      const lockResp = await fetch(selectedLock.imageUrl);
      const lockBlob = await lockResp.blob();
      const lockBase64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve((r.result as string).split(',')[1]);
        r.readAsDataURL(lockBlob);
      });

      const doorBase64 = doorImage.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: doorBase64, mimeType: 'image/png' } },
            { inlineData: { data: lockBase64, mimeType: 'image/png' } },
            { text: `TASK: Replace the existing lock/handle on the door with the smart lock from the reference image. The smart lock should be placed exactly where the handle is. Maintain realistic lighting and shadows. IMPORTANT: Do not add any extra text or people.` }
          ],
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imgPart?.inlineData) {
        setResultImage(`data:image/png;base64,${imgPart.inlineData.data}`);
        setStatus(AppStatus.SUCCESS);
      } else {
        throw new Error("AI output empty");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message?.includes('429') ? t.quotaError : t.error);
      setStatus(AppStatus.ERROR);
    }
  };

  const download = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `smartlock-preview.png`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <header className="text-center mb-8">
        <div className="flex justify-center gap-2 mb-4">
          {['en', 'bm', 'cn'].map((l) => (
            <button key={l} onClick={() => setLanguage(l as any)} className={`px-3 py-1 rounded text-xs font-bold ${language === l ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>{l.toUpperCase()}</button>
          ))}
        </div>
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <SmartLockIcon className="w-8 h-8" /> {t.title}
        </h1>
        <p className="text-gray-500 mt-2">{t.subtitle}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧控制栏 */}
        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-lg font-bold mb-4">1. {t.step1}</h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 overflow-hidden"
            >
              {doorImage ? <img src={doorImage} className="w-full h-full object-cover" /> : <p className="text-gray-400">{t.step1Hint}</p>}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-lg font-bold mb-4">2. {t.step2}</h2>
            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
              {LOCK_MODELS.map(lock => (
                <button 
                  key={lock.id} 
                  onClick={() => setSelectedLock(lock)}
                  className={`p-2 rounded-lg border-2 text-left flex items-center gap-2 ${selectedLock.id === lock.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100'}`}
                >
                  <img src={lock.imageUrl} className="w-10 h-10 object-contain" />
                  <span className="text-xs font-bold truncate">{lock.name}</span>
                </button>
              ))}
            </div>
          </section>

          <button 
            onClick={generate}
            disabled={status === AppStatus.GENERATING}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:bg-gray-300"
          >
            {status === AppStatus.GENERATING ? t.generating : t.generateBtn}
          </button>
          
          {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold">{errorMsg}</div>}
        </div>

        {/* 右侧预览区 */}
        <div className="bg-gray-100 rounded-3xl p-4 flex flex-col items-center justify-center min-h-[400px]">
          {resultImage ? (
            <div className="w-full space-y-4">
              <img src={resultImage} className="w-full rounded-2xl shadow-xl" />
              <button onClick={download} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <i className="fas fa-download"></i> {t.downloadBtn}
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400">
              <i className="fas fa-image text-6xl mb-4"></i>
              <p>{t.canvasEmpty}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
