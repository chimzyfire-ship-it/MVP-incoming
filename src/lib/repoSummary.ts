export type SkillLevel = "beginner" | "intermediate" | "expert";

export type RepoSummary = {
  typeLabel: string;
  short: string;
  deep: string;
  goodForPills: string[];
};

type RepoLike = {
  plainEnglishDescription?: string;
  language?: string;
  topics?: string[];
  title?: string;
};

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/* ── Strip programming-language names from user-visible prose ── */
const LANG_RE =
  /\b(Python|JavaScript|TypeScript|Rust|Go|Golang|C\+\+|C#|Java|Ruby|PHP|Swift|Kotlin|Scala|Perl|Haskell|Elixir|Dart|Lua|R|Julia|Zig|Nim|OCaml|Clojure|Erlang)\b/gi;

function stripLangNames(text: string): string {
  return text.replace(LANG_RE, "").replace(/\s{2,}/g, " ").trim();
}

/* ── Replace jargon — beginner mode strips everything ── */
function simplifyWords(text: string, level: SkillLevel = "beginner"): string {
  let t = normalizeText(text);

  if (level === "expert") {
    // Experts get the raw text — just normalise whitespace
    return t;
  }

  // Shared swaps for beginner and intermediate
  const sharedSwaps: Array<[RegExp, string]> = [
    [/\bopen.?source\b/gi, "free software anyone can look at and use"],
    [/\brepository\b/gi, "project folder"],
    [/\brepo\b/gi, "project"],
    [/\bbug\b/gi, "mistake"],
    [/\bbugs\b/gi, "mistakes"],
  ];

  // Beginner-only swaps (full jargon replacement)
  const beginnerSwaps: Array<[RegExp, string]> = [
    [/\bAPI\b/gi, "a way for apps to talk to each other"],
    [/\bAPIs\b/gi, "ways for apps to talk to each other"],
    [/\bCLI\b/gi, "a tool you use by typing words instead of clicking"],
    [/\bSDK\b/gi, "a starter kit for builders"],
    [/\bREST\b/gi, "a standard way apps share information"],
    [/\bGraphQL\b/gi, "a way to ask an app for exactly the information you want"],
    [/\bframework\b/gi, "a ready-made starting point for building things"],
    [/\bframeworks\b/gi, "ready-made starting points for building things"],
    [/\blibrary\b/gi, "a toolbox of pre-made pieces"],
    [/\blibraries\b/gi, "toolboxes of pre-made pieces"],
    [/\bbackend\b/gi, "the behind-the-scenes part that you never see"],
    [/\bfrontend\b/gi, "the part you actually see and click on"],
    [/\bdeployment\b/gi, "putting something online so people can use it"],
    [/\bdeploy\b/gi, "put online"],
    [/\bcontainer\b/gi, "a neat package that has everything the app needs"],
    [/\bcontainers\b/gi, "neat packages that have everything the app needs"],
    [/\bdocker\b/gi, "a tool that packages apps so they run the same everywhere"],
    [/\bkubernetes\b/gi, "a manager that keeps many apps running smoothly"],
    [/\bmicroservices?\b/gi, "small separate apps that work together like a team"],
    [/\bcomponent\b/gi, "a building block"],
    [/\bcomponents\b/gi, "building blocks"],
    [/\bconfiguration\b/gi, "settings"],
    [/\bauthentication\b/gi, "the step where you prove who you are (like a password)"],
    [/\bauth\b/gi, "login"],
    [/\bencryption\b/gi, "a lock that scrambles your data so only you can read it"],
    [/\bJWT\b/gi, "a digital pass that proves you logged in"],
    [/\bmiddleware\b/gi, "a helper that runs between steps"],
    [/\bplugin\b/gi, "an add-on that gives extra powers"],
    [/\bplugins\b/gi, "add-ons that give extra powers"],
    [/\bwebhook\b/gi, "an automatic message sent when something happens"],
    [/\bwebsocket\b/gi, "a live two-way chat line between your screen and a server"],
    [/\bcaching\b/gi, "remembering things so they load faster next time"],
    [/\bcache\b/gi, "a memory that stores things to speed them up"],
    [/\bCI\/CD\b/gi, "automatic testing and publishing"],
    [/\bpipeline\b/gi, "a set of steps that happen one after another automatically"],
    [/\bbuild\b/gi, "put together"],
    [/\bcompile\b/gi, "translate into something a computer understands"],
    [/\bruntime\b/gi, "the engine that makes the app actually work"],
    [/\bscalable\b/gi, "able to handle more people without breaking"],
    [/\bscaling\b/gi, "handling more people without breaking"],
    [/\bmodular\b/gi, "made of separate pieces you can swap in and out"],
    [/\brefactor\b/gi, "clean up and reorganize"],
    [/\bdebug(ging)?\b/gi, "finding and fixing mistakes"],
    [/\bserver\b/gi, "a computer that runs day and night to serve you information"],
    [/\bservers\b/gi, "computers that run day and night to serve information"],
    [/\bdatabase\b/gi, "a filing cabinet where information is stored neatly"],
    [/\bdatabases\b/gi, "filing cabinets where information is stored neatly"],
    [/\bquery\b/gi, "a question you ask the filing cabinet"],
    [/\bqueries\b/gi, "questions you ask the filing cabinet"],
    [/\bschema\b/gi, "a blueprint that describes how information is organized"],
    [/\bdata\b/gi, "information"],
    [/\bcloud\b/gi, "someone else's computer that you borrow over the internet"],
    [/\bML\b/g, "machine learning (teaching a computer to learn patterns)"],
    [/\bmachine learning\b/gi, "teaching a computer to learn patterns"],
    [/\bAI\b/g, "a smart helper that can think and learn"],
    [/\bartificial intelligence\b/gi, "a smart helper that can think and learn"],
    [/\bLLM\b/gi, "a smart helper that reads and writes like a person"],
    [/\bneural network\b/gi, "a brain-like structure inside a computer"],
    [/\bmodel\b/gi, "a trained brain that the computer uses to make decisions"],
    [/\btoken\b/gi, "a tiny piece of text the computer reads one at a time"],
    [/\btokens\b/gi, "tiny pieces of text the computer reads one at a time"],
    [/\balgorithm\b/gi, "a recipe of steps a computer follows"],
    [/\bpackage manager\b/gi, "a tool that downloads and organizes add-ons for you"],
    [/\bdependencies\b/gi, "other tools this one needs to work"],
    [/\bdependency\b/gi, "another tool this one needs to work"],
    [/\bmonorepo\b/gi, "one big folder that holds many projects together"],
    [/\bterminal\b/gi, "a text-only screen where you type commands"],
    [/\bcommand line\b/gi, "a text-only screen where you type commands"],
    [/\bvariable\b/gi, "a named box that holds a value"],
    [/\bfunction\b/gi, "a reusable set of instructions"],
    [/\bclass\b/gi, "a template for creating things"],
  ];

  // Intermediate-only swaps (preserve tech terms but add plain explanation in brackets)
  const intermediateSwaps: Array<[RegExp, string]> = [
    [/\bAPI\b/gi, "API (a bridge between apps)"],
    [/\bCLI\b/gi, "CLI (command-line tool)"],
    [/\bSDK\b/gi, "SDK (developer toolkit)"],
    [/\bbackend\b/gi, "backend (server-side logic)"],
    [/\bfrontend\b/gi, "frontend (the UI you see)"],
    [/\bdeployment\b/gi, "deployment (going live)"],
    [/\bdocker\b/gi, "Docker (containerisation)"],
    [/\bkubernetes\b/gi, "Kubernetes (container orchestration)"],
    [/\bauthentication\b/gi, "authentication (login & identity)"],
    [/\bencryption\b/gi, "encryption (data security)"],
    [/\bdatabase\b/gi, "database (data storage)"],
    [/\bcloud\b/gi, "cloud (remote servers)"],
    [/\bML\b/g, "ML (machine learning)"],
    [/\bLLM\b/gi, "LLM (large language model)"],
    [/\balgorithm\b/gi, "algorithm (step-by-step logic)"],
    [/\bdependencies\b/gi, "dependencies (required packages)"],
    [/\bCI\/CD\b/gi, "CI/CD (automated build & deploy)"],
    [/\bwebsocket\b/gi, "WebSocket (real-time connection)"],
    [/\bcaching\b/gi, "caching (performance optimization)"],
    [/\bscalable\b/gi, "scalable (handles growth well)"],
    [/\bmonorepo\b/gi, "monorepo (single unified codebase)"],
  ];

  const swaps = [
    ...sharedSwaps,
    ...(level === "beginner" ? beginnerSwaps : intermediateSwaps),
  ];

  for (const [re, to] of swaps) t = t.replace(re, to);
  return t;
}

function uniqNonEmpty(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const v = normalizeText(item);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/* ── Short summary (card-level) ── */
export function summarizeRepoForBeginners(
  repo: RepoLike,
  level: SkillLevel = "beginner"
): RepoSummary {
  const raw = repo.plainEnglishDescription || "";
  const topicsText = (repo.topics || []).join(" ");
  const combined =
    `${repo.title || ""} ${raw} ${topicsText} ${repo.language || ""}`.toLowerCase();

  const pills: string[] = [];
  const typeHints: string[] = [];

  // Pills & type hints adapt to skill level
  const isExpert = level === "expert";
  const isIntermediate = level === "intermediate";

  if (/(next|react|vue|angular|svelte|tailwind|css|ui|frontend)/.test(combined)) {
    typeHints.push(isExpert ? "Frontend / SSR" : isIntermediate ? "Web App (frontend)" : "Website you can visit");
    pills.push(isExpert ? "Rendered in-browser or SSR via Node — visit directly." : isIntermediate ? "Opens in your browser like a normal website (frontend app)" : "Opens in your browser like any normal website");
  }

  if (/(api|server|backend|graphql|microservice|rest)/.test(combined)) {
    typeHints.push(isExpert ? "Backend / API service" : isIntermediate ? "API / backend service" : "Behind-the-scenes helper");
    pills.push(isExpert ? "Exposes endpoints consumed by other services or clients." : isIntermediate ? "Runs on a server and serves data to other apps (backend)" : "Works quietly in the background so other apps can do their job");
  }

  if (/(cli|command tool|terminal|command-line|tool)/.test(combined)) {
    typeHints.push(isExpert ? "CLI tool" : isIntermediate ? "Command-line tool (CLI)" : "Text-based helper");
    pills.push(isExpert ? "Invoked from terminal. Supports stdin/stdout pipelines." : isIntermediate ? "Run from terminal — no GUI, just commands" : "You tell it what to do by typing — no clicking needed");
  }

  if (/(python|django|flask|fastapi)/.test(combined)) {
    pills.push(isExpert ? "Python stack — pip-installable, virtualenv recommended." : isIntermediate ? "Built with Python — great for scripting and data work" : "Popular with people who work with numbers and small handy tools");
  }

  if (/(rust)/.test(combined)) {
    pills.push(isExpert ? "Memory-safe, zero-cost abstractions. No GC." : isIntermediate ? "Built in Rust — blazing fast with memory safety guarantees" : "Made to be really fast and really safe — like a sports car with extra seat belts");
  }

  if (/(data|analytics|pandas|spark|ml|model|dataset)/.test(combined)) {
    typeHints.push(isExpert ? "Data / ML" : isIntermediate ? "Data & analytics" : "Information explorer");
    pills.push(isExpert ? "Handles data pipelines, model training, or analytics queries." : isIntermediate ? "Analyzes and visualizes data — charts, models, patterns" : "Helps you look at numbers, charts, and patterns to understand things better");
  }

  if (/(auth|login|oauth|jwt|security|encryption)/.test(combined)) {
    pills.push(isExpert ? "Implements auth flows, token management, or crypto primitives." : isIntermediate ? "Handles authentication, security, or data protection" : "Keeps your passwords, accounts, and private stuff safe");
  }

  if (/(docker|container)/.test(combined)) {
    pills.push(isExpert ? "Containerised — Dockerfile or Compose file included." : isIntermediate ? "Containerized with Docker — consistent across environments" : "Packages everything neatly so you can start with one tap — no fuss");
  }

  if (/(ai|llm|gpt|agent|neural|transformer|langchain|chat)/.test(combined)) {
    typeHints.push(isExpert ? "AI / LLM" : isIntermediate ? "AI-powered" : "Smart helper");
    pills.push(isExpert ? "Integrates LLM inference, agent orchestration, or embedding pipelines." : isIntermediate ? "Powered by AI — uses language models or neural networks" : "Uses a computer brain to answer questions or do tasks for you");
  }

  if (/(game|play|fun)/.test(combined)) {
    typeHints.push(isExpert ? "Game / interactive" : "Fun stuff");
    pills.push(isExpert ? "Interactive experience or game engine demo." : isIntermediate ? "A game or interactive experience" : "Something you play or have fun with — just for the joy of it");
  }

  if (/(image|video|audio|media|design|editor|creative)/.test(combined)) {
    typeHints.push(isExpert ? "Media / creative tooling" : isIntermediate ? "Creative & media tool" : "Creative tool");
    pills.push(isExpert ? "Handles media processing, codec pipelines, or generative design." : isIntermediate ? "Works with images, video, audio, or creative content" : "Helps you make, edit, or enjoy pictures, videos, or sounds");
  }

  if (pills.length === 0) {
    pills.push(
      isExpert
        ? "Open-source utility. Check the README for usage patterns."
        : isIntermediate
        ? "An open-source tool — free to use, modify, and explore"
        : "A free tool anyone can try — made by people who share their work with the world"
    );
  }

  const typeLabel = typeHints.length > 0 ? typeHints[0] : isExpert ? "OSS utility" : isIntermediate ? "Open-source app" : "Free community app";

  const cleaned =
    level === "expert"
      ? normalizeText(raw)
      : stripLangNames(simplifyWords(raw, level));

  const goodForPills = uniqNonEmpty(pills).slice(0, 5);

  const short = cleaned
    ? cleaned.length > 160
      ? `${cleaned.slice(0, 157).trim()}...`
      : cleaned
    : isExpert
    ? `${typeLabel}. See README for full details.`
    : isIntermediate
    ? `An open-source ${typeLabel.toLowerCase()} built by community contributors.`
    : `A ${typeLabel.toLowerCase()} made by volunteers who share their work for free.`;

  /* Build the deep paragraph */
  let useSentence: string;

  if (isExpert) {
    useSentence = "Clone the repo and check the README for env vars and startup commands. Or hit Run — we auto-detect the runtime, install deps, and spawn the process.";
    if (/website|frontend/i.test(typeLabel)) useSentence = "SSR or SPA — the dev server starts on Run. Check package.json for scripts.";
    else if (/backend|api/i.test(typeLabel)) useSentence = "Spins up the server process. Inspect the exposed ports in the runtime tab.";
    else if (/cli/i.test(typeLabel)) useSentence = "CLI binary — pipe args or run interactively. We handle PATH setup.";
    else if (/ai|llm/i.test(typeLabel)) useSentence = "Inference pipeline — confirm API key requirements before running. Check .env.example.";
  } else if (isIntermediate) {
    useSentence = "Hit Run and we handle the setup — install dependencies, start the server, and open it in your browser. No config needed.";
    if (/website|frontend/i.test(typeLabel)) useSentence = "It runs as a web app in the browser. We start the dev server and open the page automatically.";
    else if (/backend|api/i.test(typeLabel)) useSentence = "We spin up the server in the background. Once it's running, you can test the endpoints or see the dashboard.";
    else if (/cli/i.test(typeLabel)) useSentence = "It's a terminal tool — we run it for you and show the output. You can pass arguments if needed.";
    else if (/ai|llm/i.test(typeLabel)) useSentence = "We connect to the AI model and open the interface. Some setups may need an API key — we'll let you know.";
  } else {
    // Beginner
    useSentence = "Tap Run and we handle all the boring setup. When things are ready, it opens in your browser like a normal website — you just click around.";
    if (/website/i.test(typeLabel)) useSentence = "It opens right in your browser — the same way you visit any website. No downloads, no installs.";
    else if (/behind/i.test(typeLabel)) useSentence = "This one works behind the scenes, like a waiter in a kitchen — you won't see it, but it makes everything else run smoothly.";
    else if (/text-based/i.test(typeLabel)) useSentence = "Instead of clicking buttons, you type short words to tell it what to do. Don't worry — we handle the typing part for you when you press Run.";
    else if (/smart helper/i.test(typeLabel)) useSentence = "Think of it like a really smart assistant — you ask it things, and it tries its best to help. Press Run and start chatting.";
    else if (/information/i.test(typeLabel)) useSentence = "It shows you numbers and charts so you can spot what is going on — like reading a report card, but for anything you are curious about.";
    else if (/creative/i.test(typeLabel)) useSentence = "Use it to make or change pictures, videos, sounds, or designs — the fun, creative stuff.";
    else if (/fun/i.test(typeLabel)) useSentence = "Just press Run and enjoy — this one is all about having a good time.";
  }

  const bestFor = goodForPills.slice(0, 3);
  const bestForLines =
    bestFor.length > 0
      ? bestFor.map((p) => `• ${p}`).join("\n")
      : isExpert ? "• OSS utility — MIT / Apache licensed" : "• A free tool anyone can try";

  const deep = `What is it${isExpert ? "" : ", in plain words"}:\n${short}\n\nWho would like this:\n${bestForLines}\n\nHow to try it:\n${useSentence}`;

  return {
    typeLabel,
    short,
    deep,
    goodForPills,
  };
}

/** Friendly category label — adapts to skill level. */
export function friendlyCategoryLabel(repo: RepoLike, level: SkillLevel = "beginner"): string {
  const raw = repo.plainEnglishDescription || "";
  const topicsText = (repo.topics || []).join(" ");
  const combined = `${repo.title || ""} ${raw} ${topicsText}`.toLowerCase();

  if (level === "expert") {
    if (/(ai|llm|chat|gpt|assistant|agent)/.test(combined)) return "AI / LLM";
    if (/(react|next|vue|web|website|browser)/.test(combined)) return "Frontend";
    if (/(api|server|backend)/.test(combined)) return "Backend / API";
    if (/(data|analytics|chart)/.test(combined)) return "Data / Analytics";
    if (/(game|play)/.test(combined)) return "Game / Interactive";
    if (/(cli|terminal|command)/.test(combined)) return "CLI Tool";
    if (/(image|video|audio|media|design|creative)/.test(combined)) return "Media / Creative";
    if (/(security|auth|encryption|privacy)/.test(combined)) return "Security / Auth";
    if (/(docker|kubernetes|cloud|devops|infra)/.test(combined)) return "DevOps / Infra";
    return "OSS Utility";
  }

  if (level === "intermediate") {
    if (/(ai|llm|chat|gpt|assistant|agent)/.test(combined)) return "AI-powered";
    if (/(react|next|vue|web|website|browser)/.test(combined)) return "Web app";
    if (/(api|server|backend)/.test(combined)) return "API / backend";
    if (/(data|analytics|chart)/.test(combined)) return "Data & analytics";
    if (/(game|play)/.test(combined)) return "Game / interactive";
    if (/(cli|terminal|command)/.test(combined)) return "CLI tool";
    if (/(image|video|audio|media|design|creative)/.test(combined)) return "Creative tool";
    if (/(security|auth|encryption|privacy)/.test(combined)) return "Security & auth";
    if (/(docker|kubernetes|cloud|devops|infra)/.test(combined)) return "DevOps / Cloud";
    return "Open-source app";
  }

  // Beginner
  if (/(ai|llm|chat|gpt|assistant|agent)/.test(combined)) return "Smart helper";
  if (/(react|next|vue|web|website|browser)/.test(combined)) return "Website";
  if (/(api|server|backend)/.test(combined)) return "Behind-the-scenes worker";
  if (/(data|analytics|chart)/.test(combined)) return "Numbers and charts";
  if (/(game|play)/.test(combined)) return "Fun stuff";
  if (/(cli|terminal|command)/.test(combined)) return "Text-based tool";
  if (/(image|video|audio|media|design|creative)/.test(combined)) return "Creative tool";
  if (/(security|auth|encryption|privacy)/.test(combined)) return "Safety and privacy";
  if (/(docker|kubernetes|cloud|devops|infra)/.test(combined)) return "Setup helper";
  return "Community tool";
}

export type LongBeginnerStory = {
  paragraphs: string[];
  /** Tech names only here, in brackets — not in the main story. */
  techFootnote: string | null;
};

/* ── Adaptive full story — language tuned to skill level ── */
export function buildLongBeginnerStory(
  repo: RepoLike,
  level: SkillLevel = "beginner"
): LongBeginnerStory {
  const title = repo.title || "This project";
  const raw = normalizeText(repo.plainEnglishDescription || "");
  const soft =
    level === "expert"
      ? raw
      : stripLangNames(simplifyWords(raw, level));
  const cat = friendlyCategoryLabel(repo, level);
  const lang =
    repo.language && repo.language !== "Unknown" ? repo.language : "";
  const topics = repo.topics || [];

  let paragraphs: string[];

  if (level === "expert") {
    const p1 = `**${title}** — ${cat}. Open-source, freely licensed.`;
    const p2 = soft
      ? soft
      : "No description provided. Check the README and source for implementation details.";
    const p3 = `Tagged as: ${cat} on Gitmurph. Use the runtime tab to spin up a sandboxed instance — runtime detection is automatic (Node, Python, Go, Rust, etc.). If the repo requires env vars, check .env.example before hitting Run.`;
    const p4 = `Clone via: \`git clone ${repo.title ? `https://github.com/${repo.title}` : "the URL above"}\`. Or just hit Run — we detect the package manager, install deps (\`npm install\` / \`pip install\` / \`cargo build\`), and spawn the process.`;
    const p5 = topics.length > 0
      ? `Topics: ${topics.slice(0, 8).join(", ")}.${lang ? ` Primary language: ${lang}.` : ""}`
      : lang ? `Primary language: ${lang}.` : "";
    paragraphs = [p1, p2, p3, p4, p5].filter((p) => p.length > 0);
  } else if (level === "intermediate") {
    const p1 = `**${title}** is an open-source project — free to use, modify, and build on. You don't need to know how to code to run it, but if you do, you can also fork it and hack on it.`;
    const p2 = soft
      ? `Here's what it does: ${soft}.`
      : `The author hasn't written a detailed description yet, but think of it as a developer-shared tool in the "${cat}" category.`;
    const p3 = `We've filed this under **${cat}** on Gitmurph. ${lang ? `The codebase is primarily written in **${lang}**.` : ""} ${topics.length > 0 ? `Key topics: ${topics.slice(0, 5).join(", ")}.` : ""}`;
    const p4 = `Hit **Run** and we'll handle the environment setup — install dependencies, start the process, and open it in your browser. Some projects may need API keys or env variables; we'll surface those if they're needed.`;
    const p5 = `If it fails to start, it usually means the project needs external services (a database, a paid API, etc.) that we can't provision automatically. The README typically has setup instructions for those cases.`;
    paragraphs = [p1, p2, p3, p4, p5].filter((p) => p.length > 0);
  } else {
    // Beginner — original warm style
    const p1 = `Welcome to ${title}. This is a piece of free software — which means anyone on earth can look at it, use it, and even help make it better. You don't need to know anything about computers or programming to understand what it does, and you definitely don't need anyone's permission to try it.`;
    const p2 = soft
      ? `Here is what it does, explained like you are telling a friend over coffee: ${soft}. That is really all there is to it — no scary words, no hidden meaning.`
      : `The people who made this haven't written a long explanation yet, but think of it like a tool or an app that someone created and then said: "Here, anyone can have this for free." It is shared on the internet so that anybody who finds it useful can grab it and try it out.`;
    const p3 = `We put this under the "${cat}" section on Gitmurph. That is just our way of sorting things so you can find what you need — like how a supermarket has aisles for drinks, snacks, and cleaning supplies. It doesn't mean you need to study anything or take a test.`;
    const p4 = `When you see the big Run button, go ahead and tap it. What happens next is like ordering food from a menu — you pick what you want, and the kitchen (that's us) handles the cooking. We download the app, set it up, and open it in your web browser when it is ready. You don't need to install anything on your computer.`;
    const p5 = `Sometimes an app will not start, and that is perfectly normal. Some free software needs special keys or paid services that we can't guess or provide. If that happens, it is NOT your fault — it is just how that particular app was set up by its makers. You can try a different app, or come back later.`;
    const p6 = `The best part? Every single app on Gitmurph is made by real people — hobbyists, students, professionals — who decided to share their work for free. When you press Run, you are supporting a movement where people help people, no money required.`;
    let p7 = "";
    if (topics.length > 0) {
      const friendlyTopics = topics
        .slice(0, 5)
        .map((t) => stripLangNames(t.replace(/-/g, " ")))
        .filter((t) => t.length > 0);
      if (friendlyTopics.length > 0) {
        p7 = `Some labels the makers gave this project: ${friendlyTopics.join(", ")}. Don't worry if those words sound unfamiliar — they are just tags, like hashtags on a social media post.`;
      }
    }
    paragraphs = [p1, p2, p3, p4, p5, p6, p7].filter((p) => p.length > 0);
  }

  const techFootnote =
    level === "expert"
      ? null // Experts don't need the "for the curious" note
      : level === "intermediate" && lang
      ? `Primary language: **${lang}**. ${topics.length > 0 ? `Stack hints: ${topics.slice(0, 6).join(", ")}.` : ""}`
      : lang
      ? `(Behind the curtain: some of the code inside this project is written in a computer language called ${lang}. You will never need to know that to use the app. It is only mentioned here for the curious folks who like to peek behind the curtain.)`
      : null;

  return { paragraphs, techFootnote };
}
