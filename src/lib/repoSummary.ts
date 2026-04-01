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

/* ── Replace jargon with normal words ── */
function simplifyWords(text: string): string {
  let t = normalizeText(text);
  const swaps: Array<[RegExp, string]> = [
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
    [/\brepository\b/gi, "project folder"],
    [/\brepo\b/gi, "project"],
    [/\bopen.?source\b/gi, "free software anyone can look at and use"],
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
    [/\bbug\b/gi, "a mistake in the instructions that causes problems"],
    [/\bbugs\b/gi, "mistakes in the instructions that cause problems"],
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
export function summarizeRepoForBeginners(repo: RepoLike): RepoSummary {
  const raw = repo.plainEnglishDescription || "";
  const topicsText = (repo.topics || []).join(" ");
  const combined =
    `${repo.title || ""} ${raw} ${topicsText} ${repo.language || ""}`.toLowerCase();

  const pills: string[] = [];
  const typeHints: string[] = [];

  if (/(next|react|vue|angular|svelte|tailwind|css|ui|frontend)/.test(combined)) {
    typeHints.push("Website you can visit");
    pills.push("Opens in your browser like any normal website");
  }

  if (/(api|server|backend|graphql|microservice|rest)/.test(combined)) {
    typeHints.push("Behind-the-scenes helper");
    pills.push("Works quietly in the background so other apps can do their job");
  }

  if (/(cli|command tool|terminal|command-line|tool)/.test(combined)) {
    typeHints.push("Text-based helper");
    pills.push("You tell it what to do by typing — no clicking needed");
  }

  if (/(python|django|flask|fastapi)/.test(combined)) {
    pills.push("Popular with people who work with numbers and small handy tools");
  }

  if (/(rust)/.test(combined)) {
    pills.push("Made to be really fast and really safe — like a sports car with extra seat belts");
  }

  if (/(data|analytics|pandas|spark|ml|model|dataset)/.test(combined)) {
    typeHints.push("Information explorer");
    pills.push("Helps you look at numbers, charts, and patterns to understand things better");
  }

  if (/(auth|login|oauth|jwt|security|encryption)/.test(combined)) {
    pills.push("Keeps your passwords, accounts, and private stuff safe");
  }

  if (/(docker|container)/.test(combined)) {
    pills.push("Packages everything neatly so you can start with one tap — no fuss");
  }

  if (/(ai|llm|gpt|agent|neural|transformer|langchain|chat)/.test(combined)) {
    typeHints.push("Smart helper");
    pills.push("Uses a computer brain to answer questions or do tasks for you");
  }

  if (/(game|play|fun)/.test(combined)) {
    typeHints.push("Fun and games");
    pills.push("Something you play or have fun with — just for the joy of it");
  }

  if (/(image|video|audio|media|design|editor|creative)/.test(combined)) {
    typeHints.push("Creative tool");
    pills.push("Helps you make, edit, or enjoy pictures, videos, or sounds");
  }

  if (pills.length === 0) pills.push("A free tool anyone can try — made by people who share their work with the world");

  const typeLabel = typeHints.length > 0 ? typeHints[0] : "Free community app";

  /* Build a human-friendly short blurb */
  const cleaned = stripLangNames(simplifyWords(raw));

  const goodForPills = uniqNonEmpty(pills).slice(0, 5);

  const short = cleaned
    ? cleaned.length > 160
      ? `${cleaned.slice(0, 157).trim()}...`
      : cleaned
    : `A ${typeLabel.toLowerCase()} made by volunteers who share their work for free.`;

  /* Build the deep paragraph shown on the detail/card expanded view */
  let useSentence =
    "Tap Run and we handle all the boring setup. When things are ready, it opens in your browser like a normal website — you just click around.";
  if (/website/i.test(typeLabel)) {
    useSentence =
      "It opens right in your browser — the same way you visit any website. No downloads, no installs.";
  } else if (/behind/i.test(typeLabel)) {
    useSentence =
      "This one works behind the scenes, like a waiter in a kitchen — you won't see it, but it makes everything else run smoothly.";
  } else if (/text-based/i.test(typeLabel)) {
    useSentence =
      "Instead of clicking buttons, you type short words to tell it what to do. Don't worry — we handle the typing part for you when you press Run.";
  } else if (/smart helper/i.test(typeLabel)) {
    useSentence =
      "Think of it like a really smart assistant — you ask it things, and it tries its best to help. Press Run and start chatting.";
  } else if (/information/i.test(typeLabel)) {
    useSentence =
      "It shows you numbers and charts so you can spot what is going on — like reading a report card, but for anything you are curious about.";
  } else if (/creative/i.test(typeLabel)) {
    useSentence =
      "Use it to make or change pictures, videos, sounds, or designs — the fun, creative stuff.";
  } else if (/fun/i.test(typeLabel)) {
    useSentence =
      "Just press Run and enjoy — this one is all about having a good time.";
  }

  const bestFor = goodForPills.slice(0, 3);
  const bestForLines =
    bestFor.length > 0
      ? bestFor.map((p) => `• ${p}`).join("\n")
      : "• A free tool anyone can try";

  const deep = `What is it, in plain words:\n${short}\n\nWho would like this:\n${bestForLines}\n\nHow to try it:\n${useSentence}`;

  return {
    typeLabel,
    short,
    deep,
    goodForPills,
  };
}

/** Friendly category label — never a programming language name. */
export function friendlyCategoryLabel(repo: RepoLike): string {
  const raw = repo.plainEnglishDescription || "";
  const topicsText = (repo.topics || []).join(" ");
  const combined =
    `${repo.title || ""} ${raw} ${topicsText}`.toLowerCase();

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

/* ── The big, warm, story-like explanation for complete beginners ── */
export function buildLongBeginnerStory(repo: RepoLike): LongBeginnerStory {
  const title = repo.title || "This project";
  const raw = normalizeText(repo.plainEnglishDescription || "");
  const soft = stripLangNames(simplifyWords(raw));
  const cat = friendlyCategoryLabel(repo);
  const lang =
    repo.language && repo.language !== "Unknown" ? repo.language : "";
  const topics = repo.topics || [];

  /* Para 1 — warm welcome */
  const p1 = `Welcome to ${title}. This is a piece of free software — which means anyone on earth can look at it, use it, and even help make it better. You don't need to know anything about computers or programming to understand what it does, and you definitely don't need anyone's permission to try it.`;

  /* Para 2 — the explanation */
  const p2 = soft
    ? `Here is what it does, explained like you are telling a friend over coffee: ${soft}. That is really all there is to it — no scary words, no hidden meaning.`
    : `The people who made this haven't written a long explanation yet, but think of it like a tool or an app that someone created and then said: "Here, anyone can have this for free." It is shared on the internet so that anybody who finds it useful can grab it and try it out.`;

  /* Para 3 — the category */
  const p3 = `We put this under the "${cat}" section on Gitmurph. That is just our way of sorting things so you can find what you need — like how a supermarket has aisles for drinks, snacks, and cleaning supplies. It doesn't mean you need to study anything or take a test.`;

  /* Para 4 — how to run it */
  const p4 = `When you see the big blue RUN button, go ahead and tap it. What happens next is like ordering food from a menu — you pick what you want, and the kitchen (that's us) handles the cooking. We download the app, set it up, and open it in your web browser when it is ready. You don't need to install anything on your computer. You don't need to type weird commands. You literally just wait a few moments and then start clicking around like you would on any normal website.`;

  /* Para 5 — what if it fails */
  const p5 = `Sometimes an app will not start, and that is perfectly normal. Some free software needs special keys, secret passwords, or paid services that we can't guess or provide. If that happens, it is NOT your fault — it is just how that particular app was set up by its makers. You can try a different app, or come back later.`;

  /* Para 6 — encouragement */
  const p6 = `The best part? Every single app on Gitmurph is made by real people — hobbyists, students, professionals — who decided to share their work for free. When you press Run, you are not just trying an app. You are supporting a movement where people help people, no money required.`;

  /* Para 7 — topic details if available */
  let p7 = "";
  if (topics.length > 0) {
    const friendlyTopics = topics
      .slice(0, 5)
      .map((t) => stripLangNames(t.replace(/-/g, " ")))
      .filter((t) => t.length > 0);
    if (friendlyTopics.length > 0) {
      p7 = `Some labels the makers gave this project: ${friendlyTopics.join(", ")}. Don't worry if those words sound unfamiliar — they are just tags, like hashtags on a social media post. They help other people find this app when searching.`;
    }
  }

  const paragraphs = [p1, p2, p3, p4, p5, p6, p7].filter(
    (p) => p.length > 0
  );

  const techFootnote = lang
    ? `(Behind the curtain: some of the code inside this project is written in a computer language called ${lang}. You will never need to know that to use the app. It is only mentioned here for the curious folks who like to peek behind the curtain.)`
    : null;

  return { paragraphs, techFootnote };
}
