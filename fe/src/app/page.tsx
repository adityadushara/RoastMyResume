"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  AlertCircle,
  FileText,
  MessageSquare,
  Search,
  CheckSquare,
  Star,
  Lock,
  Quote,
  CheckCircle2,
  XCircle,
  Clock,
  Briefcase,
  Zap,
  TrendingUp,
  FileQuestion,
  FileSearch
} from "lucide-react";
import Navbar from "@/components/Navbar";

const LOADING_STAGES = [
  "Parsing document structure…",
  "Reviewing skills and keywords…",
  "Evaluating timeline consistency…",
  "Analysing experience signals…",
  "Generating executive summary…",
  "Compiling recruiter recommendations…",
  "Finalising your review report…",
];

export default function LandingPage() {
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsgIdx, setUploadMsgIdx] = useState(0);

  const uploadRef = useRef<HTMLDivElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (uploadLoading) {
      interval = setInterval(() => {
        setUploadMsgIdx((prev) => (prev + 1) % LOADING_STAGES.length);
      }, 1800);
    } else {
      setUploadMsgIdx(0);
    }
    return () => clearInterval(interval);
  }, [uploadLoading]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);
    const file = e.dataTransfer.files[0];
    if (file) {
      const isPDF = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      const isDOCX = file.name.toLowerCase().endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (!isPDF && !isDOCX) {
        setError("Please upload a PDF or DOCX resume.");
        return;
      }
      launchProcessing(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const isPDF = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      const isDOCX = file.name.toLowerCase().endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      if (!isPDF && !isDOCX) {
        setError("Please upload a PDF or DOCX resume.");
        return;
      }
      launchProcessing(file);
    }
  };

  const launchProcessing = async (file: File) => {
    setUploadLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${apiUrl}/roast-parallel`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to process the resume. Is the API running?");
        setUploadLoading(false);
        return;
      }

      const result = await response.json();
      localStorage.setItem("roast_results", JSON.stringify(result));
      localStorage.setItem("roast_filename", file.name);

      router.push("/results");
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "An unexpected error occurred.");
      setUploadLoading(false);
    }
  };

  const scrollToUpload = () => {
    if (uploadRef.current) {
      uploadRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (uploadLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#050505] text-[var(--text)] relative overflow-hidden">
        <Navbar />
        {/* Tech Grid Background (simulated using radial gradients or a pattern) */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)]" style={{ backgroundSize: '24px 24px' }} />
        
        <main className="flex-grow flex flex-col items-center justify-center p-8 relative z-10">
          {/* Background Pulsing Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#8B5CF6] opacity-[0.05] blur-[150px] rounded-full animate-pulse pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
            className="w-full max-w-md flex flex-col items-center text-center p-12 card bg-[rgba(13,16,24,0.7)] backdrop-blur-2xl border-[rgba(139,92,246,0.3)] shadow-[0_0_60px_rgba(139,92,246,0.15)] relative overflow-hidden group"
          >
            {/* Animated scanning line */}
            <motion.div 
              className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent opacity-70"
              animate={{ y: [0, 500, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />

            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-[#8B5CF6] opacity-30 blur-2xl rounded-full animate-pulse" />
              <div className="relative z-10 w-20 h-20 bg-gradient-to-br from-[rgba(139,92,246,0.2)] to-[rgba(168,85,247,0.05)] border border-[rgba(139,92,246,0.4)] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                <FileSearch className="w-10 h-10 text-[#A855F7] animate-pulse" />
              </div>
            </div>

            <h3 className="font-display font-bold text-2xl mb-3 text-white tracking-wide">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#A855F7]">Auditing</span> Resume
            </h3>

            <div className="h-6 mb-10 overflow-hidden w-full relative">
              <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[rgba(13,16,24,0.7)] to-transparent z-10"></div>
              <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[rgba(13,16,24,0.7)] to-transparent z-10"></div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={uploadMsgIdx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="text-[15px] font-medium text-[var(--text-2)] whitespace-nowrap"
                >
                  {LOADING_STAGES[uploadMsgIdx]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="w-full rounded-full overflow-hidden h-2.5 bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.05)] shadow-inner relative p-[1px]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] shadow-[0_0_20px_rgba(139,92,246,0.8)]"
                initial={{ width: "0%" }}
                animate={{ width: "95%" }}
                transition={{ duration: 18, ease: "easeOut" }}
              />
            </div>
            
            <p className="mt-5 text-[11px] font-bold text-[#8B5CF6] uppercase tracking-[0.2em] opacity-80 animate-pulse">
              Running Diagnostic
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-[var(--text)] selection:bg-[#8B5CF6]/30">
      <Navbar />

      <main className="flex-grow w-full overflow-hidden flex flex-col justify-center">

        {/* HERO SECTION */}
        <section className="relative pt-20 pb-8 px-6 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">

          {/* Dynamic Background Glows */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <motion.div 
              animate={{ x: [0, 100, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-[#8B5CF6] opacity-[0.08] blur-[120px] rounded-full" 
            />
            <motion.div 
              animate={{ x: [0, -100, 0], y: [0, 50, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 2 }}
              className="absolute bottom-[20%] right-[20%] w-[600px] h-[600px] bg-[#6366F1] opacity-[0.06] blur-[140px] rounded-full" 
            />
            <motion.div 
              animate={{ x: [0, 50, 0], y: [0, 100, 0], scale: [1, 0.9, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 4 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#EC4899] opacity-[0.05] blur-[100px] rounded-full" 
            />
          </div>

          {/* Left Side: Text */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left z-10 w-full max-w-2xl lg:mb-0 mb-10">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] backdrop-blur-sm"
            >
              <span className="text-[#A855F7] font-semibold text-sm">Roast My Resume</span>
              <span className="text-[var(--text-3)] text-sm">v2.0</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="font-display font-bold text-5xl md:text-7xl leading-[1.1] mb-6 text-white tracking-tight"
            >
              Your Resume Has <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#6366F1]">
                Problems.
              </span><br className="hidden lg:block"/> We'll Find Them.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg md:text-xl text-[var(--text-2)] max-w-xl mb-12"
            >
              Upload your resume and get a brutally honest recruiter-grade analysis, ATS review, and actionable fixes in under 30 seconds.
            </motion.p>

            {/* SOCIAL PROOF BAR */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center lg:items-start gap-3"
            >
              <div className="flex gap-1 text-[#F59E0B]">
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
                <Star className="w-5 h-5 fill-current" />
              </div>
              <p className="text-sm text-[var(--text-3)] font-medium">
                10,000+ resumes brutally audited
              </p>
            </motion.div>
          </div>

          {/* UPLOAD SECTION (FOCAL POINT) */}
          <motion.div
            ref={uploadRef}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-full lg:w-[480px] shrink-0 relative z-10"
          >
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                card p-14 text-center cursor-pointer transition-all duration-300 relative overflow-hidden group
                ${isDragOver ? "bg-[rgba(139,92,246,0.08)] border-[#8B5CF6]" : "bg-[rgba(13,16,24,0.6)] backdrop-blur-xl border-[rgba(255,255,255,0.08)]"}
                hover:bg-[rgba(139,92,246,0.03)]
                animate-border-glow
              `}
              style={{
                borderRadius: '24px',
              }}
            >
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="absolute inset-0 bg-gradient-to-b from-[rgba(139,92,246,0.05)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="mb-6 w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] group-hover:border-[#8B5CF6] group-hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                <Upload className="w-8 h-8 text-[#8B5CF6] group-hover:text-white transition-colors" />
              </div>

              <h3 className="text-2xl font-display font-semibold text-white mb-3">
                Drag & Drop Resume
              </h3>

              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="h-[1px] w-12 bg-[rgba(255,255,255,0.1)]"></span>
                <span className="text-sm text-[var(--text-3)] font-medium">OR</span>
                <span className="h-[1px] w-12 bg-[rgba(255,255,255,0.1)]"></span>
              </div>

              <label
                htmlFor="resume-upload"
                className="btn-primary mb-6 pointer-events-none text-base px-8 py-3 h-auto"
              >
                Browse Files
              </label>

              <div className="flex items-center justify-center gap-4 text-sm text-[var(--text-3)]">
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> PDF or DOCX</span>
                <span className="w-1 h-1 rounded-full bg-[rgba(255,255,255,0.2)]"></span>
                <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> Your resume is never stored</span>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mt-6"
                >
                  <div className="p-4 rounded-xl flex items-start gap-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)]">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#EF4444]" />
                    <p className="text-sm font-medium text-[#EF4444]">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

      </main>
    </div>
  );
}
