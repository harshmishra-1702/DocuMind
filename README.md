# 🧠 DocuMind AI - Corporate Knowledge RAG Engine

Smart, AI-powered Retrieval-Augmented Generation (RAG) assistant that allows users to upload documents (PDFs) and ask semantic questions to extract insights, summarize key details, and verify source information.

## 🚀 Tech Stack
* **Backend:** Python, FastAPI, Uvicorn
* **Frontend:** React (Vite), Tailwind CSS
* **AI/LLM:** Google Gemini API (via the `google-genai` SDK)
* **Document Parsing:** PyPDF

## ⚙️ Features
* 🧠 **AI-Powered RAG:** Synthesizes professional, bulleted responses from indexed corporate documents using Gemini.
* 📁 **Active Context Panel:** Real-time visibility of all indexed PDF documents in the chat sidebar.
* 🗑️ **Document Management:** Upload new documents or dynamically delete/un-index files from memory without server restarts.
* 💬 **Auto-Growing Input:** Modern, flexible chat input box that expands vertically to fit long messages, supporting standard `Enter` to send and `Shift + Enter` for new lines.
* 🎨 **Refined Aesthetic:** Premium light theme styled with an organic warm sage background, responsive side navigation, hover indicators, and custom clickable attributions.

## 📋 Prerequisites
Make sure you have the following installed on your local machine:
* Python 3.9+
* Node.js (v18+) and npm
* Git

## 🛠️ Setup and Installation

Follow these steps to run the DocuMind Engine locally.

### 1. Clone the Repository
```bash
git clone https://github.com/harshmishra-1702/DocuMind.git
cd DocuMind
```

### 2. Configure Environment Variables (Crucial 🔒)
For security reasons, API keys are not included in this repository. You must configure your own environment key.

1. Navigate to the `backend` directory.
2. Create a file named `.env` in `backend/` (this is ignored by Git).
3. Add your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
4. You can get a Gemini API Key by creating an account at Google AI Studio or 👉 [click here](https://aistudio.google.com/).

### 3. Run the Backend (FastAPI Server)
It is highly recommended to run the backend in an isolated Python environment.

```bash
cd backend
python -m venv venv
```

* **Activate on Windows:**
```bash
venv\Scripts\activate
```

* **Activate on Mac/Linux:**
```bash
source venv/bin/activate
```

* **Install Dependencies:**
```bash
pip install -r requirements.txt
pip install google-genai
```

* **Start the Server:**
```bash
python main.py
```
The backend API will start running on `http://127.0.0.1:8000`.

### 4. Run the Frontend (React + Vite)
Open a new terminal window or tab, navigate to the frontend directory, and start the development server.

```bash
cd frontend
npm install
npm run dev
```

🌐 **Open your web browser and navigate to the local address displayed (usually `http://localhost:5173/`) to start chatting with your documents!**

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).

---
Created with 💡 by [Harsh Mishra](https://www.linkedin.com/in/harshmishra1702/).
