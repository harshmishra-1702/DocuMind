import io
import os
import logging
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pypdf import PdfReader
from google import genai
from google.genai import types
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DocuMindRAG")

load_dotenv()

app = FastAPI(title="DocuMind Chatbot RAG Engine", version="1.4.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SYSTEM_API_KEY = os.environ.get("GEMINI_API_KEY")

ai_client = None
if SYSTEM_API_KEY:
    try:
        ai_client = genai.Client()
        logger.info("✅ Gemini GenAI Client successfully initialized from local .env environment.")
    except Exception as e:
        logger.error(f"❌ Critical initialization failure: {str(e)}")
else:
    logger.error("❌ CRITICAL: GEMINI_API_KEY not found in local .env file.")


class ChatQuery(BaseModel):
    query: str = Field(..., min_length=1)

class ChatResponse(BaseModel):
    response: str
    status: str = "success"


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
        logger.error(f"Error reading PDF layers: {str(e)}")
        return ""

def chunk_text(text: str, chunk_size: int = 400, overlap: int = 80) -> List[str]:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks

def retrieve_relevant_context(query: str, store: List[Dict[str, str]], top_k: int = 3) -> str:
    if not store:
        return ""
    query_tokens = set(query.lower().split())
    matches = []
    for item in store:
        chunk_lower = item["text"].lower()
        score = sum(1 for token in query_tokens if token in chunk_lower)
        if score > 0:
            matches.append((score, item["text"]))
    matches.sort(key=lambda x: x[0], reverse=True)
    return "\n\n---\n\n".join([text for score, text in matches[:top_k]])


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
                KB_VECTOR_STORE.append({"text": chunk, "source": file.filename})
                
            if file.filename not in INDEXED_FILES_REGISTRY:
                INDEXED_FILES_REGISTRY.append(file.filename)
            processed_files.append(file.filename)
            logger.info(f"Successfully indexed file: {file.filename} ({len(text_chunks)} chunks)")
            
        except Exception as e:
            logger.error(f"Upload error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to process file {file.filename}")
        finally:
            await file.close()
            
    return {"status": "success", "files": processed_files}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatQuery):
    if not ai_client:
        return ChatResponse(response="⚠️ Backend Gemini Client is uninitialized. Please check your local `.env` configuration file.")

    clean_query = payload.query.strip()
    
    try:
        context = retrieve_relevant_context(clean_query, KB_VECTOR_STORE, top_k=3)
        
        system_instruction = (
            "You are DocuMind AI, a friendly, conversational, and expert corporate knowledge assistant. "
            "Your goal is to answer the user's question like a helpful colleague in a messaging chat application.\n\n"
            "CRITICAL CONSTRAINTS:\n"
            "1. NEVER copy-paste large blocks or paragraphs of text verbatim from the context. Always synthesize and rephrase in your own words.\n"
            "2. Actively mention the explicit section numbers or titles (e.g., 'According to Section 15.0...' ) only when they are present in the text to justify your response.\n"
            "3. Structure your response using crisp bullet points, clean bold terms, and brief readable paragraphs.\n"
            "4. Maintain a supportive, direct, and collaborative tone.\n"
            "5. If the document context does not contain the information needed to answer, politely explain that the currently uploaded files don't have a mention about it."
        )
        
        prompt = (
            f"Here is the context data pulled from the company documentation files:\n"
            f"==================================================\n"
            f"{context if context else 'No document context loaded.'}\n"
            f"==================================================\n\n"
            f"User Question: {clean_query}\n"
            f"Chatbot Response:"
        )

        response = ai_client.models.generate_content(
            model='gemini-3.1-flash-lite', 
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3
            )
        )
        
        return ChatResponse(response=response.text)
        
    except Exception as e:
        logger.error(f"Gemini Inference Failure: {str(e)}")
        return ChatResponse(response=f"⚠️ Gemini API Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)