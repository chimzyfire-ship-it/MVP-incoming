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

function takeFirstSentence(input: string): string {
  const clean = normalizeText(input);
  if (!clean) return "";
  const match = clean.match(/^(.+?[.!?])(\s|$)/);
  if (match && match[1]) return match[1].trim();
  // Fallback: truncate to keep it card-friendly
  return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}

function compactifyDescription(input: string): string {
  let text = normalizeText(input);
  if (!text) return text;

  // Replace common dev terms with simpler language (heuristic, MVP-level).
  const replacements: Array<[RegExp, string]> = [
    [/\bAPI\b/gi, "connections between apps"],
    [/\bbackend\b/gi, "server app"],
    [/\bfrontend\b/gi, "website"],
    [/\bframework\b/gi, "tooling"],
    [/\blibrary\b/gi, "tool"],
    [/\bCLI\b/gi, "command tool"],
    [/\bcommand line\b/gi, "terminal"],
    [/\bauthentication\b/gi, "login"],
    [/\bauth\b/gi, "login"],
    [/\bJWT\b/gi, "login tokens"],
    [/\bsecurity\b/gi, "safety"],
    [/\bdeployment\b/gi, "putting it online"],
    [/\bmonitoring\b/gi, "health checks"],
    [/\bhealth checks?\b/gi, "health"],
    [/\bdata\b/gi, "data"],
    [/\bML\b/g, "machine learning"],
    [/\bmachine learning\b/gi, "machine learning"],
  ];

  for (const [from, to] of replacements) text = text.replace(from, to);
  return text;
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

export function summarizeRepoForBeginners(repo: RepoLike): RepoSummary {
  const raw = repo.plainEnglishDescription || "";
  const topicsText = (repo.topics || []).join(" ");
  const combined = `${repo.title || ""} ${raw} ${topicsText} ${repo.language || ""}`.toLowerCase();

  const pills: string[] = [];
  const typeHints: string[] = [];

  // Decide type + "good for" pills using keyword heuristics.
  if (/(next|react|vue|angular|svelte|tailwind|css|ui|frontend)/.test(combined)) {
    typeHints.push("Website app");
    pills.push("Web pages you can run");
  }

  if (/(api|server|backend|graphql|microservice|rest)/.test(combined)) {
    typeHints.push("Server app");
    pills.push("A backend that powers apps");
  }

  if (/(cli|command tool|terminal|command-line|tool)/.test(combined)) {
    typeHints.push("Command tool");
    pills.push("Tools you run from the terminal");
  }

  if (/(python|django|flask|fastapi)/.test(combined)) {
    pills.push("Python app");
  }

  if (/(rust)/.test(combined)) {
    pills.push("Fast and safe app");
  }

  if (/(data|analytics|pandas|spark|ml|model|dataset)/.test(combined)) {
    typeHints.push("Data app");
    pills.push("Work with data and insights");
  }

  if (/(auth|login|oauth|jwt|security|encryption)/.test(combined)) {
    pills.push("Login and security features");
  }

  if (/(docker|container)/.test(combined)) {
    pills.push("Easy setup with one package");
  }

  // Always provide at least one pill so the UI doesn't feel empty.
  if (pills.length === 0) pills.push("A useful open-source tool");

  const typeLabel =
    typeHints.length > 0
      ? typeHints[0]
      : "Open-source app";

  const compact = compactifyDescription(raw);
  const firstSentence = takeFirstSentence(compact);

  const goodForPills = uniqNonEmpty(pills).slice(0, 5);

  // Make the "card description" feel like a human summary.
  const short = firstSentence
    ? firstSentence
    : `${typeLabel} built by the community.`;

  let useSentence = "Try it by pressing Run—OS-Layer will open it for you when it's ready.";
  if (/website/i.test(typeLabel)) {
    useSentence = "Open it in your browser and start using it right away.";
  } else if (/server/i.test(typeLabel)) {
    useSentence = "Start it and let it handle the work behind the scenes.";
  } else if (/command/i.test(typeLabel)) {
    useSentence = "Use it to automate tasks with simple commands (we'll handle the setup).";
  } else if (/python/i.test(typeLabel)) {
    useSentence = "Run it to turn Python code into an app you can try.";
  } else if (/data/i.test(typeLabel)) {
    useSentence = "Explore data and insights you can understand at a glance.";
  } else if (/login|security/i.test(typeLabel)) {
    useSentence = "Try apps that include login and safer behavior.";
  } else if (/easy setup/i.test(typeLabel)) {
    useSentence = "It should be quick to start and easy to try.";
  }

  const bestFor = goodForPills.slice(0, 2);
  const bestForLines = bestFor.length > 0 ? bestFor.map((p) => `- ${p}`).join("\n") : "- A useful open-source tool";

  const deep = `In plain words:\n${short}\n\nBest for:\n${bestForLines}\n\nHow you'll use it:\n${useSentence}`;

  return {
    typeLabel,
    short,
    deep,
    goodForPills,
  };
}

