import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const INITIAL_TOOLS = [
  {
    title: "Excalidraw",
    full_name: "excalidraw/excalidraw",
    description: "Virtual whiteboard for sketching hand-drawn like diagrams",
    stars: 80000,
    forks: 7000,
    url: "https://github.com/excalidraw/excalidraw",
    language: "TypeScript",
    topics: ["whiteboard", "drawing", "collaboration"],
    easy_to_run: true
  },
  {
    title: "Lobe Chat",
    full_name: "lobehub/lobe-chat",
    description: "Modern, open-source AI chat framework with vision and plugins",
    stars: 45000,
    forks: 5000,
    url: "https://github.com/lobehub/lobe-chat",
    language: "TypeScript",
    topics: ["chatgpt", "ai", "llm", "chatbot"],
    easy_to_run: true
  },
  {
    title: "Next.js Starter",
    full_name: "vercel/next.js",
    description: "The React Framework for the Web",
    stars: 120000,
    forks: 25000,
    url: "https://github.com/vercel/next.js",
    language: "JavaScript",
    topics: ["react", "nextjs", "web", "framework"],
    easy_to_run: true
  },
  {
    title: "FastAPI Template",
    full_name: "tiangolo/fastapi",
    description: "High performance, easy to learn backend framework in Python",
    stars: 70000,
    forks: 6000,
    url: "https://github.com/tiangolo/fastapi",
    language: "Python",
    topics: ["api", "backend", "python"],
    easy_to_run: true
  },
  {
    title: "Vite + Vue",
    full_name: "vuejs/core",
    description: "Progressive JavaScript framework for user interfaces",
    stars: 43000,
    forks: 7000,
    url: "https://github.com/vuejs/core",
    language: "TypeScript",
    topics: ["vue", "frontend", "framework"],
    easy_to_run: true
  }
];

async function seed() {
  console.log("Seeding initial tools to Supabase...");
  
  for (const tool of INITIAL_TOOLS) {
    const { error } = await supabase
      .from('tools')
      .upsert({ ...tool }, { onConflict: 'full_name' });
      
    if (error) {
      console.error(`Failed to insert ${tool.full_name}:`, error.message);
    } else {
      console.log(`✅ Seeded ${tool.title}`);
    }
  }
  
  console.log("Seeding complete!");
}

seed();
