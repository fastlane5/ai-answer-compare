import React, { useState, useEffect, useRef } from 'react';
import { Download, Save, Settings, FileText, AlertCircle, Edit2, Check, X } from 'lucide-react';

const TAB_NAMES = ["제미나이pro", "제미나이3.5", "챗GPT", "클로드", "퍼플렉서티", "라마4", "그록4"];
const DEFAULT_FONTS = ["sans-serif", "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", "serif", "monospace"];
const LINE_SPACINGS = ["1.00", "1.15", "1.25", "1.50", "1.75", "2.00", "2.50", "3.00"];

export default function App() {
  // === 상태(State) 관리 ===
  const [isInitialized, setIsInitialized] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  
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

  // 메시지 모달(alert 대체) 상태
  const [msgModal, setMsgModal] = useState({ show: false, title: '', message: '' });

  // === 초기화 및 로컬스토리지 로드 ===
  useEffect(() => {
    const loadData = () => {
      try {
        const savedDate = localStorage.getItem('yt-script-date');
        const savedSettings = localStorage.getItem('yt-script-settings');
        const savedTabs = localStorage.getItem('yt-script-tabs');

        if (savedSettings) setSettings(JSON.parse(savedSettings));
        
        let loadedTabs = [];
        if (savedTabs) {
          // 기존에 저장된 데이터 중 진행자 탭이 있다면 필터링하여 제외합니다.
          loadedTabs = JSON.parse(savedTabs).filter(tab => !tab.isHost);
          setTabs(loadedTabs);
          if (loadedTabs.length > 0) setActiveTabId(loadedTabs[0].id);
        } else {
          // 탭 초기 생성
          const initialTabs = [];
          TAB_NAMES.forEach((name, idx) => {
            initialTabs.push({ id: `tab-${idx}`, title: name, content: '' });
          });
          setTabs(initialTabs);
          setActiveTabId(initialTabs[0].id);
        }

        if (savedDate) {
          setDateStr(savedDate);
        } else {
          setShowDateModal(true); // 날짜 입력창 띄우기
        }
      } catch (e) {
        console.error("데이터 로드 실패", e);
      } finally {
        setIsInitialized(true);
      }
    };
    loadData();
  }, []);

  // === 자동 저장 (데이터가 바뀔 때마다) ===
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('yt-script-tabs', JSON.stringify(tabs));
    localStorage.setItem('yt-script-settings', JSON.stringify(settings));
    localStorage.setItem('yt-script-date', dateStr);
  }, [tabs, settings, dateStr, isInitialized]);


  // === 이벤트 핸들러 ===
  const handleDateSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const dateInput = formData.get('dateInput');
    if (dateInput) {
      setDateStr(dateInput);
      setShowDateModal(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleContentChange = (content) => {
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === activeTabId ? { ...tab, content } : tab
    ));
  };

  const handleTabDoubleClick = (tabId, title) => {
    setEditingTabId(tabId);
    setEditingTabTitle(title);
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

  const getCharCount = (content) => {
    return content.replace(/\n+$/, '').length;
  };

  // === 파일 다운로드 기능 (로컬 저장) ===
  const downloadActiveTab = () => {
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (!activeTab || !activeTab.content.trim()) {
      setMsgModal({ show: true, title: '저장 실패', message: '현재 탭에 내용이 없습니다.' });
      return;
    }
    const filename = `${dateStr ? dateStr + '-' : ''}${activeTab.title}.txt`;
    triggerDownload(filename, activeTab.content);
  };

  const downloadAllTabs = () => {
    const tabsWithContent = tabs.filter(t => t.content.trim().length > 0);
    if (tabsWithContent.length === 0) {
      setMsgModal({ show: true, title: '저장 실패', message: '저장할 내용이 있는 탭이 없습니다.' });
      return;
    }

    // 웹 환경에서는 폴더 지정 대신 전체 내용을 하나의 파일로 합치거나 각각 다운로드를 유도해야 합니다.
    // 여기서는 모든 내용을 하나의 깔끔한 텍스트 파일로 병합하여 다운로드합니다.
    const mergedContent = tabsWithContent.map(t => 
      `========== [ ${t.title} ] ==========\n${t.content}\n`
    ).join('\n\n');

    const filename = `${dateStr ? dateStr + '-' : ''}AI답변모음.txt`;
    triggerDownload(filename, mergedContent);
  };

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

  if (!isInitialized) return null;

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* 상단 컨트롤 패널 */}
      <div className="bg-white border-b shadow-sm p-4 flex flex-wrap items-center gap-4 text-sm z-10">
        <h1 className="text-xl font-bold text-gray-800 whitespace-nowrap mr-2">AI 답변 비교</h1>
        <div className="flex items-center gap-2">
          <label className="font-semibold text-gray-700">탭/글꼴:</label>
          <select 
            value={activeTabId} 
            onChange={(e) => setActiveTabId(e.target.value)}
            className="border rounded p-1.5 min-w-[150px] outline-none focus:border-blue-500"
          >
            {tabs.map(tab => (
              <option key={`sel-${tab.id}`} value={tab.id}>{tab.title}</option>
            ))}
          </select>
          <select 
            value={settings.fontFamily} 
            onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
            className="border rounded p-1.5 min-w-[120px] outline-none focus:border-blue-500"
          >
            {DEFAULT_FONTS.map(font => (
              <option key={font} value={font} style={{fontFamily: font}}>{font}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 border-l pl-4">
          <label className="font-semibold text-gray-700 whitespace-nowrap">글꼴 크기:</label>
          <input 
            type="number" 
            min="10" max="40" 
            value={settings.fontSize}
            onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value) || 16)}
            className="border rounded p-1.5 w-16 text-center outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 border-l pl-4">
          <label className="font-semibold text-gray-700 whitespace-nowrap">줄간격:</label>
          <select 
            value={settings.lineSpacing}
            onChange={(e) => handleSettingChange('lineSpacing', parseFloat(e.target.value))}
            className="border rounded p-1.5 w-24 outline-none focus:border-blue-500"
          >
            {LINE_SPACINGS.map(space => (
              <option key={space} value={space}>{space}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 border-l pl-4">
          <label className="font-semibold text-gray-700 whitespace-nowrap">탭 글꼴 크기:</label>
          <input 
            type="number" 
            min="10" max="24" 
            value={settings.tabFontSize}
            onChange={(e) => handleSettingChange('tabFontSize', parseInt(e.target.value) || 14)}
            className="border rounded p-1.5 w-16 text-center outline-none focus:border-blue-500"
          />
        </div>
        
        <div className="flex-1"></div>

        <div className="flex items-center gap-2">
          <button 
            onClick={downloadActiveTab}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition"
          >
            <Download size={16} />
            <span>현재 탭 파일저장</span>
          </button>
          <button 
            onClick={downloadAllTabs}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-sm"
          >
            <Save size={16} />
            <span>전체 묶어 저장</span>
          </button>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex overflow-x-auto bg-gray-100 border-b custom-scrollbar items-end pt-2 px-2">
        {tabs.map((tab) => (
          <div key={tab.id} className="relative group">
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
                onDoubleClick={() => handleTabDoubleClick(tab.id, tab.title)}
                style={{ fontSize: `${settings.tabFontSize}px` }}
                className={`
                  flex items-center px-4 py-2 mx-0.5 rounded-t-lg border-t border-l border-r transition-all font-semibold whitespace-nowrap
                  ${activeTabId === tab.id 
                    ? 'bg-white border-gray-300 text-blue-600 shadow-[0_2px_0_0_white]' 
                    : 'bg-gray-200 border-transparent text-gray-500 hover:bg-gray-300'}
                `}
                title="더블클릭하여 이름 변경"
              >
                {tab.title}
                {tab.content.trim().length > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-green-400"></span>}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 에디터 영역 */}
      <div className="flex-1 bg-white relative flex flex-col p-4 shadow-inner overflow-hidden">
        {activeTab && (
          <>
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
          </>
        )}
      </div>

      {/* 하단 상태바 */}
      <div className="bg-gray-800 text-gray-200 p-2 px-4 text-sm flex justify-between items-center z-10 shadow-[0_-2px_5px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-2">
          <FileText size={16} />
          <span>현재 날짜: <strong className="text-white cursor-pointer hover:underline" onClick={() => setShowDateModal(true)}>{dateStr || '미설정'}</strong></span>
        </div>
        <div className="font-medium">
          {activeTab ? `${activeTab.title} 글자수: ${getCharCount(activeTab.content)}` : '로딩중...'}
        </div>
      </div>

      {/* === 모달(팝업) 영역 === */}
      
      {/* 1. 날짜 설정 모달 */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-lg font-bold mb-4 text-gray-800">날짜 설정</h2>
            <form onSubmit={handleDateSubmit}>
              <p className="text-sm text-gray-600 mb-3">파일 저장 시 접두사로 사용될 날짜를 입력하세요.<br/>(예: 0711)</p>
              <input 
                name="dateInput"
                type="text" 
                defaultValue={dateStr}
                autoFocus
                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                placeholder="0711"
                required
              />
              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white font-semibold rounded-lg py-3 hover:bg-blue-700 transition"
              >
                확인
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. 일반 메시지 모달 (Alert 대체) */}
      {msgModal.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-500 mb-4">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-lg font-bold mb-2 text-gray-800">{msgModal.title}</h2>
            <p className="text-gray-600 mb-6">{msgModal.message}</p>
            <button 
              onClick={() => setMsgModal({ show: false, title: '', message: '' })}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 w-full transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 스타일 유틸리티 (스크롤바 등) */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
    </div>
  );
}
