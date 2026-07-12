import io
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from app.database import get_chat_history
from app.config import settings

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004", 
    google_api_key=settings.GEMINI_API_KEY
)

vector_store = Chroma(
    persist_directory=settings.VECTOR_STORE_DIR,
    embedding_function=embeddings
)

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

def ingest_pdf_file(file_bytes: bytes, filename: str):
    pdf_file = io.BytesIO(file_bytes)
    reader = PdfReader(pdf_file)
    raw_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            raw_text += text
            
    chunks = text_splitter.split_text(raw_text)
    
    metadatas = [{"source": filename} for _ in chunks]
    
    vector_store.add_texts(texts=chunks, metadatas=metadatas)
    return len(chunks)

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash", 
    google_api_key=settings.GEMINI_API_KEY,
    temperature=0.3 
)

def generate_rag_response(db_session, session_id: str, user_query: str) -> str:
    docs = vector_store.similarity_search(user_query, k=3)
    context_documents = "\n\n".join([d.page_content for d in docs])
    

    history_records = get_chat_history(db_session, session_id, limit=6)
    
    formatted_history = ""
    for msg in history_records:
        speaker = "User" if msg.sender == "user" else "AI"
        formatted_history += f"{speaker}: {msg.content}\n"
        

    system_prompt = (
        "You are an elite, highly precise AI Context Assistant. Your primary objective is to assist the user by answering "
        "their questions using ONLY the reference documents provided below. \n\n"
        "CRITICAL CONSTRAINTS:\n"
        "1. Grounding: Rely strictly on the facts present within the provided reference documents. Do not assume, extrapolate, "
        "or use external general knowledge not verified by the source text.\n"
        "2. Strict Refusal: If the answer cannot be found within the provided documents, state clearly: "
        "'I do not have access to that information within the currently uploaded materials.' Do not attempt to fabricate a response.\n"
        "3. Tone: Maintain a helpful, objective, and clear demeanor, adapting perfectly to the document style (e.g., educational, "
        "technical, or professional).\n\n"
        f"=== START REFERENCE DOCUMENTS ===\n{context_documents}\n=== END REFERENCE DOCUMENTS ===\n\n"
        f"=== START CONVERSATION HISTORY ===\n{formatted_history}=== END CONVERSATION HISTORY ===\n\n"
        f"Current User Question: {user_query}\n"
        "Precise Answer:"
    )
    
    response = llm.invoke(system_prompt)
    return response.content