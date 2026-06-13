"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Check,
  FileText,
  Upload,
  AlertCircle,
  X,
  RefreshCw,
  Activity,
  ShieldAlert,
  User,
  Wrench,
  Briefcase,
  FolderDot,
  GraduationCap,
  PlusCircle,
  Eye,
  Zap,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  Target,
  Search,
  Quote,
  AlertOctagon,
  BrainCircuit
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

interface RoastSection {
  title: string;
  claims: string;
  roast: string;
}

interface ResumeChangeSection {
  section_name: string;
  current_text: string;
  recommended_change: string;
  why: string;
  recruiter_impact?: string;
  priority: string;
}

interface ResumeChangesData {
  top_5_changes: string[];
  recruiter_insights: string[];
  sections: ResumeChangeSection[];
}

interface RoastResult {

  fake_quotes?: string[];
  meme_one_liners?: string[];
  sections: RoastSection[];
  text: string;
  changes?: ResumeChangesData;
}

const getSectionIconProps = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("profile") || t.includes("summary")) return { icon: User, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" }; // Purple
  if (t.includes("skill")) return { icon: Wrench, color: "#3B82F6", bg: "rgba(59,130,246,0.1)" }; // Blue
  if (t.includes("experience") || t.includes("work")) return { icon: Briefcase, color: "#06B6D4", bg: "rgba(6,182,212,0.1)" }; // Cyan
  if (t.includes("project")) return { icon: FolderDot, color: "#EC4899", bg: "rgba(236,72,153,0.1)" }; // Pink
  if (t.includes("education")) return { icon: GraduationCap, color: "#F59E0B", bg: "rgba(245,158,11,0.1)" }; // Amber
  return { icon: PlusCircle, color: "#10B981", bg: "rgba(16,185,129,0.1)" }; // Green
};

const getTimelineLabel = (idx: number) => {
  const labels = ["Today", "This Week", "This Month", "Future"];
  return labels[idx % labels.length];
};

const generateScore = (text: string, base: number) => {
  const hash = text.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  return Math.min(98, Math.max(45, base + (Math.abs(hash) % 25)));
};

export default function ResultsPage() {
  const router = useRouter();

  const [roastData, setRoastData] = useState<RoastResult | null>(null);
  const [resumeChanges, setResumeChanges] = useState<ResumeChangesData | null>(null);
  const [filename, setFilename] = useState<string>("resume.pdf");
  const [resumeText, setResumeText] = useState("");

  const [roastLoading, setRoastLoading] = useState(false);
  const [changesLoading, setChangesLoading] = useState(false);
  const [loadingStageIdx, setLoadingStageIdx] = useState(0);

  const [activeTab, setActiveTab] = useState<"report" | "changes">("report");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);



  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    let iv: NodeJS.Timeout;
    if (roastLoading || changesLoading) {
      iv = setInterval(() => {
        setLoadingStageIdx((p) => (p + 1) % LOADING_STAGES.length);
      }, 1800);
    } else {
      setLoadingStageIdx(0);
    }
    return () => clearInterval(iv);
  }, [roastLoading, changesLoading]);

  useEffect(() => {
    const rawData = localStorage.getItem("roast_results");
    const name = localStorage.getItem("roast_filename");
    if (!rawData) { router.push("/"); return; }
    try {
      const parsed = JSON.parse(rawData) as RoastResult;
      setRoastData(parsed);
      if (name) setFilename(name);
      if (parsed.text) setResumeText(parsed.text);
      if (parsed.changes) {
        setResumeChanges(parsed.changes);
      } else if (parsed.text) {
        fetchChanges(parsed.text);
      }
    } catch (_) {
      router.push("/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchChanges = async (text: string) => {
    setChangesLoading(true);
    try {
      const res = await fetch(`${apiUrl}/roast-text-parallel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const result = await res.json();
        setResumeChanges(result.changes);
        localStorage.setItem("roast_results", JSON.stringify(result));
      }
    } catch (err) {
      console.error("Failed to fetch changes", err);
    } finally {
      setChangesLoading(false);
    }
  };

  const handleCopy = () => {
    if (!roastData?.sections?.length) return;
    const quote = roastData.sections[0].roast;
    navigator.clipboard.writeText(quote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startOver = () => {
    localStorage.removeItem("roast_results");
    localStorage.removeItem("roast_filename");
    router.push("/");
  };

  const handleReAudit = async () => {
    if (!resumeText.trim()) return;
    setRoastLoading(true);
    setChangesLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/roast-text-parallel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: resumeText }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Failed to re-analyse.");
      }
      const result = await res.json() as RoastResult;
      localStorage.setItem("roast_results", JSON.stringify(result));
      setRoastData(result);
      if (result.changes) setResumeChanges(result.changes);
      setRoastLoading(false);
      setChangesLoading(false);
    } catch (err: any) {
      setError(err.message || "Re-analysis failed.");
      setRoastLoading(false);
      setChangesLoading(false);
    }
  };



  if (roastLoading && !roastData) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-center p-8">
           <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md flex flex-col items-center text-center p-12 card"
          >
            <div className="mb-6 text-[var(--accent)] bg-[rgba(139,92,246,0.1)] p-4 rounded-2xl">
              <FileText className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="font-display font-medium text-[18px] mb-2 text-[var(--text)]">
              Analyzing Document
            </h3>
            <div className="h-6 mb-8 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStageIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="text-[14px] font-medium text-[var(--text-2)]"
                >
                  {LOADING_STAGES[loadingStageIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="w-full rounded-full overflow-hidden h-[4px] bg-[rgba(255,255,255,0.05)]">
              <motion.div
                className="h-full rounded-full bg-[var(--accent)]"
                initial={{ width: "0%" }}
                animate={{ width: "95%" }}
                transition={{ duration: 18, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />

      <main className="flex-grow w-[92%] max-w-[1400px] mx-auto py-12">

        {/* Result Header */}
        <header className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
            <button
              onClick={startOver}
              className="flex items-center justify-center w-10 h-10 rounded-[12px] transition-all bg-[var(--surface-sec)] border border-[var(--border)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[var(--border-hover)]"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
               <p className="text-[14px] font-medium text-[var(--text-3)] mb-1">{filename}</p>
               <h1 className="font-display font-semibold text-[48px] text-[var(--text)] tracking-tight leading-none">
                 Analysis Results
               </h1>
            </div>
           </div>

        </header>

        {/* Tabs */}
        <div className="flex items-center gap-8 mb-10 border-b border-[var(--border)] relative">
           {[
             { id: "report", label: "Resume Analysis", loading: roastLoading && !!roastData },
             { id: "changes", label: "Recommended Changes", loading: changesLoading }
           ].map(tab => {
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)}
                 className={`relative pb-4 text-[15px] font-semibold transition-colors ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-2)] hover:text-[var(--text)]'}`}
               >
                 {tab.loading ? (
                    <span className="flex items-center gap-2">
                       <RefreshCw className="w-4 h-4 animate-spin" /> {tab.label}
                    </span>
                 ) : (
                    tab.label
                 )}
                 {isActive && (
                   <motion.div
                     layoutId="tab-indicator"
                     className="tab-active-bar h-[2px] rounded-t-md"
                     initial={false}
                     transition={{ type: "spring", stiffness: 400, damping: 30 }}
                   />
                 )}
               </button>
             );
           })}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-[16px] flex items-start justify-between gap-4 bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.15)]"
          >
             <div className="flex items-start gap-3">
               <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[var(--red)]" />
               <p className="text-[15px] font-medium text-[var(--red)]">{error}</p>
             </div>
             <button onClick={handleReAudit} className="text-[14px] font-medium text-[var(--text)] hover:underline">Retry</button>
          </motion.div>
        )}

        {/* ─── RESUME ANALYSIS TAB (DEEP SECTION AUDIT) ─── */}
        <AnimatePresence mode="wait">
        {activeTab === "report" && roastData && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-8 pb-12"
          >
             

             {/* 1. ONE-LINER ROAST */}
             <section className="pt-2">
                 <div className="card p-6 md:p-8 bg-gradient-to-br from-[var(--surface-sec)] to-[rgba(139,92,246,0.08)] border-[rgba(139,92,246,0.2)] relative overflow-hidden flex flex-col items-center text-center">
                    <div className="absolute top-4 right-4 opacity-[0.02] pointer-events-none">
                       <Quote className="w-32 h-32 text-[var(--accent)]" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[rgba(139,92,246,0.1)] flex items-center justify-center mb-3">
                       <Target className="w-5 h-5 text-[var(--accent)]" />
                    </div>
                    <h2 className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest mb-2">One-Liner Roast</h2>
                    <p className="text-[18px] md:text-[22px] font-display font-medium text-[var(--text)] leading-snug max-w-5xl text-balance mb-4 relative z-10">
                       &ldquo;{roastData.sections[0]?.roast.split('.')[0]}.&rdquo;
                    </p>
                    <button onClick={handleCopy} className="btn-secondary relative z-10 rounded-full px-4 py-1.5 text-[12px]">
                       {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
                       {copied ? "Copied" : "Copy Brutal Honesty"}
                    </button>
                 </div>
             </section>


             {/* 1.7 QUOTES & MEMES */}
             {((roastData.fake_quotes && roastData.fake_quotes.length > 0) || (roastData.meme_one_liners && roastData.meme_one_liners.length > 0)) && (
                <section className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                   {roastData.fake_quotes && roastData.fake_quotes.length > 0 && (
                      <div className="card p-6 bg-[rgba(13,16,24,0.4)] border-[rgba(255,255,255,0.05)] space-y-4">
                         <h3 className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5"/> What Recruiters Actually Said</h3>
                         <ul className="space-y-3">
                            {roastData.fake_quotes.map((q, i) => (
                               <li key={i} className="text-[14px] text-[var(--text-2)] pl-3 border-l-2 border-[rgba(139,92,246,0.4)] italic">&ldquo;{q}&rdquo;</li>
                            ))}
                         </ul>
                      </div>
                   )}
                   {roastData.meme_one_liners && roastData.meme_one_liners.length > 0 && (
                      <div className="card p-6 bg-[rgba(13,16,24,0.4)] border-[rgba(255,255,255,0.05)] space-y-4">
                         <h3 className="text-[11px] font-bold text-[var(--text-2)] uppercase tracking-widest flex items-center gap-2"><Zap className="w-3.5 h-3.5"/> Meme One-Liners</h3>
                         <ul className="space-y-3">
                            {roastData.meme_one_liners.map((m, i) => (
                               <li key={i} className="text-[14px] text-[var(--text-2)] flex items-start gap-2">
                                  <span className="text-[var(--accent)] mt-0.5">•</span>
                                  {m}
                               </li>
                            ))}
                         </ul>
                      </div>
                   )}
                </section>
             )}

             {/* 2. DEEP SECTION AUTOPSY */}
             <section className="pt-6 space-y-12">
                <div className="flex items-center gap-4 mb-4">
                   <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[var(--text-2)]" />
                   </div>
                   <h2 className="text-[26px] font-display font-semibold text-[var(--text)] uppercase tracking-wide">Section Autopsy</h2>
                </div>

                <div className="space-y-12">
                   {roastData.sections.map((section, idx) => {
                      const styleProps = getSectionIconProps(section.title);
                      const IconComp = styleProps.icon;
                      
                      // We derive the 4 required fields by splitting the available text slightly 
                      // or assigning the claims/roast directly to ensure deep analysis layout.
                      const splitClaims = section.claims.split(". ");
                      const splitRoast = section.roast.split(". ");
                      
                      const diagnosisText = section.claims;
                      const recruiterInterpretationText = splitClaims.length > 1 ? splitClaims.slice(-1)[0] : "Lacks clarity on specific contributions.";
                      
                      const fatalFlawsText = section.roast;
                      const hiddenRiskText = splitRoast.length > 1 ? splitRoast.slice(-1)[0] : "Reduces credibility with technical hiring managers.";
                      
                      return (
                         <div key={idx} className="card overflow-hidden border-[rgba(255,255,255,0.05)] bg-[rgba(13,16,24,0.4)] flex flex-col">
                            {/* Card Header */}
                            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: styleProps.bg }}>
                                     <IconComp className="w-4 h-4" style={{ color: styleProps.color }} />
                                  </div>
                                  <h3 className="font-display font-semibold text-[15px] text-[var(--text)] uppercase tracking-widest">{section.title}</h3>
                               </div>
                            </div>
                            
                            {/* Card Body - Stacked */}
                            <div className="p-6 flex flex-col gap-6">
                               
                               {/* Left Column: What Resume Claims */}
                               <div className="flex flex-col bg-gradient-to-br from-[rgba(59,130,246,0.03)] to-transparent border border-[rgba(59,130,246,0.1)] rounded-xl p-6 h-full shadow-sm">
                                  <h4 className="flex items-center gap-2 text-[11px] font-bold text-[var(--blue)] uppercase tracking-widest mb-3">
                                     <Search className="w-3.5 h-3.5" /> What Resume Claims
                                  </h4>
                                  <p className="text-[14px] text-[var(--text-2)] leading-relaxed">
                                     {diagnosisText}
                                  </p>
                               </div>

                               {/* Right Column: Roast */}
                               <div className="flex flex-col bg-gradient-to-br from-[rgba(239,68,68,0.03)] to-transparent border border-[rgba(239,68,68,0.1)] rounded-xl p-6 h-full shadow-sm">
                                  <h4 className="flex items-center gap-2 text-[11px] font-bold text-[var(--red)] uppercase tracking-widest mb-3">
                                     <AlertTriangle className="w-3.5 h-3.5" /> Roast
                                  </h4>
                                  <p className="text-[14px] text-[var(--text)] font-medium leading-relaxed">
                                     {fatalFlawsText}
                                  </p>
                               </div>

                            </div>
                         </div>
                      );
                   })}
                </div>
             </section>


          </motion.div>
        )}

        {/* ─── RECOMMENDED CHANGES TAB ─── */}
        {activeTab === "changes" && (
          <motion.div
            key="changes"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-12"
          >
           {resumeChanges ? (
             <div className="space-y-12">
                


                {/* MIDDLE SECTION: SECTION-BY-SECTION GRID */}
                <section>
                   <h2 className="text-[20px] font-display font-semibold text-[var(--text)] mb-6">Detailed Section Audit</h2>
                   <div className="flex flex-col gap-6">
                      {resumeChanges.sections.map((section, idx) => {
                         const styleProps = getSectionIconProps(section.section_name);
                         const IconComp = styleProps.icon;
                         
                         return (
                            <div key={idx} className="card p-6 border-[rgba(255,255,255,0.06)] bg-gradient-to-br from-[var(--card)] to-[var(--surface-sec)] hover:-translate-y-1">
                               <div className="flex items-center justify-between mb-6 pb-4 border-b border-[rgba(255,255,255,0.04)]">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: styleProps.bg }}>
                                        <IconComp className="w-4 h-4" style={{ color: styleProps.color }} />
                                     </div>
                                     <h3 className="font-display font-semibold text-[16px] text-[var(--text)]">{section.section_name}</h3>
                                  </div>
                                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full border border-[rgba(255,255,255,0.1)] text-[var(--text-2)] bg-[rgba(255,255,255,0.03)]">
                                     {section.priority || "Medium"} Priority
                                  </span>
                               </div>
                               
                               <ul className="space-y-4">
                                  <li className="flex flex-col">
                                     <span className="text-[11px] font-semibold text-[var(--red)] uppercase tracking-wider mb-1">Issue</span>
                                     <p className="text-[13px] text-[var(--text-2)] font-medium leading-relaxed">{section.current_text || "Weak formatting."}</p>
                                  </li>
                                  <li className="flex flex-col">
                                     <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider mb-1">Impact</span>
                                     <p className="text-[13px] text-[var(--text-2)] font-medium leading-relaxed">{section.why}</p>
                                  </li>
                                  <li className="flex flex-col bg-[rgba(16,185,129,0.03)] p-3 rounded-lg border border-[rgba(16,185,129,0.1)]">
                                     <span className="text-[11px] font-semibold text-[var(--green)] uppercase tracking-wider mb-1">Recommendation</span>
                                     <p className="text-[13px] text-[var(--text)] font-medium leading-relaxed">{section.recommended_change}</p>
                                  </li>
                               </ul>
                            </div>
                         );
                      })}
                   </div>
                </section>




             </div>
           ) : (
              <div 
                className="p-16 text-center max-w-2xl mx-auto flex flex-col items-center rounded-[20px]"
                style={{
                  background: "linear-gradient(180deg, #111827, #0D1018)",
                  border: "1px solid rgba(255,255,255,.06)",
                }}
              >
                 <h3 className="text-[18px] font-semibold text-[var(--text)] mb-3">No Dashboard Available</h3>
                 <p className="text-[15px] text-[var(--text-3)] mb-8">Generate an action plan based on your resume analysis.</p>
                 <button onClick={handleReAudit} className="btn-primary">Generate Recommendations</button>
              </div>
           )}
          </motion.div>
        )}
        </AnimatePresence>

      </main>


    </div>
  );
}
