from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.models import ChatRequest, ChatResponse
import datetime

from app.database import SessionLocal, init_db, ChatMessage
from app.rag_pipeline import ingest_pdf_file, generate_rag_response

app = FastAPI(title="DocuMind AI Engine")

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Accepts a PDF document via HTTP, chunks it, and vectorizes it into ChromaDB."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        file_bytes = await file.read()
        num_chunks = ingest_pdf_file(file_bytes, file.filename)
        return {
            "status": "success", 
            "filename": file.filename, 
            "chunks_processed": num_chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest, db: Session = Depends(get_db)):
    """Handles stateful QA using structured JSON payloads."""
    try:
        # 1. Log the user's current question into SQLite using payload attributes
        user_record = ChatMessage(session_id=payload.session_id, sender="user", content=payload.message)
        db.add(user_record)
        db.commit()

        # 2. Run the RAG pipeline to get Gemini's contextual answer
        ai_response_text = generate_rag_response(db, payload.session_id, payload.message)

        # 3. Log Gemini's response into SQLite
        ai_record = ChatMessage(session_id=payload.session_id, sender="model", content=ai_response_text)
        db.add(ai_record)
        db.commit()

        return ChatResponse(session_id=payload.session_id, response=ai_response_text)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")