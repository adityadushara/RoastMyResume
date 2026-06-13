# Roast My Resume 🔥

An AI-powered resume roasting tool that delivers brutally honest, darkly humorous feedback on your resume — plus actionable professional improvements. Upload your resume and get a full recruiter-style audit with sharp commentary, meme one-liners, and concrete rewrite suggestions.

## Tech Stack

**Frontend** — Next.js 16, React 19, Tailwind CSS 4, Framer Motion  
**Backend** — FastAPI, Google Gemini AI (genai), PyMuPDF, python-docx  

## Features

- Upload PDF or DOCX resumes for instant AI analysis
- Brutally funny roast with randomized humor personas
- Section-by-section breakdown (Summary, Skills, Experience, Projects, Education)
- Professional rewrite suggestions for weak bullet points
- Parallel processing for roast + improvement analysis
- Fake recruiter quotes and meme-style one-liners
- Export/share results

## Project Structure

```
├── be/             # FastAPI backend
│   ├── main.py     # API routes and Gemini integration
│   └── .env        # Backend environment variables
├── fe/             # Next.js frontend
│   ├── src/
│   │   ├── app/        # Pages and layouts
│   │   └── components/ # Shared components
│   └── .env.local      # Frontend environment variables
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Backend Setup

```bash
cd be
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

Create a `.env` file in `be/`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Start the backend:

```bash
uvicorn main:app --reload
```

The API runs at `http://localhost:8000`.

### Frontend Setup

```bash
cd fe
npm install
```

Create a `.env.local` file in `fe/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/roast` | Upload PDF/DOCX for roast |
| POST | `/roast-text` | Submit raw text for roast |
| POST | `/roast-parallel` | Upload file for roast + changes (concurrent) |
| POST | `/roast-text-parallel` | Submit text for roast + changes (concurrent) |
| POST | `/rewrite` | Get 3 professional rewrites for a bullet point |

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | `be/.env` | Google Gemini API key |
| `GEMINI_MODEL` | `be/.env` | Gemini model name (default: `gemini-2.5-flash`) |
| `NEXT_PUBLIC_API_URL` | `fe/.env.local` | Backend API URL |

## License

MIT
