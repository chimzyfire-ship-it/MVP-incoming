import { useState } from 'react';
import { ChevronLeft, Star, Code, Gem, Users, CheckCircle, MoreHorizontal } from 'lucide-react';
import { Repo } from './RepoCard';

// 1. Define the props interface
interface RepoDetailsProps {
  repo: Repo;
  showShopActions: boolean;
  onRun: (repo: Repo) => void;
  onClose: () => void;
}

// 2. Update the main component signature
export default function RepoDetails({ repo, showShopActions, onRun, onClose }: RepoDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-zinc-950 text-white font-sans min-h-screen">
      {/* 3. Pass props down correctly */}
      <Header onClose={onClose} />
      <main className="px-4 pt-20 pb-16">
        <HeroSection repo={repo} onRun={onRun} showShopActions={showShopActions} />
        <StatsRow repo={repo} />
        <WhatsNewSection />
        <MediaCarousel />
        <DescriptionSection 
          description={repo.plainEnglishDescription} 
          isExpanded={isExpanded} 
          onToggle={() => setIsExpanded(!isExpanded)} 
        />
        <InformationGrid repo={repo} />
      </main>
    </div>
  );
}

// --- Component Sections (with updated props) ---

// 4. Update all sub-components
const Header = ({ onClose }: { onClose: () => void }) => (
  <header className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800/50">
    <button onClick={onClose} className="p-2">
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

const HeroSection = ({ repo, onRun, showShopActions }: { repo: Repo; onRun: (repo: Repo) => void; showShopActions: boolean }) => (
  <section className="flex flex-col items-start pt-8 pb-6 border-b border-zinc-800">
    <div className="flex items-center w-full">
      <div className="w-24 h-24 bg-zinc-800 rounded-2xl flex-shrink-0 relative overflow-hidden">
        
      </div>
      <div className="ml-4 flex-grow">
        <h1 className="text-3xl font-bold tracking-tight">{repo.title}</h1>
        <p className="text-zinc-400">{repo.owner || 'Open Source Community'}</p>
      </div>
      <button onClick={() => onRun(repo)} className="bg-blue-600 text-white font-bold py-2 px-8 rounded-full text-lg">
        {showShopActions ? 'GET' : 'RUN'}
      </button>
    </div>
  </section>
);

const StatsRow = ({ repo }: { repo: Repo }) => {
    const starRating = repo.stars > 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : repo.stars;
    return (
        <div className="overflow-x-auto py-4 whitespace-nowrap scrollbar-hide">
            <div className="flex space-x-6 text-zinc-400 text-sm text-center">
                <StatItem value={String(starRating)} label="Stars" icon={<Star size={20} className="text-yellow-400" />} />
                <Divider />
                <StatItem value={repo.language || 'Code'} label="Category" icon={<Code size={20} className="text-green-400" />} />
                <Divider />
                <StatItem value="4+" label="Age" icon={<Users size={20} className="text-purple-400" />} />
                <Divider />
                <StatItem value="Private" label="Security" icon={<CheckCircle size={20} className="text-blue-400" />} />
            </div>
        </div>
    );
};

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
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-zinc-800 rounded-xl w-64 h-96 flex-shrink-0" />
        ))}
      </div>
    </div>
  </section>
);

const DescriptionSection = ({ description, isExpanded, onToggle }: { description: string; isExpanded: boolean; onToggle: () => void; }) => (
  <section className="py-6 border-b border-zinc-800">
    <div className={`relative overflow-hidden transition-max-height duration-500 ease-in-out ${isExpanded ? 'max-h-full' : 'max-h-24'}`}>
      <p className="text-zinc-300 leading-relaxed">
        {description}
      </p>
    </div>
    <button onClick={onToggle} className="text-blue-500 font-semibold mt-2">
      {isExpanded ? 'less' : 'more'}
    </button>
  </section>
);

const InformationGrid = ({ repo }: { repo: Repo }) => (
  <section className="py-6">
    <h2 className="text-2xl font-bold mb-4">Information</h2>
    <div className="space-y-3">
      <InfoRow label="Seller" value={repo.owner || 'Open Source Community'} />
      <InfoRow label="Size" value="128.5 MB" />
      <InfoRow label="Category" value={repo.language || 'Developer Tools'} />
      <InfoRow label="Compatibility" value="Works on this device" />
    </div>
  </section>
);

// --- Helper Components (These don't need props from the top) ---

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
