
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { LOCK_MODELS, TRANSLATIONS, UI_CONFIG } from './constants';
import { AppStatus, LockModel } from './types';

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
      
      // 1. 获取锁的 Base64 数据
      const lockResp = await fetch(selectedLock.imageUrl);
      const lockBlob = await lockResp.blob();
      const lockBase64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve((r.result as string).split(',')[1]);
        r.readAsDataURL(lockBlob);
      });

      // 2. 获取大门的 Base64 数据
      const doorBase64 = doorImage.split(',')[1];

      // 3. 调用 Gemini 2.5 Flash Image 模型进行编辑
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: doorBase64, mimeType: 'image/png' } },
            { inlineData: { data: lockBase64, mimeType: 'image/png' } },
            { text: `TASK: Replace the current door handle/lock in the first image with the smart lock shown in the second image. The smart lock must be placed precisely where the original handle was. Ensure perfect perspective, lighting, and shadow matching to make it look installed. DO NOT add any text, watermarks, or people. OUTPUT: Only the modified door image.` }
          ],
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (imgPart?.inlineData) {
        setResultImage(`data:image/png;base64,${imgPart.inlineData.data}`);
        setStatus(AppStatus.SUCCESS);
      } else {
        throw new Error("AI engine failed to produce a valid image result.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message?.includes('429') ? t.quotaError : t.error);
      setStatus(AppStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg">
            <i className="fas fa-bolt-lightning text-white"></i>
          </div>
          <span className="font-black text-xl tracking-tighter text-gray-800">IRIS.MY <span className="text-indigo-600">AI</span></span>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-full">
          {(['en', 'bm', 'cn'] as const).map((l) => (
            <button 
              key={l} 
              onClick={() => setLanguage(l)} 
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {l === 'cn' ? '中文' : l.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左侧控制区 */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-gray-800">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-sm italic">01</span>
              {t.step1}
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${doorImage ? 'border-indigo-500 bg-indigo-50/10' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
            >
              {doorImage ? (
                <div className="group relative w-full h-full">
                  <img src={doorImage} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                    <button className="bg-white text-gray-900 px-6 py-2 rounded-full font-bold text-sm">{t.changePhoto}</button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <i className="fas fa-camera text-gray-400 text-2xl"></i>
                  </div>
                  <p className="text-gray-400 font-medium">{t.step1Hint}</p>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
            <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-gray-800">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 text-sm italic">02</span>
              {t.step2}
            </h2>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {LOCK_MODELS.map(lock => (
                <button 
                  key={lock.id} 
                  onClick={() => setSelectedLock(lock)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 group ${selectedLock.id === lock.id ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'}`}
                >
                  <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
                    <img src={lock.imageUrl} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform" alt={lock.name} />
                  </div>
                  <span className="text-[11px] font-black text-center text-gray-700 leading-tight uppercase tracking-wider">{lock.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={generate}
            disabled={status === AppStatus.GENERATING}
            className={`w-full py-5 rounded-3xl font-black text-xl shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-4 ${status === AppStatus.GENERATING ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
          >
            {status === AppStatus.GENERATING ? (
              <>
                <div className="w-6 h-6 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                {t.generating}
              </>
            ) : (
              <>
                <i className="fas fa-magic"></i>
                {t.generateBtn}
              </>
            )}
          </button>
          
          {errorMsg && <div className="p-5 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100 flex gap-3 items-start animate-bounce"><i className="fas fa-triangle-exclamation mt-0.5"></i> {errorMsg}</div>}
        </div>

        {/* 右侧预览区 */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-[40px] p-6 shadow-2xl shadow-gray-200/50 border border-gray-100 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-gray-800 uppercase tracking-widest">{t.canvasTitle}</h3>
              {resultImage && <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-black rounded-full animate-pulse uppercase tracking-widest">Live View</span>}
            </div>
            
            <div className="flex-1 bg-gray-50 rounded-[32px] overflow-hidden relative border-4 border-gray-100 flex items-center justify-center min-h-[500px]">
              {resultImage ? (
                <div className="relative w-full h-full flex items-center justify-center bg-gray-900 group">
                  <img src={resultImage} className="max-w-full max-h-full object-contain" />
                  <div className="absolute top-8 left-8">
                     <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                        <p className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Visual Simulation</p>
                     </div>
                  </div>
                </div>
              ) : status === AppStatus.GENERATING ? (
                <div className="text-center space-y-6">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-8 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-800">{t.generating}</h3>
                    <p className="text-gray-400 mt-2 font-medium">{t.generatingSub}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 max-w-sm">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-gray-100 text-gray-200">
                    <i className="fas fa-wand-magic-sparkles text-4xl"></i>
                  </div>
                  <h4 className="text-gray-800 font-black mb-2 uppercase tracking-tight">{language === 'cn' ? '等待上传' : 'Waiting for input'}</h4>
                  <p className="text-gray-400 text-sm leading-relaxed">{t.canvasEmpty}</p>
                </div>
              )}
            </div>

            {resultImage && (
              <div className="mt-6 flex gap-4">
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = resultImage;
                    link.download = `iris-ai-preview-${Date.now()}.png`;
                    link.click();
                  }}
                  className="flex-1 py-5 bg-gray-900 text-white rounded-3xl font-black text-lg hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-300"
                >
                  <i className="fas fa-download"></i> {t.downloadBtn}
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-6 px-4">
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
              <p className="text-[11px] text-indigo-900/60 leading-relaxed font-bold italic text-center">
                {language === 'cn' ? UI_CONFIG.disclaimer.textCN : language === 'bm' ? UI_CONFIG.disclaimer.textBM : UI_CONFIG.disclaimer.textEN}
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-8 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[11px] font-black text-gray-300 uppercase tracking-[0.3em]">&copy; 2024 IRIS.MY SMART HOME TECHNOLOGIES</p>
          <div className="flex gap-8 text-[11px] font-black text-gray-400 uppercase tracking-widest">
            <a href="#" className="hover:text-indigo-600 transition-colors">Safety</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;400;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
};

export default App;
