import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, ShieldCheck, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface BrowserChromeProps {
  children: ReactNode;
  url: string;
  onCopyUrl: () => void;
}

export default function BrowserChrome({ children, url, onCopyUrl }: BrowserChromeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    onCopyUrl();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full min-h-screen bg-[#09090b]/80 flex flex-col p-4 md:p-8 font-sans antialiased text-[#fafafa]">
      {/* Outer macOS-style Window Container */}
      <div className="w-full max-w-7xl mx-auto bg-[#09090b] rounded-2xl shadow-2xl border border-[#27272a] overflow-hidden flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)]">
        {/* Chrome Top Toolbar */}
        <div className="bg-[#09090b] border-b border-[#27272a] px-4 py-3 flex items-center gap-4 shrink-0 select-none">
          {/* Traffic Light Windows Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E] transition-opacity hover:opacity-80 cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123] transition-opacity hover:opacity-80 cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29] transition-opacity hover:opacity-80 cursor-pointer" />
          </div>

          {/* Browser Navigation Actions */}
          <div className="flex items-center gap-2 text-[#52525b] shrink-0">
            <button className="p-1 rounded-md hover:bg-[#18181b] hover:text-[#fafafa] transition-colors cursor-pointer" aria-label="Back">
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button className="p-1 rounded-md hover:bg-[#18181b] hover:text-[#fafafa] transition-colors cursor-pointer" aria-label="Forward">
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button className="p-1 rounded-md hover:bg-[#18181b] hover:text-[#fafafa] transition-colors cursor-pointer" aria-label="Refresh">
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* URL Address Bar */}
          <div className="flex-1 max-w-xl mx-auto bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-1 flex items-center justify-between gap-2 shadow-sm text-xs">
            <div className="flex items-center gap-1.5 text-[#52525b] truncate">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[#a1a1aa] font-mono select-all truncate">{url}</span>
            </div>
            <button
              onClick={handleCopy}
              className="p-1 rounded text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer shrink-0"
              title="Copy Address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Right Spacing / Empty to balance chrome */}
          <div className="w-[72px] shrink-0 hidden md:block" />
        </div>

        {/* Client Workspace Frame */}
        <div className="flex-1 bg-[#09090b] flex flex-col overflow-hidden relative">
          {children}
        </div>
      </div>
    </div>
  );
}
