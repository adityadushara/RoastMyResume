"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type RebuiltResumeSchema = {
  header: {
    name: string;
    title: string;
    email: string;
    phone: string;
    website: string;
    github: string;
    linkedin: string;
  };
  summary: string;
  skills: string[];
  experience: {
    company: string;
    role: string;
    location: string;
    date_range: string;
    highlights: string[];
  }[];
  projects: {
    name: string;
    tech_stack: string[];
    description: string;
    highlights: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    date_range: string;
  }[];
};

export type RoastResult = {
  one_liner: string;
  sections: {
    title: string;
    claims: string;
    roast: string;
  }[];
};

type ResumeContextType = {
  data: RoastResult | null;
  setData: (data: RoastResult | null) => void;
  filename: string;
  setFilename: (name: string) => void;
  resumeText: string;
  setResumeText: (text: string) => void;

  rebuiltResume: RebuiltResumeSchema | null;
  setRebuiltResume: (val: RebuiltResumeSchema | null) => void;
  rebuildLoading: boolean;
  setRebuildLoading: (val: boolean) => void;
  rebuildMode: "enhanced" | "ats" | "startup" | "faang";
  setRebuildMode: (mode: "enhanced" | "ats" | "startup" | "faang") => void;
  cachedRebuilds: Record<string, RebuiltResumeSchema>;
  setCachedRebuilds: (val: Record<string, RebuiltResumeSchema>) => void;
  rebuildTheme: "light" | "dark";
  setRebuildTheme: (val: "light" | "dark") => void;
  
  activeTab: "report" | "rebuild" | "export";
  setActiveTab: (val: "report" | "rebuild" | "export") => void;
};

const ResumeContext = createContext<ResumeContextType | undefined>(undefined);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RoastResult | null>(null);
  const [filename, setFilename] = useState<string>("resume.pdf");
  const [resumeText, setResumeText] = useState("");

  const [rebuiltResume, setRebuiltResume] = useState<RebuiltResumeSchema | null>(null);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [rebuildMode, setRebuildMode] = useState<"enhanced" | "ats" | "startup" | "faang">("enhanced");
  const [cachedRebuilds, setCachedRebuilds] = useState<Record<string, RebuiltResumeSchema>>({});
  const [rebuildTheme, setRebuildTheme] = useState<"light" | "dark">("dark");
  const [activeTab, setActiveTab] = useState<"report" | "rebuild" | "export">("report");

  return (
    <ResumeContext.Provider
      value={{
        data, setData,
        filename, setFilename,
        resumeText, setResumeText,
        rebuiltResume, setRebuiltResume,
        rebuildLoading, setRebuildLoading,
        rebuildMode, setRebuildMode,
        cachedRebuilds, setCachedRebuilds,
        rebuildTheme, setRebuildTheme,
        activeTab, setActiveTab,
      }}
    >
      {children}
    </ResumeContext.Provider>
  );
}

export function useResumeContext() {
  const context = useContext(ResumeContext);
  if (!context) {
    throw new Error("useResumeContext must be used within a ResumeProvider");
  }
  return context;
}
