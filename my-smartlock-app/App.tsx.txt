
import React, { useState, useRef } from 'react';
import { LOCK_MODELS, UI_CONFIG, BRAND_NAME, TRANSLATIONS } from './constants';
import { AppStatus, LockModel } from './types';
import { generateVisualizedDoor } from './services/geminiService';

type Language = 'en' | 'bm' | 'cn';

const SmartLockIcon: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="25" y="10" width="50" height="120" rx="8" fill="#4f46e5" />
    <rect x="30" y="25" width="40" height="50" rx="4" fill="#3730a3" />
    <g fill="#c7d2fe" style={{ fontSize: '6px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
      <text x="35" y="38">1</text> <text x="48" y="38">2</text> <text x="61" y="38">3</text>
      <text x="35" y="48">4</text> <text x="48" y="48">5</text> <text x="61" y="48">6</text>
      <text x="35" y="58">7</text> <text x="48" y="58">8</text> <text x="61" y="58">9</text>
      <text x="35" y="68">*</text> <text x="48" y="68">0</text> <text x="61" y="68">#</text>
    </g>
    <rect x="42" y="80" width="16" height="8" rx="2" stroke="#818cf8" strokeWidth="1" />
    <text x="44" y="86" fill="#c7d2fe" style={{ fontSize: '3px', fontFamily: 'sans-serif' }}>CARD</text>
    <circle cx="50" cy="105" r="8" fill="#312e81" />
    <rect x="48" y="100" width="35" height="10" rx="5" fill="#1e1b4b" />
    <ellipse cx="50" cy="145" rx="25" ry="5" fill="#4f46e5" fillOpacity="0.2" />
  </svg>
);

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('cn');
  const [selectedLock, setSelectedLock] = useState<LockModel>(LOCK_MODELS[0]);
  const [doorImage, setDoorImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
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

  const handleConfirm = async () => {
    if (!doorImage) {
      setErrorMsg(t.uploadFirst);
      return;
    }

    setStatus(AppStatus.GENERATING);
    setErrorMsg(null);
    try {
      const result = await generateVisualizedDoor(doorImage, selectedLock.imageUrl);
      setResultImage(result);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      if (err.message?.includes('429') || err.status === 429) {
        setErrorMsg(t.quotaError);
      } else {
        setErrorMsg(t.error);
      }
      setStatus(AppStatus.ERROR);
    }
  };

  const downloadWithWatermark = () => {
    if (!resultImage) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const barHeight = canvas.height * 0.05;
      ctx.fillStyle = UI_CONFIG.disclaimer.bgColor;
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

      ctx.fillStyle = UI_CONFIG.disclaimer.textColor;
      ctx.font = `${Math.floor(barHeight * 0.4)}px sans-serif`;
      ctx.textAlign = 'center';
      
      const disclaimerText = language === 'cn' ? UI_CONFIG.disclaimer.textCN : 
                             language === 'bm' ? UI_CONFIG.disclaimer.textBM : 
                             UI_CONFIG.disclaimer.textEN;

      ctx.fillText(disclaimerText, canvas.width / 2, canvas.height - (barHeight / 2.5));

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(canvas.width * 0.025, 12);
      ctx.font = `italic bold ${fontSize}px sans-serif`;
      ctx.fillStyle = UI_CONFIG.watermark.color;
      ctx.fillText(UI_CONFIG.watermark.text, canvas.width / 2, canvas.height * 0.75);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${BRAND_NAME.replace(/\s+/g, '-')}-Preview-${selectedLock.name.replace(/\s+/g, '-')}.png`;
      link.click();
    };
    img.src = resultImage;
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-10">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="flex flex-col items-center mb-10 relative">
          <div className="flex bg-white p-1 rounded-full shadow-sm border border-gray-100 mb-6">
            <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'en' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>EN</button>
            <button onClick={() => setLanguage('bm')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'bm' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>BM</button>
            <button onClick={() => setLanguage('cn')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${language === 'cn' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>CN</button>
          </div>

          <div className="flex items-center gap-4 mb-2 text-center">
            <SmartLockIcon className="w-10 h-10 md:w-12 md:h-12 drop-shadow-sm" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
          </div>
          <p className="text-gray-500 text-base md:text-lg text-center px-4">{t.subtitle}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
                {t.step1}
              </h2>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative cursor-pointer border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center transition-all overflow-hidden ${doorImage ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
              >
                {doorImage ? (
                  <img src={doorImage} alt="Uploaded door" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <i className="fas fa-camera text-4xl text-gray-300 mb-3"></i>
                    <p className="text-gray-500 font-medium text-center px-4 text-sm">{t.step1Hint}</p>
                  </>
                )}
                {doorImage && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white text-sm font-bold">{t.changePhoto}</span>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
                {t.step2}
              </h2>
              <div className="grid grid-cols-1 gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {LOCK_MODELS.map((lock) => (
                  <button
                    key={lock.id}
                    onClick={() => setSelectedLock(lock)}
                    className={`flex items-center p-3 rounded-xl border-2 transition-all text-left ${selectedLock.id === lock.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}
                  >
                    <div className="w-14 h-14 bg-white rounded-lg flex-shrink-0 mr-4 p-1 border border-gray-100">
                      <img src={lock.imageUrl} alt={lock.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{lock.name}</p>
                      <p className="text-[10px] text-gray-500 line-clamp-1 italic">{lock.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleConfirm}
                disabled={!doorImage || status === AppStatus.GENERATING}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex flex-col items-center justify-center transition-all ${!doorImage || status === AppStatus.GENERATING ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'}`}
              >
                {status === AppStatus.GENERATING ? (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>{t.generating}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <i className="fas fa-wand-sparkles"></i>
                    <span>{t.generateBtn}</span>
                  </div>
                )}
              </button>

              <p className="text-[10px] text-gray-400 text-center uppercase tracking-tighter">
                * {language === 'cn' ? UI_CONFIG.disclaimer.textCN : language === 'bm' ? UI_CONFIG.disclaimer.textBM : UI_CONFIG.disclaimer.textEN}
              </p>
              
              <div className="pt-2 text-center">
                <button 
                  onClick={() => setIsPrivacyOpen(!isPrivacyOpen)}
                  className="text-[10px] text-gray-400 hover:text-indigo-500 transition-colors inline-flex items-center gap-1 group"
                >
                  <i className={`fas ${isPrivacyOpen ? 'fa-chevron-up' : 'fa-info-circle'} opacity-70`}></i>
                  <span className="underline underline-offset-2">{t.privacyTitle}</span>
                </button>
                {isPrivacyOpen && (
                  <div className="mt-2 text-left bg-gray-100/80 p-3 rounded-lg border border-gray-200 text-[10px] text-gray-500 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                    <p className="font-bold text-gray-600 mb-1">{t.privacyTitle}</p>
                    {t.privacyContent}
                  </div>
                )}
              </div>
              
              {errorMsg && (
                <div className={`text-center p-3 rounded-xl flex items-center gap-3 border ${errorMsg === t.quotaError ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                  <i className={`fas ${errorMsg === t.quotaError ? 'fa-hourglass-half' : 'fa-circle-exclamation'}`}></i>
                  <p className="text-xs font-bold">{errorMsg}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col min-h-[500px]">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <span className="font-bold text-gray-700 flex items-center gap-2">
                  <i className="fas fa-image text-indigo-400"></i>
                  {t.canvasTitle}
                </span>
                {resultImage && (
                  <button onClick={() => { setDoorImage(null); setResultImage(null); setStatus(AppStatus.IDLE); }} className="text-xs text-indigo-600 hover:underline font-bold uppercase">
                    {t.restart}
                  </button>
                )}
              </div>
              
              <div className="flex-1 flex items-center justify-center p-4 bg-gray-100/50 relative">
                {status === AppStatus.GENERATING ? (
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <div className="absolute inset-0 rounded-full animate-ping opacity-25 bg-indigo-200"></div>
                      <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <i className="fas fa-magic text-indigo-600 text-4xl animate-pulse"></i>
                      </div>
                    </div>
                    <p className="text-gray-600 font-bold">{t.generating}</p>
                    <p className="text-xs text-gray-400 mt-2">{t.generatingSub}</p>
                  </div>
                ) : resultImage ? (
                  <div className="w-full h-full flex flex-col items-center">
                    <div className="relative group w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden border-4 border-white">
                      <img src={resultImage} alt="Result" className="w-full" />
                      <div className="absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold italic pointer-events-none select-none text-[10px] md:text-xs text-center whitespace-nowrap drop-shadow-md" style={{ color: UI_CONFIG.watermark.color }}>
                        {UI_CONFIG.watermark.text}
                      </div>
                      <div className="absolute bottom-0 inset-x-0 text-[10px] py-1.5 px-4 text-center backdrop-blur-sm" style={{ backgroundColor: UI_CONFIG.disclaimer.bgColor, color: UI_CONFIG.disclaimer.textColor }}>
                         {language === 'cn' ? UI_CONFIG.disclaimer.textCN : language === 'bm' ? UI_CONFIG.disclaimer.textBM : UI_CONFIG.disclaimer.textEN}
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-4">
                      <button onClick={downloadWithWatermark} className="bg-indigo-600 text-white px-10 py-3 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                        <i className="fas fa-download"></i>
                        {t.downloadBtn}
                      </button>
                      <p className="text-[10px] text-gray-400 max-w-xs text-center">{t.downloadHint}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-300">
                    <div className="w-24 h-24 border-4 border-dashed border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                      <SmartLockIcon className="w-16 h-16 opacity-30" />
                    </div>
                    <p className="text-gray-400 font-medium px-10">{t.canvasEmpty}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-[10px] text-gray-400 max-w-2xl mx-auto leading-relaxed opacity-70">
            &copy; 2024 {BRAND_NAME}. Powered by Google Gemini AI. <br/>
            Photos are processed via Google AI infrastructure to maintain the free service.
          </p>
        </footer>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-top-1 { from { transform: translateY(-4px); } to { transform: translateY(0); } }
        .animate-in { animation: fade-in 0.2s ease-out, slide-in-from-top-1 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
