import React, { useState, useRef, useEffect } from 'react';
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

  useEffect(() => {
    const fetchActiveFiles = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/documents');
        if (response.ok) {
          const data = await response.json();
          if (data.status === "success" && data.files) {
            setUploadedFiles(data.files);
          }
        }
      } catch (error) {
        console.error("Error fetching active documents:", error);
      }
    };
    fetchActiveFiles();
  }, []);

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
        const fileNames = data.files || files.map(file => file.name);
        setUploadedFiles(prev => {
          const newFiles = fileNames.filter(name => !prev.includes(name));
          return [...prev, ...newFiles];
        });
        console.log("Backend upload successful:", data.message);
      }
    } catch (error) {
      console.error("Error uploading files to backend:", error);
      alert("⚠️ Failed to upload and index document on the backend server. Make sure main.py is running!");
    }
  };

  const handleDeleteFile = async (fileName) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents?filename=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Backend deletion failed');
      }

      const data = await response.json();
      if (data.status === "success") {
        setUploadedFiles(prev => prev.filter(name => name !== fileName));
        console.log("Backend deletion successful:", data.message);
      }
    } catch (error) {
      console.error("Error deleting file on backend:", error);
      alert("⚠️ Failed to delete document from the backend server.");
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
          
          {messages.length > 0 && (
            <span className="text-lg font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-lime-600 bg-clip-text text-transparent animate-fade-in select-none">
              DocuMind AI
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Built with 💡 by</span>
            <span className="font-bold text-slate-800 hover:text-lime-600 transition cursor-default">Harsh Mishra</span>
          </div>
          
          <div className="h-4 w-[1px] bg-slate-200"></div>

          <div className="flex items-center gap-3">
            <a 
              href="https://github.com/harshmishra-1702" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-slate-700 hover:text-black transition"
              title="GitHub Profile"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            
            <a 
              href="https://www.linkedin.com/in/harshmishra1702/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#0a66c2] hover:text-[#004182] transition"
              title="LinkedIn Profile"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
          </div>
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
                <ul className="text-[11px] text-slate-500 space-y-1.5">
                  {uploadedFiles.map((name, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 group">
                      <span className="truncate flex-1" title={name}>• {name}</span>
                      <button
                        onClick={() => handleDeleteFile(name)}
                        className="text-slate-400 hover:text-red-500 cursor-pointer p-0.5 rounded hover:bg-slate-100 transition opacity-0 group-hover:opacity-100"
                        title={`Delete ${name}`}
                      >
                        🗑️
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col h-full bg-[#f7f9f5] relative">
          
          {messages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 pb-32 text-center bg-[#f7f9f5] pointer-events-none z-0 select-none animate-fade-in">
              <div className="max-w-md space-y-5">
                <h2 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-lime-600 bg-clip-text text-transparent">
                  DocuMind AI
                </h2>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-700">Hello! I am your knowledge assistant.</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Ask questions, summarize key findings, or extract insights from your uploaded documents.
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
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
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
              <div className="flex flex-col items-start bg-white border border-slate-200/80 shadow-sm rounded-2xl rounded-bl-none px-5 py-4 max-w-[100px]">
                <div className="flex items-center space-x-1.5 h-3">
                  <div className="w-2 h-2 bg-lime-500 rounded-full animate-[bounce_1s_infinite_100ms]"></div>
                  <div className="w-2 h-2 bg-lime-500 rounded-full animate-[bounce_1s_infinite_300ms]"></div>
                  <div className="w-2 h-2 bg-lime-500 rounded-full animate-[bounce_1s_infinite_500ms]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="pb-6 pt-2 px-6 bg-[#f7f9f5] z-10">
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
                <button 
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition duration-200 flex-shrink-0 ml-2 ${
                    !input.trim() || isThinking 
                      ? 'bg-slate-100/80 text-slate-400/70 cursor-not-allowed' 
                      : 'bg-lime-600 text-white hover:bg-lime-700 active:scale-95 shadow-sm cursor-pointer'
                  }`}
                  title="Send Message"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={2.5} 
                    stroke="currentColor" 
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
 
        </main>
      </div>
    </div>
  );
}

export default App;