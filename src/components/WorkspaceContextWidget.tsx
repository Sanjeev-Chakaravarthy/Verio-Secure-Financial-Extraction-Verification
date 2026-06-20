"use client";

import React from "react";

export default function WorkspaceContextWidget() {
  return (
    <div className="bg-[#F5F5F5] border border-outline-variant/50 p-xl flex flex-col w-full font-sans">
      {/* Header */}
      <div className="mb-lg">
        <h3 className="text-[12px] font-bold tracking-wider text-primary uppercase mb-1">
          Workspace Context
        </h3>
        <p className="text-[13px] text-on-surface-variant">
          UID: 88-FF-921-PE
        </p>
      </div>

      <div className="border-t border-outline-variant/30 w-full mb-lg"></div>

      {/* Status Items */}
      <div className="space-y-md mb-2xl">
        <div className="flex justify-between items-center">
          <span className="text-[13px] font-semibold text-primary">Session Status</span>
          <span className="text-[11px] font-mono bg-surface-container-high px-2 py-1 text-primary">
            ACTIVE
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[13px] font-semibold text-primary">Workspace Integrity</span>
          <span className="text-[12px] font-mono text-[#3BAA76]">
            OPTIMAL
          </span>
        </div>
      </div>

      {/* Graphic Area */}
      <div className="relative w-full h-[240px] bg-gradient-to-br from-[#E0E0E0] to-[#C0C0C0] mb-2xl overflow-hidden flex items-end p-md border border-outline-variant/20 shadow-inner">
        {/* Abstract 3D shape simulation using CSS borders/gradients */}
        <div className="absolute inset-0 flex">
          <div className="w-1/2 h-full bg-gradient-to-tr from-black/5 to-transparent"></div>
          <div className="w-1/2 h-full bg-gradient-to-tl from-black/10 to-transparent"></div>
        </div>
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent"></div>
        <div className="absolute bottom-0 left-1/2 w-1/2 h-1/2 bg-white/20" style={{ clipPath: "polygon(0 0, 100% 100%, 100% 0)" }}></div>
        <div className="absolute top-1/2 left-0 w-full h-1/2 bg-black/5" style={{ clipPath: "polygon(50% 0, 100% 100%, 0 100%)" }}></div>
        
        <span className="relative z-10 text-[10px] font-bold tracking-[0.15em] text-primary/80 uppercase">
          Archival Grade Security
        </span>
      </div>

      {/* Storage Limit Box */}
      <div className="border border-outline-variant/40 bg-white p-md flex flex-col gap-sm">
        <h4 className="text-[12px] font-bold text-primary">Storage Limit</h4>
        <div className="w-full h-[2px] bg-[#E3E3E3] mt-1 relative">
          <div className="absolute left-0 top-0 h-full w-[2%] bg-primary"></div>
          <div className="absolute left-[2%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-none"></div>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-[11px] text-on-surface-variant font-medium">128 KB USED</span>
          <span className="text-[11px] text-on-surface-variant font-medium">50.0 MB</span>
        </div>
      </div>
    </div>
  );
}
