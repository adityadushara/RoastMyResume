import os
import json
import time
import uuid
import asyncio
import random
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import fitz  # PyMuPDF
import docx
import io
from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel, Field, field_validator, model_validator


# Load environment variables
load_dotenv(override=True)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set in backend .env file")

# Initialize Gemini Client
client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI(title="Roast My Resume Backend")

# Enable CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas for Roasting ---
class RoastSectionSchema(BaseModel):
    title: str = Field(description="Name of the section in UPPERCASE, e.g., 'SUMMARY SECTION', 'SKILLS SECTION', 'EXPERIENCE SECTION', 'PROJECTS SECTION', 'EDUCATION SECTION'")
    claims: str = Field(description="Diagnosis: A neutral, 1-3 sentence summary/interpretation of what the candidate's resume claims or implies in this section. No roasting, just objective intent.")
    roast: str = Field(description="Fatal Flaws: A sharp, brutally honest, recruiter-style darkly funny/satirical observation explaining why this section is weak, unconvincing, generic, or ineffective.")

class RecruiterReportSchema(BaseModel):

    fake_quotes: list[str] = Field(description="Fake recruiter quotes")
    meme_one_liners: list[str] = Field(description="Meme-style one-liners")
    sections: list[RoastSectionSchema]

class RewriteRequest(BaseModel):
    original_text: str = Field(..., description="The original bullet point or text to rewrite")
    critique: str = Field(..., description="The critique or reason it needs to be fixed")

class RewriteResponse(BaseModel):
    suggestions: list[str] = Field(..., description="Exactly 3 distinct, high-impact professional rewrites for the resume text")

class RoastTextRequest(BaseModel):
    text: str = Field(..., description="The raw text of the resume to audit")

# --- Pydantic Schemas for Resume Changes ---
class ResumeChangeSection(BaseModel):
    section_name: str = Field(description="Must be one of: 'PROFESSIONAL SUMMARY', 'SKILLS', 'EXPERIENCE', 'PROJECTS', 'EDUCATION'")
    current_text: str = Field(description="Strictly what the candidate's resume currently says or lists for this section")
    recommended_change: str = Field(description="Professional, high-impact, and recruiter-optimized rewrite or layout for this section. If it is education, make improvements if needed.")
    why: str = Field(description="A direct, clear explanation of the weakness or ATS/recruiter issues in the current text")
    recruiter_impact: str = Field(description="The benefit or positive perception this change will trigger from hiring managers and recruiters")
    priority: str = Field(description="Priority label: Must be one of: '🔴 FIX IMMEDIATELY', '🟠 HIGH IMPACT', '🟡 RECOMMENDED', '🟢 OPTIONAL'")

class ResumeChangesResponse(BaseModel):
    top_5_changes: list[str] = Field(description="Exactly 5 highest-impact professional improvements to make right now")
    recruiter_insights: list[str] = Field(description="3-5 professional, direct recruiter insights about the candidate's presentation")
    sections: list[ResumeChangeSection] = Field(description="List of change analyses for Summary, Skills, Experience, Projects, and Education sections")

class ParallelRoastTextRequest(BaseModel):
    text: str = Field(..., description="The raw resume text to audit")




# --- Helper Functions ---
def _extract_retry_delay(e) -> Optional[float]:
    """Extracts the retry delay in seconds from a Google GenAI APIError if present."""
    if not hasattr(e, "details") or not isinstance(e.details, dict):
        return None
    
    error_dict = e.details.get("error", e.details)
    if not isinstance(error_dict, dict):
        return None
        
    details_list = error_dict.get("details", [])
    if not isinstance(details_list, list):
        return None
        
    for detail in details_list:
        if not isinstance(detail, dict):
            continue
        
        type_val = str(detail.get("@type", ""))
        if "rpc.RetryInfo" in type_val or "RetryInfo" in type_val:
            for key in ["retryDelay", "retry_delay"]:
                delay_str = detail.get(key, "")
                if delay_str:
                    try:
                        return float(str(delay_str).rstrip("sS"))
                    except ValueError:
                        pass
    return None


def generate_content_with_retry(contents, config=None, retries=3, delay=1.5):
    """
    Retries Gemini content generation in case of temporary 503 (Unavailable) or 429 (Rate Limit).
    Tries fallback models if the primary model fails.
    If a model hits a 429/quota error, we immediately switch to the next fallback model
    to maintain responsiveness instead of retrying the same model.
    """
    models = list(dict.fromkeys([
        GEMINI_MODEL,
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
    ]))
    last_err = None

    for model in models:
        current_delay = delay
        is_model_exhausted = False
        for attempt in range(retries):
            try:
                if config:
                    return client.models.generate_content(
                        model=model,
                        contents=contents,
                        config=config
                    )
                else:
                    return client.models.generate_content(
                        model=model,
                        contents=contents
                    )
            except Exception as e:
                last_err = e
                err_msg = str(e).upper()
                
                # Check for 429/Resource Exhausted / Quota Limits
                is_quota_error = False
                if isinstance(e, APIError):
                    if e.code == 429 or getattr(e, "status", "") == "RESOURCE_EXHAUSTED":
                        is_quota_error = True
                if not is_quota_error and any(term in err_msg for term in ["429", "RESOURCE_EXHAUSTED", "QUOTA", "LIMIT"]):
                    is_quota_error = True
                
                if is_quota_error:
                    print(f"Gemini API rate/quota limit hit for '{model}' (attempt {attempt + 1}/{retries}): {e}. Trying fallback model...")
                    is_model_exhausted = True
                    break

                # Check if the model itself is unavailable/not found — skip to next fallback
                is_model_unavailable = False
                if isinstance(e, APIError):
                    if e.code in (404, 400):
                        is_model_unavailable = True
                if not is_model_unavailable and any(term in err_msg for term in ["404", "NOT_FOUND", "NOT FOUND"]):
                    is_model_unavailable = True

                if is_model_unavailable:
                    print(f"Model '{model}' not available (404/400). Skipping to next fallback...")
                    is_model_exhausted = True
                    break

                # Check for other retryable temporary errors (like 503, connection issues)
                if any(term in err_msg for term in ["503", "UNAVAILABLE", "CONNECTION", "REMOTEDISCONNECTED", "ABORTED", "500", "502"]):
                    print(f"Gemini API temporary error for model '{model}' (attempt {attempt + 1}/{retries}): {err_msg}. Retrying in {current_delay}s...")
                    time.sleep(current_delay)
                    current_delay *= 2  # Exponential backoff
                else:
                    # Non-retryable error (e.g. bad request payload), raise immediately
                    raise e
        
        if is_model_exhausted:
            print(f"Model '{model}' is exhausted (quota/rate limit). Trying next fallback...")
        else:
            print(f"Model '{model}' failed all retry attempts. Trying next fallback...")

    # If we exhausted all fallback models, raise a clean HTTPException if it's a quota issue
    err_msg = str(last_err).upper()
    is_quota_error = False
    if isinstance(last_err, APIError):
        if last_err.code == 429 or getattr(last_err, "status", "") == "RESOURCE_EXHAUSTED":
            is_quota_error = True
    if not is_quota_error and any(term in err_msg for term in ["429", "RESOURCE_EXHAUSTED", "QUOTA", "LIMIT"]):
        is_quota_error = True

    if is_quota_error:
        delay_secs = _extract_retry_delay(last_err)
        if delay_secs:
            detail_msg = f"Gemini API quota or rate limit exceeded. Please try again in {int(delay_secs)} seconds."
        else:
            detail_msg = "Gemini API rate limit or quota exceeded. Please try again in a few moments, or check your API key / plan details."
        raise HTTPException(status_code=429, detail=detail_msg)

    raise last_err

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "Roast My Resume API"}

@app.post("/roast")
async def roast_resume(file: UploadFile = File(...)):
    filename_lower = file.filename.lower()
    if filename_lower.endswith(".doc"):
        raise HTTPException(status_code=400, detail="Legacy .doc files are not supported. Please save as .docx or .pdf.")
    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    try:
        file_bytes = await file.read()
        text = ""
        
        if filename_lower.endswith(".pdf"):
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text()
            doc.close()
        elif filename_lower.endswith(".docx"):
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from the file. The file may be empty or contain only scanned images."
            )

        report_prompt = _build_roast_prompt(text)

        report_response = generate_content_with_retry(
            contents=report_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RecruiterReportSchema,
                temperature=0.92,
            )
        )
        
        report_data = json.loads(report_response.text)
        
        return {
            **report_data,
            "text": text
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the resume: {str(e)}"
        )

@app.post("/roast-text")
async def roast_resume_text(request: RoastTextRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")

    try:
        report_prompt = _build_roast_prompt(request.text)

        report_response = generate_content_with_retry(
            contents=report_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RecruiterReportSchema,
                temperature=0.92,
            )
        )
        
        report_data = json.loads(report_response.text)
        
        return {
            **report_data,
            "text": request.text
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the resume: {str(e)}"
        )

@app.post("/rewrite", response_model=RewriteResponse)
async def rewrite_resume_text(request: RewriteRequest):
    if not request.original_text.strip():
        raise HTTPException(status_code=400, detail="Original text cannot be empty.")

    try:
        rewrite_prompt = (
            "You are an expert technical resume writer and career coach.\n"
            "Your job is to rewrite the original resume bullet point/text to resolve the critique and make it sound extremely professional, impactful, and technically competent.\n"
            "Rules:\n"
            "- Keep the rewrites direct, clear, and result-oriented.\n"
            "- Use active verbs and specify technical achievements or context.\n"
            "- Generate exactly 3 distinct alternative suggestions.\n\n"
            f"Original resume text: \"{request.original_text}\"\n"
            f"Critique / Fix required: \"{request.critique}\""
        )

        rewrite_response = generate_content_with_retry(
            contents=rewrite_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RewriteResponse,
                temperature=0.9,
            )
        )
        
        rewrite_data = json.loads(rewrite_response.text)
        return rewrite_data

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while rewriting the text: {str(e)}"
        )

def _run_resume_changes_sync(text: str) -> dict:
    """Synchronous resume changes analysis — runs in thread pool."""
    prompt = (
        "You are an elite, brutally honest but professional career auditor who combines the perspectives of "
        "a Senior Recruiter, Hiring Manager, ATS Expert, and Staff Engineer.\n"
        "Your task is to analyze the candidate's raw resume text and provide a professional improvement report.\n\n"
        "STRICT RULES:\n"
        "- Do NOT roast, use humor, or use sarcasm. Be direct, recruiter-focused, practical, and highly actionable.\n"
        "- Generate the top 5 highest-impact professional changes the candidate should make right now.\n"
        "- Provide 3-5 recruiter insights assessing positioning, stack credibility, and presentation.\n"
        "- For each of the five standard sections (PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION):\n"
        "  1. Extract what the current resume says (in current_text).\n"
        "  2. Provide a recommended change representing a stronger, professional rewrite or layout (in recommended_change).\n"
        "  3. Explain the weakness or reasoning behind this recommendation (in why).\n"
        "  4. Explain how this change benefits their perception from recruiters/hiring managers (in recruiter_impact).\n"
        "  5. Assign a priority: '🔴 FIX IMMEDIATELY' | '🟠 HIGH IMPACT' | '🟡 RECOMMENDED' | '🟢 OPTIONAL'.\n"
        "- If a section does not exist in the resume, construct the recommended section from the resume's text or specify that they need to add it.\n\n"
        f"Resume Text:\n{text}\n\n"
        "Return valid JSON matching ResumeChangesResponse."
    )
    response = generate_content_with_retry(
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ResumeChangesResponse,
            temperature=0.35,
        )
    )
    return json.loads(response.text)


@app.post("/roast-parallel")
async def roast_resume_parallel(file: UploadFile = File(...)):
    """
    Parses PDF/DOCX, then fires roast + changes analysis CONCURRENTLY via asyncio.gather.
    Returns { sections, text, changes } in a single response.
    """
    filename_lower = file.filename.lower()
    if filename_lower.endswith(".doc"):
        raise HTTPException(status_code=400, detail="Legacy .doc files are not supported. Please save as .docx or .pdf.")
    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    try:
        file_bytes = await file.read()
        text = ""
        
        if filename_lower.endswith(".pdf"):
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text += page.get_text()
            doc.close()
        elif filename_lower.endswith(".docx"):
            doc = docx.Document(io.BytesIO(file_bytes))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])

        if not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract text from the file. It may be empty or image-only."
            )

        # Fire roast + changes analysis concurrently in thread pool
        roast_result, changes_result = await asyncio.gather(
            asyncio.to_thread(_run_roast_sync, text),
            asyncio.to_thread(_run_resume_changes_sync, text),
        )

        return {
            **roast_result,
            "text": text,
            "changes": changes_result,
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing the resume: {str(e)}"
        )


@app.post("/roast-text-parallel")
async def roast_resume_text_parallel(request: ParallelRoastTextRequest):
    """
    Fires roast + changes analysis CONCURRENTLY from raw text.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Resume text cannot be empty.")

    try:
        roast_result, changes_result = await asyncio.gather(
            asyncio.to_thread(_run_roast_sync, request.text),
            asyncio.to_thread(_run_resume_changes_sync, request.text),
        )

        return {
            **roast_result,
            "text": request.text,
            "changes": changes_result,
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during parallel processing: {str(e)}"
        )


def _build_roast_prompt(text: str) -> str:
    """
    Builds a roast prompt with randomized humor persona, structural format, and
    writing rhythm — so the same resume produces a genuinely different roast every time.
    """
    variation_id = str(uuid.uuid4())[:8]

    # ── Pool of distinct humor personas ──────────────────────────────────────
    PERSONAS = [
        (
            "recruiter exhaustion",
            "You are a senior technical recruiter who has reviewed 12,000 resumes this quarter. "
            "You are deeply, professionally tired. Your notes are sharp, dry, and contain the "
            "quiet despair of someone who has seen this exact resume 400 times under different names."
        ),
        (
            "startup satire",
            "You are a VC associate at a Series-A firm who reads startup founder pitch decks for sport. "
            "You find corporate resume language deeply funny in an exhausted way. "
            "Your observations expose the delta between what candidates claim and what they actually shipped."
        ),
        (
            "senior engineer disappointment",
            "You are a principal engineer who agreed to review resumes as a 'favor'. "
            "You write with the quiet, measured disappointment of someone who has seen beautiful "
            "systems destroyed by engineers who listed those exact same skills."
        ),
        (
            "corporate dystopia",
            "You are an internal performance review AI at a megacorporation, generating a leaked "
            "Talent Acquisition Probability Assessment. Your tone is clinical, bureaucratic, and "
            "accidentally terrifying. You use corporate jargon like a weapon."
        ),
        (
            "Black Mirror narration",
            "You are a cold, omniscient AI narrator from a near-future episode about automated hiring. "
            "Your commentary is precise, slightly ominous, and reveals uncomfortable truths about "
            "what a candidate's resume signals to algorithmic gatekeepers."
        ),
        (
            "internal Slack leak",
            "You are a senior engineering director whose brutally honest Slack messages to a trusted "
            "colleague about this candidate just got leaked. Your voice is casual, specific, and "
            "devastating in the way only off-the-record honesty can be."
        ),
        (
            "AI psychological profiling",
            "You are an advanced behavioral analytics AI that reverse-engineers a candidate's psychology "
            "from their resume choices — word selection, metric specificity, skill list anxiety, and "
            "project naming conventions. Your analysis is uncomfortably accurate."
        ),
        (
            "git commit commentary",
            "You are a code reviewer who treats this resume like a messy pull request. "
            "You reference vague commit messages, force-pushes to main, and files named 'final_v3_FINAL.doc'. "
            "Your tone is that of a reviewer who writes 'nit:' before everything but means every word."
        ),
        (
            "existential developer humor",
            "You are a developer who has survived too many sprint retrospectives, architectural pivots, "
            "and 'quick calls'. Your roast has the weary philosophical quality of someone who has "
            "stared into the backlog and had the backlog stare back."
        ),
        (
            "hacker culture",
            "You are an old-school systems programmer who finds the performative nature of modern tech "
            "resumes deeply absurd. Your commentary is terse, specific, and operates on the assumption "
            "that anyone who lists 'proficient in Linux' has never compiled a kernel."
        ),
    ]

    # ── Structural format variations ──────────────────────────────────────────
    STRUCTURES = [
        "For each section: write the title, then what the resume claims (1-2 tight sentences), then your roast observation (2-3 sentences, punchy and specific).",
        "For each section: state the title, then open with your sharpest observation as a single declarative sentence, then expand on what the claims reveal (2 sentences).",
        "For each section: name it, then state the claims concisely, then deliver the critique as a short paragraph with one killer final sentence.",
        "For each section: title first. Then a 1-sentence claim summary. Then a roast structured as: setup observation → specific callout → devastating conclusion.",
        "For each section: identify it, summarize what the candidate communicates (1 sentence), then respond with 2-3 sentences of increasing specificity and wit.",
    ]

    # ── Rhythm/tone modifiers ─────────────────────────────────────────────────
    RHYTHMS = [
        "Use short sentences. Punctuate with silence. Let irony breathe.",
        "Write in longer, flowing sentences that build to a precise, cutting final observation.",
        "Mix terse declarations with longer analytical asides. Vary your paragraph rhythm deliberately.",
        "Use dry understatement. Say the most damning things in the most neutral voice possible.",
    ]

    # Pick randomly, seeded by variation_id for reproducibility within one request
    rng = random.Random(variation_id)
    persona_name, persona_desc = rng.choice(PERSONAS)
    structure = rng.choice(STRUCTURES)
    rhythm = rng.choice(RHYTHMS)

    return (
        f"{persona_desc}\n\n"
        f"TASK: Generate a leaked recruiter intelligence dossier for the resume below. Enable MAXIMUM DARK HUMOR mode.\n"
        f"HUMOR GUIDELINES: Brutally roast the resume with sharp, sarcastic, internet-style humor. Focus on weak achievements, empty buzzwords, generic projects, skill inflation, poor formatting, unrealistic career claims, and 'LinkedIn influencer' behavior. Make the roast progressively funnier as it goes. The humor should feel like a mix of a stand-up comedian, a ruthless recruiter, and a sarcastic friend reviewing the resume at 2 AM. Include meme-style one-liners.\n"
        f"SAFETY RULES: Never generate hate speech, discrimination, harassment, threats, self-harm content, or attacks on protected characteristics. Roast only the resume content and career choices, not the person's identity. Remain clearly comedic.\n"
        f"STRUCTURE: {structure} Also provide Fake recruiter quotes, and Meme-style one-liners.\n"
        f"STYLE: {rhythm}\n"
        f"RULES: Psychologically accurate. Painfully specific. Expose real weaknesses, over-compensations, and keyword dependencies.\n"
        f"[ID: {variation_id} | Persona: {persona_name}] Return valid JSON matching RecruiterReportSchema.\n\n"
        f"Resume:\n{text}"
    )


def _run_roast_sync(text: str) -> dict:
    """Synchronous roast generation — runs in thread pool."""
    prompt = _build_roast_prompt(text)
    response = generate_content_with_retry(
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RecruiterReportSchema,
            temperature=0.92,
        )
    )
    return json.loads(response.text)



