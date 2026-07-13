import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleZoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach(file => {
      formData.append("files", file);
    });

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Backend upload failed');
      }

      const data = await response.json();
      
      if (data.status === "success") {
        const fileNames = files.map(file => file.name);
        setUploadedFiles(prev => [...prev, ...fileNames]);
        console.log("Backend upload successful:", data.message);
      }
    } catch (error) {
      console.error("Error uploading files to backend:", error);
      alert("⚠️ Failed to upload and index document on the backend server. Make sure main.py is running!");
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage }),
      });

      if (!response.ok) throw new Error('Backend offline');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
      setIsThinking(false);
    } catch (error) {
      console.log('Running client-side mock fallback...');
      
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: `Sandbox Fallback: Received "${userMessage}". Start your FastAPI backend on port 8000 to process live queries.` 
        }]);
        setIsThinking(false);
      }, 1500);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-50 text-slate-800 font-sans overflow-hidden">
      
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 text-slate-500 hover:text-lime-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition text-base font-bold shadow-sm"
            title={isSidebarCollapsed ? "Expand Knowledge Base" : "Collapse Knowledge Base"}
          >
            ☰
          </button>
        </div>
        
        <div className="flex items-center">
          <span className="text-sm font-semibold text-slate-500 tracking-wide">Workspace</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        
        <aside 
          className={`bg-lime-50/20 border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'w-0 opacity-0 overflow-hidden border-r-0' : 'w-64 opacity-100'
          }`}
        >
          <div className="flex-1 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Knowledge Base</span>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden" 
            />
            
            <div 
              onClick={handleZoneClick}
              className="w-full border-2 border-dashed border-slate-300 hover:border-lime-500 bg-white hover:bg-lime-50/40 rounded-xl p-5 text-center cursor-pointer transition shadow-sm group"
            >
              <span className="text-2xl block mb-2">📥</span>
              <div className="text-sm font-semibold text-slate-700 group-hover:text-lime-700">Upload Documents</div>
              <div className="text-xs text-slate-400 mt-1">Click to attach data files</div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm animate-fade-in max-h-48 overflow-y-auto">
                <div className="text-xs font-semibold text-slate-500 mb-1">Active Context:</div>
                <div className="text-xs text-lime-700 font-semibold mb-2">✨ {uploadedFiles.length} file(s) indexed</div>
                <ul className="text-[11px] text-slate-500 space-y-1 truncate">
                  {uploadedFiles.map((name, i) => (
                    <li key={i} className="truncate">• {name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-full bg-white relative">
          
          {messages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pb-32 text-center bg-white pointer-events-none z-0 select-none animate-fade-in">
              <div className="max-w-md space-y-5">
                <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-lime-600 bg-clip-text text-transparent">
                  DocuMind AI
                </h2>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-700">Hello! I am your knowledge assistant.</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Ask me anything about the contents of your loaded documents and data paths.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl w-full mx-auto z-0">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-lime-100/70 text-slate-900 border border-lime-200/60 rounded-br-none font-medium' 
                      : 'bg-neutral-50 text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="markdown-content prose max-w-none text-left">
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]} 
                      rehypePlugins={[rehypeKatex]}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex flex-col items-start bg-neutral-50 border border-slate-200 shadow-sm rounded-2xl rounded-bl-none px-5 py-4 max-w-[100px]">
                <div className="flex items-center space-x-1.5 h-3">
                  <div className="w-2 h-2 bg-lime-500 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
                  <div className="w-2 h-2 bg-lime-500 rounded-full animate-[bounce_1s_infinite_300ms]"></div>
                  <div className="w-2 h-2 bg-lime-500 rounded-full animate-[bounce_1s_infinite_500ms]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="pb-6 pt-2 px-6 bg-white z-10">
            <div className="max-w-3xl mx-auto flex items-center bg-white border border-slate-200/80 focus-within:border-lime-500 rounded-2xl p-2 shadow-md shadow-slate-100/70 transition">
              <form onSubmit={handleSend} className="flex-1 flex items-center pl-3">
                <input 
                  type="text"
                  value={input}
                  disabled={isThinking}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isThinking ? "Parsing document fragments..." : "Ask a question about your documents..."}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-60"
                />
                <button type="submit" className="hidden" />
              </form>
              
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isThinking}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition duration-200 flex-shrink-0 ml-2 ${
                  !input.trim() || isThinking 
                    ? 'bg-slate-100/80 text-slate-400/70 cursor-not-allowed' 
                    : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-sm'
                }`}
                title="Send Message"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  className="w-4 h-4"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.53 60.53 0 0 0 18.425-7.648.75.75 0 0 0 0-1.228 60.53 60.53 0 0 0-18.425-7.648Z" />
                </svg>
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

export default App;