import io
import logging
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from pypdf import PdfReader
from fastapi import FastAPI, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DocuMindCore")

app = FastAPI(title="DocuMind AI Optimized Engine", version="1.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatQuery(BaseModel):
    query: str = Field(..., min_length=1)

class ChatResponse(BaseModel):
    response: str
    status: str = "success"

# Global Storage Pools
KB_VECTOR_STORE: List[Dict[str, str]] = []
INDEXED_FILES_REGISTRY: List[str] = []

def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        full_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
        return "\n".join(full_text)
    except Exception as e:
        logger.error(f"Error parsing PDF payload: {str(e)}")
        return ""

def chunk_text(text: str, chunk_size: int = 150, overlap: int = 30) -> List[str]:
    """Smaller chunk sizing ensures highly specific paragraphs are isolated cleanly."""
    sentences = text.split(". ")
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        current_chunk.append(sentence)
        current_length += len(sentence.split())
        
        if current_length >= chunk_size:
            chunks.append(". ".join(current_chunk) + ".")
            current_chunk = current_chunk[-2:] if len(current_chunk) > 2 else []
            current_length = sum(len(c.split()) for c in current_chunk)
            
    if current_chunk:
        chunks.append(". ".join(current_chunk) + ".")
    return chunks

def evaluate_keyword_similarity(query: str, document_chunks: List[Dict[str, str]], top_k: int = 2) -> str:
    if not document_chunks:
        return ""
        
    query_clean = query.lower()
    scored_chunks = []
    
    # Simple semantic expansion dictionary to catch natural variations
    synonyms = {
        "personal": ["private", "personal", "family", "own"],
        "office hours": ["work time", "working hours", "lunch break", "tea break", "shift"],
        "call": ["call", "calls", "telephone", "phone"]
    }
    
    for item in document_chunks:
        chunk_text_lower = item["text"].lower()
        score = 0
        
        # Check explicit word matches
        for word in query_clean.split():
            if len(word) > 2 and word in chunk_text_lower:
                score += 3
                
        # Check conceptual synonyms matches
        for concept, terms in synonyms.items():
            if concept in query_clean:
                if any(term in chunk_text_lower for term in terms):
                    score += 5
                    
        if score > 0:
            scored_chunks.append((score, item["text"], item["source"]))
            
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    top_matches = []
    for score, text, source in scored_chunks[:top_k]:
        top_matches.append(f"📄 **Source File**: {source}\n> {text}")
        
    return "\n\n".join(top_matches)

@app.post("/api/upload", status_code=status.HTTP_201_CREATED)
async def upload_documents(files: List[UploadFile] = File(...)):
    processed_files = []
    
    for file in files:
        if not file.filename:
            continue
            
        try:
            file_bytes = await file.read()
            raw_text = extract_text_from_pdf(file_bytes)
            
            if not raw_text.strip():
                continue
                
            text_chunks = chunk_text(raw_text)
            
            for chunk in text_chunks:
                KB_VECTOR_STORE.append({
                    "text": chunk,
                    "source": file.filename
                })
                
            if file.filename not in INDEXED_FILES_REGISTRY:
                INDEXED_FILES_REGISTRY.append(file.filename)
            processed_files.append(file.filename)
            logger.info(f"Indexed: {file.filename} ({len(text_chunks)} chunks total)")
            
        except Exception as e:
            logger.error(f"Error indexing {file.filename}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Inbound processing failed.")
        finally:
            await file.close()
            
    return {"status": "success", "files": processed_files}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatQuery):
    clean_query = payload.query.strip()
    
    try:
        retrieved_context = evaluate_keyword_similarity(clean_query, KB_VECTOR_STORE, top_k=1)
        
        if retrieved_context:
            ai_answer = (
                f"### 🔍 Found Document Matching Context\n\n"
                f"{retrieved_context}\n\n"
                f"*Extracted instantly from local memory store buffers.*"
            )
        else:
            doc_count = len(INDEXED_FILES_REGISTRY)
            ai_answer = (
                f"I parsed your prompt: **\"{clean_query}\"**.\n\n"
                f"⚠️ Active index has **{doc_count} document(s)** registered, but no close content matches were identified. "
                f"If you recently restarted your terminal backend runner script, please drop your file into the sidebar uploader dropzone again to re-index its text text layers!"
            )
            
        return ChatResponse(response=ai_answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)