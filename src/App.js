import React, { useState, useEffect, useRef } from 'react';
import { Download, Save, FileText, AlertCircle, Check, X, Plus, Trash2, Eye, Edit2, ArrowLeft, ArrowRight, Files, Code, Printer } from 'lucide-react';

const TAB_NAMES = ["제미나이pro", "제미나이3.5", "챗GPT", "클로드", "퍼플렉서티", "라마4", "그록4"];
const DEFAULT_FONTS = ["sans-serif", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "serif", "monospace"];
const LINE_SPACINGS = ["1.00", "1.15", "1.25", "1.50", "1.75", "2.00", "2.50", "3.00"];

export default function App() {
  // === 상태(State) 관리 ===
  const [isInitialized, setIsInitialized] = useState(false);
  const [filePrefix, setFilePrefix] = useState('');
  const [showPrefixModal, setShowPrefixModal] = useState(false);
  
  const [tabs, setTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState('');
  
  const [settings, setSettings] = useState({
    fontFamily: 'sans-serif',
    fontSize: 16,
    tabFontSize: 14,
    lineSpacing: 1.50
  });

  const [editingTabId, setEditingTabId] = useState(null);
  const [editingTabTitle, setEditingTabTitle] = useState('');
  
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [msgModal, setMsgModal] = useState({ show: false, title: '', message: '' });
  
  // 인쇄 모드 상태 (전체 통합 인쇄인지, 개별 탭 인쇄인지 구분)
  const [printConfig, setPrintConfig] = useState({ mode: 'all', activeId: null });

  // 키보드 단축키용 상태 참조 (렌더링 최적화)
  const tabsRef = useRef(tabs);
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  // === 초기화 및 로컬스토리지 로드 ===
  useEffect(() => {
    // 🔥 Tailwind CSS 로드
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
    // 🔥 마크다운 파서(marked) 로드
    if (!document.getElementById('marked-cdn')) {
      const script = document.createElement('script');
      script.id = 'marked-cdn';
      script.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
      document.head.appendChild(script);
    }

    const loadData = () => {
      try {
        const savedPrefix = localStorage.getItem('yt-script-prefix');
        const savedSettings = localStorage.getItem('yt-script-settings');
        const savedTabs = localStorage.getItem('yt-script-tabs');

        if (savedSettings) setSettings(JSON.parse(savedSettings));
        
        let loadedTabs = [];
        if (savedTabs) {
          loadedTabs = JSON.parse(savedTabs).filter(tab => !tab.isHost);
          setTabs(loadedTabs);
          if (loadedTabs.length > 0) setActiveTabId(loadedTabs[0].id);
        } else {
          const initialTabs = [];
          TAB_NAMES.forEach((name, idx) => {
            initialTabs.push({ id: `tab-${idx}`, title: name, content: '' });
          });
          setTabs(initialTabs);
          setActiveTabId(initialTabs[0].id);
        }

        if (savedPrefix !== null) {
          setFilePrefix(savedPrefix);
        }
      } catch (e) {
        console.error("데이터 로드 실패", e);
      } finally {
        setIsInitialized(true);
      }
    };
    loadData();
  }, []);

  // === 자동 저장 ===
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('yt-script-tabs', JSON.stringify(tabs));
    localStorage.setItem('yt-script-settings', JSON.stringify(settings));
    localStorage.setItem('yt-script-prefix', filePrefix);
  }, [tabs, settings, filePrefix, isInitialized]);

  // === 단축키 이벤트 리스너 ===
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        const currentTabs = tabsRef.current;
        const currentId = activeTabIdRef.current;
        const idx = currentTabs.findIndex(t => t.id === currentId);
        
        if (idx === -1) return;

        if (e.key === 'ArrowLeft') {
          const prevIdx = (idx - 1 + currentTabs.length) % currentTabs.length;
          setActiveTabId(currentTabs[prevIdx].id);
        } else if (e.key === 'ArrowRight') {
          const nextIdx = (idx + 1) % currentTabs.length;
          setActiveTabId(currentTabs[nextIdx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // === 탭 조작 핸들러 ===
  const addNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab = { id: newId, title: '새 탭', content: '' };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setEditingTabId(newId);
    setEditingTabTitle('새 탭');
  };

  const deleteTab = (id) => {
    if (tabs.length <= 1) {
      setMsgModal({ show: true, title: '삭제 불가', message: '최소 1개의 탭은 유지해야 합니다.' });
      return;
    }
    if (!window.confirm('정말 이 탭을 삭제하시겠습니까? (내용이 영구 삭제됩니다)')) return;
    
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) setActiveTabId(newTabs[0].id);
  };

  const moveTab = (direction) => {
    const idx = tabs.findIndex(t => t.id === activeTabId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= tabs.length) return;

    const newTabs = [...tabs];
    const temp = newTabs[idx];
    newTabs[idx] = newTabs[newIdx];
    newTabs[newIdx] = temp;
    setTabs(newTabs);
  };

  const saveTabTitle = () => {
    if (!editingTabTitle.trim()) {
      setEditingTabId(null);
      return;
    }
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === editingTabId ? { ...tab, title: editingTabTitle.trim() } : tab
    ));
    setEditingTabId(null);
  };

  const handleContentChange = (content) => {
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === activeTabId ? { ...tab, content } : tab
    ));
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getCharCount = (content) => content.replace(/\n+$/, '').length;

  // === TXT 파일 다운로드 기능 ===
  const triggerDownload = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadActiveTab = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab || !activeTab.content.trim()) return setMsgModal({ show: true, title: '저장 실패', message: '현재 탭에 내용이 없습니다.' });
    triggerDownload(`${filePrefix ? filePrefix + '-' : ''}${activeTab.title}.txt`, activeTab.content);
  };

  const downloadAllTabsMerged = () => {
    const tabsWithContent = tabs.filter(t => t.content.trim().length > 0);
    if (tabsWithContent.length === 0) return setMsgModal({ show: true, title: '저장 실패', message: '저장할 내용이 없습니다.' });
    const mergedContent = tabsWithContent.map(t => `========== [ ${t.title} ] ==========\n${t.content}\n`).join('\n\n');
    triggerDownload(`${filePrefix ? filePrefix + '-' : ''}AI답변_통합본.txt`, mergedContent);
  };

  const downloadAllTabsIndividually = async () => {
    const tabsWithContent = tabs.filter(t => t.content.trim().length > 0);
    if (tabsWithContent.length === 0) return setMsgModal({ show: true, title: '저장 실패', message: '저장할 내용이 없습니다.' });
    for (let i = 0; i < tabsWithContent.length; i++) {
      triggerDownload(`${filePrefix ? filePrefix + '-' : ''}${tabsWithContent[i].title}.txt`, tabsWithContent[i].content);
      await new Promise(r => setTimeout(r, 300)); 
    }
  };

  // === PDF 인쇄 기능 (마크다운 모드 강제 적용) ===
  const handlePrintCurrentPdf = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab || !activeTab.content.trim()) return setMsgModal({ show: true, title: '인쇄 불가', message: '인쇄할 내용이 없습니다.' });
    
    setIsPreviewMode(true); // 마크다운 뷰어 모드로 자동 전환
    setPrintConfig({ mode: 'single', activeId: activeTabId });
    
    setTimeout(() => {
      const originalTitle = document.title;
      document.title = `${filePrefix ? filePrefix + '-' : ''}${activeTab.title}`; // PDF 기본 저장 이름 설정
      window.print();
      document.title = originalTitle;
      setPrintConfig({ mode: 'all', activeId: null });
    }, 300); // 렌더링 대기
  };

  const handlePrintAllPdf = () => {
    const tabsWithContent = tabs.filter(t => t.content.trim().length > 0);
    if (tabsWithContent.length === 0) return setMsgModal({ show: true, title: '인쇄 불가', message: '인쇄할 내용이 없습니다.' });
    
    setIsPreviewMode(true);
    setPrintConfig({ mode: 'all', activeId: null });
    
    setTimeout(() => {
      const originalTitle = document.title;
      document.title = `${filePrefix ? filePrefix + '-' : ''}AI답변_통합본`;
      window.print();
      document.title = originalTitle;
    }, 300);
  };

  const handlePrintAllIndividuallyPdf = async () => {
    const tabsWithContent = tabs.filter(t => t.content.trim().length > 0);
    if (tabsWithContent.length === 0) return setMsgModal({ show: true, title: '인쇄 불가', message: '인쇄할 내용이 없습니다.' });

    setIsPreviewMode(true);
    const originalTitle = document.title;

    for (let i = 0; i < tabsWithContent.length; i++) {
      const tab = tabsWithContent[i];
      setPrintConfig({ mode: 'single', activeId: tab.id });
      
      await new Promise(r => setTimeout(r, 400)); // UI 업데이트 대기
      document.title = `${filePrefix ? filePrefix + '-' : ''}${tab.title}`;
      window.print(); // 인쇄 다이얼로그 팝업 (사용자가 닫을때까지 코드 정지)
    }

    document.title = originalTitle;
    setPrintConfig({ mode: 'all', activeId: null });
  };

  if (!isInitialized) return null;

  const activeTab = tabs.find(t => t.id === activeTabId);
  
  // 인쇄할 탭 필터링 (현재 탭 모드 vs 전체 모드)
  const tabsToPrint = printConfig.mode === 'single'
    ? tabs.filter(t => t.id === printConfig.activeId && t.content.trim().length > 0)
    : tabs.filter(t => t.content.trim().length > 0);

  return (
    <>
      {/* 화면용 UI (인쇄 시 숨김 처리 - print:hidden) */}
      <div className="flex flex-col h-screen bg-gray-50 font-sans print:hidden">
        {/* 1. 상단 글로벌 컨트롤 패널 */}
        <div className="bg-white border-b shadow-sm p-3 flex flex-wrap items-center gap-4 text-sm z-10">
          <h1 className="text-xl font-bold text-gray-800 whitespace-nowrap mr-2">AI 답변 비교</h1>
          <div className="flex items-center gap-2 border-l pl-4">
            <label className="font-semibold text-gray-700">글꼴:</label>
            <select 
              value={settings.fontFamily} 
              onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
              className="border rounded p-1.5 w-32 outline-none focus:border-blue-500"
            >
              {DEFAULT_FONTS.map(font => (
                <option key={font} value={font} style={{fontFamily: font}}>{font}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 border-l pl-4">
            <label className="font-semibold text-gray-700 whitespace-nowrap">글꼴 크기:</label>
            <input type="number" min="10" max="40" value={settings.fontSize} onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value) || 16)} className="border rounded p-1.5 w-16 text-center outline-none focus:border-blue-500" />
          </div>
          <div className="flex items-center gap-2 border-l pl-4">
            <label className="font-semibold text-gray-700 whitespace-nowrap">줄간격:</label>
            <select value={settings.lineSpacing} onChange={(e) => handleSettingChange('lineSpacing', parseFloat(e.target.value))} className="border rounded p-1.5 w-20 outline-none focus:border-blue-500">
              {LINE_SPACINGS.map(space => <option key={space} value={space}>{space}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 border-l pl-4 pr-4">
            <label className="font-semibold text-gray-700 whitespace-nowrap">탭 글꼴 크기:</label>
            <input type="number" min="10" max="24" value={settings.tabFontSize} onChange={(e) => handleSettingChange('tabFontSize', parseInt(e.target.value) || 14)} className="border rounded p-1.5 w-16 text-center outline-none focus:border-blue-500" />
          </div>
          
          <div className="flex-1 text-right text-xs text-gray-500">
            단축키: <kbd className="bg-gray-100 border p-1 rounded">Ctrl</kbd> + <kbd className="bg-gray-100 border p-1 rounded">Alt</kbd> + <kbd className="bg-gray-100 border p-1 rounded">◀ / ▶</kbd>
          </div>
        </div>

        {/* 2. 탭 네비게이션 영역 */}
        <div className="flex overflow-x-auto bg-gray-100 border-b custom-scrollbar items-end pt-2 px-2">
          {tabs.map((tab) => (
            <div key={tab.id} className="relative group flex-shrink-0">
              {editingTabId === tab.id ? (
                <div className="flex items-center bg-white border-t border-l border-r rounded-t-lg mx-0.5 px-3 py-2 z-10 relative">
                  <input 
                    autoFocus
                    type="text" 
                    value={editingTabTitle}
                    onChange={(e) => setEditingTabTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveTabTitle(); if (e.key === 'Escape') setEditingTabId(null); }}
                    className="border border-blue-400 rounded px-2 py-1 outline-none text-sm w-32"
                  />
                  <button onClick={saveTabTitle} className="ml-1 text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14}/></button>
                  <button onClick={() => setEditingTabId(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14}/></button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTabId(tab.id)}
                  onDoubleClick={() => { setEditingTabId(tab.id); setEditingTabTitle(tab.title); }}
                  style={{ fontSize: `${settings.tabFontSize}px` }}
                  className={`
                    flex items-center px-4 py-2 mx-0.5 rounded-t-lg border-t border-l border-r transition-all font-semibold whitespace-nowrap
                    ${activeTabId === tab.id ? 'bg-white border-gray-300 text-blue-600 shadow-[0_2px_0_0_white]' : 'bg-gray-200 border-transparent text-gray-500 hover:bg-gray-300'}
                  `}
                  title="더블클릭하여 이름 변경"
                >
                  {tab.title}
                  {tab.content.trim().length > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-green-400"></span>}
                </button>
              )}
            </div>
          ))}
          <button onClick={addNewTab} title="새 탭 추가" className="flex-shrink-0 px-3 py-2 mx-0.5 rounded-t-lg bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-blue-600 font-bold transition">
            <Plus size={18} />
          </button>
        </div>

        {/* 3. 현재 탭 액션(도구) 바 */}
        {activeTab && (
          <div className="bg-white border-b px-4 py-2 flex flex-wrap items-center justify-between text-sm shadow-sm z-10 overflow-x-auto gap-2">
            
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => moveTab(-1)} title="탭 이동" className="p-1.5 text-gray-600 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200"><ArrowLeft size={16}/></button>
              <button onClick={() => moveTab(1)} title="탭 이동" className="p-1.5 text-gray-600 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200"><ArrowRight size={16}/></button>
              <div className="w-px h-5 bg-gray-300 mx-2"></div>
              <button onClick={() => { setEditingTabId(activeTab.id); setEditingTabTitle(activeTab.title); }} className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200"><Edit2 size={14}/> 이름 변경</button>
              <button onClick={() => deleteTab(activeTab.id)} className="flex items-center gap-1 px-2 py-1.5 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-200"><Trash2 size={14}/> 탭 삭제</button>
            </div>

            <div className="flex items-center flex-wrap gap-2 flex-shrink-0">
              <button 
                onClick={() => setIsPreviewMode(!isPreviewMode)} 
                className={`flex items-center gap-1 px-3 py-1.5 rounded transition font-medium mr-2 ${isPreviewMode ? 'bg-indigo-600 text-white shadow-inner' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}
              >
                {isPreviewMode ? <><Code size={16}/> 에디터로 돌아가기</> : <><Eye size={16}/> 마크다운 미리보기</>}
              </button>

              {/* PDF 그룹 */}
              <div className="flex items-center gap-1 border-l pl-3">
                <button onClick={handlePrintCurrentPdf} className="flex items-center gap-1 px-2 py-1.5 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition" title="현재 탭만 PDF로 저장">
                  <Printer size={14} /> 현재 탭 PDF
                </button>
                <button onClick={handlePrintAllPdf} className="flex items-center gap-1 px-2 py-1.5 bg-green-100 text-green-800 rounded border border-green-300 hover:bg-green-200 transition font-semibold" title="모든 탭을 하나의 PDF로 묶어서 저장">
                  <Printer size={14} /> 전체 통합 PDF
                </button>
                <button onClick={handlePrintAllIndividuallyPdf} className="flex items-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded shadow hover:bg-green-700 transition font-semibold" title="모든 탭을 각각의 PDF 파일로 하나씩 저장">
                  <Printer size={14} /> 전체 개별 PDF
                </button>
              </div>

              {/* TXT 그룹 */}
              <div className="flex items-center gap-1 border-l pl-3">
                <button onClick={downloadActiveTab} className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition">
                  <Download size={14} /> 현재 탭 TXT
                </button>
                <button onClick={downloadAllTabsMerged} className="flex items-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-800 rounded border border-blue-300 hover:bg-blue-200 transition font-semibold">
                  <FileText size={14} /> 전체 통합 TXT
                </button>
                <button onClick={downloadAllTabsIndividually} className="flex items-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition font-semibold">
                  <Files size={14} /> 전체 개별 TXT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. 에디터 및 미리보기 영역 */}
        <div className="flex-1 bg-white relative flex flex-col p-4 shadow-inner overflow-hidden">
          {activeTab && (
            isPreviewMode ? (
              <div 
                className="flex-1 w-full h-full overflow-y-auto custom-scrollbar p-2 markdown-body text-gray-800"
                style={{ fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineSpacing }}
                dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(activeTab.content || '내용이 없습니다.') : '마크다운 렌더러 로딩중...' }}
              />
            ) : (
              <textarea
                className="flex-1 w-full h-full resize-none outline-none custom-scrollbar p-2"
                value={activeTab.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={`${activeTab.title} 답변을 입력하세요...\n(내용은 브라우저에 자동 저장됩니다)`}
                style={{
                  fontFamily: settings.fontFamily,
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineSpacing,
                }}
              />
            )
          )}
        </div>

        {/* 5. 하단 상태바 */}
        <div className="bg-gray-800 text-gray-200 p-2 px-4 text-sm flex justify-between items-center z-10 shadow-[0_-2px_5px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-2">
            <Save size={16} />
            <span>접두사: <strong className="text-white bg-gray-700 px-2 py-0.5 rounded ml-1">{filePrefix || '(없음)'}</strong></span>
            <button 
              onClick={() => setShowPrefixModal(true)} 
              className="ml-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs flex items-center gap-1 transition text-white border border-gray-500"
            >
              <Edit2 size={12} /> 설정
            </button>
            {activeTab && (
              <span className="ml-4 text-gray-400 text-xs hidden sm:inline">
                👉 예상 파일명: <strong className="text-green-400 font-mono ml-1">{filePrefix ? `${filePrefix}-` : ''}{activeTab.title}.txt</strong>
              </span>
            )}
          </div>
          <div className="font-medium">
            {activeTab ? `${activeTab.title} 글자수: ${getCharCount(activeTab.content)}` : '로딩중...'}
          </div>
        </div>
      </div>

      {/* ======================================================= */}
      {/* 6. 인쇄용 전용 UI (평소에는 숨겨져 있고, 인쇄 시에만 나옴) */}
      {/* ======================================================= */}
      <div className="hidden print:block w-full max-w-none bg-white text-black p-8">
        <div className="text-center mb-8 border-b-4 border-gray-800 pb-4">
          <h1 className="text-3xl font-bold">
            {printConfig.mode === 'single' && tabsToPrint[0] ? tabsToPrint[0].title : "AI 답변 비교 문서"}
          </h1>
          {filePrefix && <p className="text-gray-500 mt-2 text-lg">프로젝트 접두사: {filePrefix}</p>}
        </div>

        {tabsToPrint.map((tab, index) => (
          <div key={`print-tab-${tab.id}`} className="mb-12 break-inside-avoid">
            {printConfig.mode === 'all' && (
              <h2 className="text-2xl font-bold bg-gray-100 px-4 py-2 mb-6 rounded border-l-4 border-indigo-600">
                {tab.title}
              </h2>
            )}
            <div
              className="markdown-body"
              style={{ fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px`, lineHeight: settings.lineSpacing }}
              dangerouslySetInnerHTML={{ __html: window.marked ? window.marked.parse(tab.content) : tab.content }}
            />
          </div>
        ))}
      </div>

      {/* === 모달(팝업) 영역 === */}
      {showPrefixModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 print:hidden">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
            <h2 className="text-lg font-bold mb-4 text-gray-800">파일명 접두사 설정</h2>
            <form onSubmit={(e) => { e.preventDefault(); setFilePrefix(new FormData(e.target).get('prefixInput')); setShowPrefixModal(false); }}>
              <p className="text-sm text-gray-600 mb-3">저장될 파일명 맨 앞에 붙일 텍스트를 입력하세요.<br/>(비워두면 접두사 없이 저장됩니다.)</p>
              <input name="prefixInput" type="text" defaultValue={filePrefix} autoFocus className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 mb-4" placeholder="예: 0705 또는 프로젝트명" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPrefixModal(false)} className="w-1/3 bg-gray-200 text-gray-800 font-semibold rounded-lg py-3 hover:bg-gray-300 transition">취소</button>
                <button type="submit" className="w-2/3 bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 transition">확인</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {msgModal.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 print:hidden">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-500 mb-4"><AlertCircle size={28} /></div>
            <h2 className="text-lg font-bold mb-2 text-gray-800">{msgModal.title}</h2>
            <p className="text-gray-600 mb-6">{msgModal.message}</p>
            <button onClick={() => setMsgModal({ show: false, title: '', message: '' })} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 w-full transition">닫기</button>
          </div>
        </div>
      )}

      {/* 스타일 유틸리티 & 마크다운 CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        .markdown-body h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.2em; }
        .markdown-body h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.2em; }
        .markdown-body h3 { font-size: 1.25em; font-weight: bold; margin-bottom: 0.5em; }
        .markdown-body p { margin-bottom: 1em; }
        .markdown-body ul { list-style-type: disc; margin-left: 1.5em; margin-bottom: 1em; }
        .markdown-body ol { list-style-type: decimal; margin-left: 1.5em; margin-bottom: 1em; }
        .markdown-body strong { font-weight: bold; color: #111827; }
        .markdown-body blockquote { border-left: 4px solid #d1d5db; padding-left: 1em; color: #4b5563; margin-bottom: 1em; background: #f9fafb; padding: 0.5em 1em; }
        .markdown-body code { background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; color: #ef4444; font-size: 0.9em; }
        .markdown-body pre { background: #1f2937; color: #f9fafb; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; }
        .markdown-body pre code { background: transparent; color: inherit; padding: 0; font-size: 0.9em; }
        
        /* 인쇄 최적화 CSS */
        @media print {
          @page { margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .markdown-body pre { border: 1px solid #d1d5db; background: #f3f4f6 !important; color: black !important; white-space: pre-wrap !important; word-break: break-word !important; }
          .markdown-body blockquote { border-left: 4px solid #9ca3af !important; background: #f9fafb !important; }
        }
      `}} />
    </>
  );
}
