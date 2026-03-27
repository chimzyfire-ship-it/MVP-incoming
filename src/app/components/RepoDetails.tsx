import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, Star, Code, Gem, ToyBrick, Scale, Users, CheckCircle, Info, MoreHorizontal } from 'lucide-react';

// Main Component: RepoDetails
export default function RepoDetails() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-zinc-950 text-white font-sans min-h-screen">
      <Header />
      <main className="px-4 pt-20 pb-16">
        <HeroSection />
        <StatsRow />
        <WhatsNewSection />
        <MediaCarousel />
        <DescriptionSection isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />
        <InformationGrid />
      </main>
    </div>
  );
}

// --- Component Sections ---

const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800/50">
    <button className="p-2">
      <ChevronLeft size={24} />
    </button>
    <div className="flex-1 text-center">
      <Gem size={24} className="mx-auto text-blue-500" />
    </div>
    <button className="p-2">
      <MoreHorizontal size={24} />
    </button>
  </header>
);

const HeroSection = () => (
  <section className="flex flex-col items-start pt-8 pb-6 border-b border-zinc-800">
    <div className="flex items-center w-full">
      <div className="w-24 h-24 bg-zinc-800 rounded-2xl flex-shrink-0">
        {/* Placeholder for App Icon */}
      </div>
      <div className="ml-4 flex-grow">
        <h1 className="text-3xl font-bold tracking-tight">AI Website Builder</h1>
        <p className="text-zinc-400">Open Source Community</p>
      </div>
      <button className="bg-blue-600 text-white font-bold py-2 px-8 rounded-full text-lg">
        GET
      </button>
    </div>
  </section>
);

const StatsRow = () => (
  <div className="overflow-x-auto py-4 whitespace-nowrap scrollbar-hide">
    <div className="flex space-x-6 text-zinc-400 text-sm text-center">
      <StatItem value="4.8" label="Rating" icon={<Star size={20} className="text-yellow-400" />} />
      <Divider />
      <StatItem value="Developer" label="Category" icon={<Code size={20} className="text-green-400" />} />
      <Divider />
      <StatItem value="4+" label="Age" icon={<Users size={20} className="text-purple-400" />} />
      <Divider />
      <StatItem value="Private" label="Security" icon={<CheckCircle size={20} className="text-blue-400" />} />
    </div>
  </div>
);

const WhatsNewSection = () => (
  <section className="py-6 border-b border-zinc-800">
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-2xl font-bold">What's New</h2>
      <a href="#" className="text-blue-500 text-sm">Version History</a>
    </div>
    <p className="text-zinc-400 text-sm mb-3">Version 1.2.0</p>
    <ul className="list-disc list-inside text-zinc-300 space-y-1">
      <li>Instantly create a website from a simple prompt.</li>
      <li>AI now helps you write content for your pages.</li>
      <li>Improved speed and easier setup.</li>
    </ul>
  </section>
);

const MediaCarousel = () => (
  <section className="py-6">
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex space-x-4">
        {/* Placeholder Screenshots */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-800 rounded-xl w-64 h-96 flex-shrink-0" />
        ))}
      </div>
    </div>
  </section>
);

const DescriptionSection = ({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void; }) => (
  <section className="py-6 border-b border-zinc-800">
    <div className={`relative overflow-hidden transition-max-height duration-500 ease-in-out ${isExpanded ? 'max-h-full' : 'max-h-24'}`}>
      <p className="text-zinc-300 leading-relaxed">
        Turn any idea into a beautiful website. This tool uses a powerful AI brain to build and launch a complete site for you in minutes. No code needed. Just describe what you want, and watch it come to life. It’s perfect for portfolios, small businesses, or personal projects.
      </p>
    </div>
    <button onClick={onToggle} className="text-blue-500 font-semibold mt-2">
      {isExpanded ? 'less' : 'more'}
    </button>
  </section>
);

const InformationGrid = () => (
  <section className="py-6">
    <h2 className="text-2xl font-bold mb-4">Information</h2>
    <div className="space-y-3">
      <InfoRow label="Seller" value="Open Source Community" />
      <InfoRow label="Size" value="128.5 MB" />
      <InfoRow label="Category" value="Developer Tools" />
      <InfoRow label="Compatibility" value="Works on this device" />
    </div>
  </section>
);


// --- Helper Components ---

const StatItem = ({ value, label, icon }: { value: string; label: string; icon: React.ReactNode; }) => (
  <div className="flex flex-col items-center space-y-1">
    {icon}
    <span className="font-bold text-zinc-200">{value}</span>
    <span className="text-xs">{label}</span>
  </div>
);

const Divider = () => (
  <div className="border-l border-zinc-700 h-16 self-center"></div>
);

const InfoRow = ({ label, value }: { label: string; value: string; }) => (
  <div className="flex justify-between items-center border-b border-zinc-800/50 pb-3">
    <span className="text-zinc-400">{label}</span>
    <span className="text-zinc-100 font-medium">{value}</span>
  </div>
);
