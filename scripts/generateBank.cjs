const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OUT = path.join(process.cwd(), "data", "conversations.json");

// Change this number any time:
const TOTAL = 12000; // 12k feels very "never repeats"
const HET_RATE = 0.98;

const WEIGHTS = {
  relationship: 40,
  kissy: 15,
  advice: 25,
  everyday: 20,
};

const female = [
  "Olivia","Charlotte","Isla","Amelia","Mia","Ava","Ella","Sophie","Chloe","Zoe",
  "Grace","Ruby","Matilda","Lily","Evie","Hannah","Emily","Lucy","Tara","Maddie",
  "Kate","Jess","Sarah","Brooke","Georgia","Phoebe","Mel","Abbey","Paige","Bella",
  "Keira","Tahlia","Bec","Court","Alana","Jade","Nina","Skye","Laura","Sienna",
];

const male = [
  "Oliver","Noah","Jack","William","Leo","Henry","Charlie","Thomas","James","Lucas",
  "Ethan","Liam","Hudson","Theo","Ben","Josh","Mason","Sam","Nick","Luke",
  "Ryan","Tom","Matt","Dan","Alex","Jake","Bailey","Callum","Dylan","Aaron",
  "Harry","Will","Zac","Cam","Jordan","Cooper","Nathan","Sean","Finn","Jay",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function chance(p) { return Math.random() < p; }

function weightedPick(map) {
  const entries = Object.entries(map);
  const total = entries.reduce((s, [,w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0][0];
}

// Mild swear policy
function sanitize(s) {
  const lower = s.toLowerCase();
  if (lower.includes("cunt")) return "";
  return s
    .replace(/\bfuck\b/gi, "f***")
    .replace(/\bfucking\b/gi, "f***ing");
}

// Texting style (subtle, not cringe)
function texify(s) {
  let out = s;

  // occasional casual lowercase start
  if (chance(0.35)) out = out[0].toLowerCase() + out.slice(1);

  // abbreviations
  if (chance(0.18)) out = out.replace(/\byou\b/gi, "u");
  if (chance(0.12)) out = out.replace(/\byour\b/gi, "ur");
  if (chance(0.10)) out = out.replace(/\bbecause\b/gi, "bc");

  // sprinkle openers
  if (chance(0.10)) out = `${pick(["idk", "ngl", "tbh"])}, ${out[0].toLowerCase()}${out.slice(1)}`;

  // soften punctuation sometimes
  if (chance(0.25)) out = out.replace(/\.\s*$/,"");
  if (chance(0.10)) out += pick([" lol", "", ""]);

  return out;
}

function line(name, text) {
  const cleaned = sanitize(text);
  if (!cleaned) return "";
  return `${name}: ${texify(cleaned)}`;
}

function hash(lines) {
  const norm = lines
    .join("\n")
    .toLowerCase()
    .replace(/[^a-z0-9\s:']/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return crypto.createHash("sha1").update(norm).digest("hex");
}

// --- Banks (lots of interchangeable parts) ---
// Relationship: tension but not cruelty
const relOpen = [
  "I didn't mean to start it, I just said it felt weird",
  "I hate that I always end up apologising for bringing stuff up",
  "It's not even the thing, it's the way it made me feel",
  "I keep replaying it and it's doing my head in",
  "I'm trying not to be dramatic but I'm kinda hurt",
  "I feel stupid for being bothered but I am",
  "I want to talk about it but I don't want a fight",
];

const relPushback = [
  "What happened",
  "Did you say that to them",
  "Maybe they didn't mean it like that",
  "Are you sure you're not reading into it",
  "Ok but what do you want from them",
  "So what did they actually say",
];

const relDetail = [
  "They went quiet and I felt like I was the problem",
  "They said \"all good\" but it didn't feel all good",
  "They promised they'd call and then just didn't",
  "They made a joke and it landed wrong and I couldn't un-hear it",
  "They turned it back on me and I shut down",
  "They got distant and I don't know if I'm supposed to pretend I didn't notice",
  "They left me on read and I know it's small but it stung",
];

const relArgue = [
  "Ok but you're doing that thing where you assume the worst",
  "I get it but you can't expect them to read your mind",
  "You're allowed to feel it, but don't punish them silently",
  "Maybe you should just ask instead of guessing",
  "You're spiralling a bit",
];

const relClose = [
  "I just want them to stay in the convo, not fix it",
  "I don't want it to turn into a whole thing but it already has",
  "I miss them and I'm annoyed about it",
  "I'm tired of guessing what I'm allowed to feel",
  "I want to text them but I don't wanna be the one again",
  "I want to be chill but I also want to be cared about",
];

const relShorts = ["ok", "yeah", "mm", "wait", "nah", "fair", "true", "stop", "pls"];

// Kissy: affectionate lingering, no explicit sex
const kissyMoment = [
  "He kissed me goodbye then came back like he forgot something",
  "He moved my hair out of my face like it was nothing and I nearly melted",
  "She fell asleep on me and I didn't move bc I didn't wanna wreck it",
  "He held my hand in the car without saying anything",
  "He kissed my forehead and said sorry if he snores and I laughed",
  "She smiled at me across the room and I forgot what I was saying",
];

const kissyReact = [
  "Ok that's rude",
  "You're so gone",
  "Stop that's actually cute",
  "I hate that I love that",
  "That would do it for me",
  "I'm smiling and it's not even happening to me",
];

const kissyAfter = [
  "and now I'm trying to act normal like my brain didn't reboot",
  "it's small stuff but it keeps stacking up",
  "I keep thinking about it and it's annoying",
  "I swear I'm not this sappy normally",
  "I miss them already and it's been like 4 hours",
];

// Advice: about someone else, includes pushback
const advOpen = [
  "Ok can I get your take on something",
  "Is this normal or is it cooked",
  "My mate keeps doing the same thing and acting shocked every time",
  "My friend says they want a relationship but treats effort like an attack",
  "I need advice and I can't ask anyone irl",
];

const advDetail = [
  "They ask for honesty then get upset when they hear it",
  "They want reassurance but they don't say it, they just get cold",
  "They act like texting back is some massive chore",
  "They make everything a test and it's exhausting",
  "They say they're fine but the vibe is not fine",
  "They keep flirting then disappearing",
];

const advPrompt = [
  "Do I say something or let it be",
  "Am I meant to be supportive or real",
  "How do you even bring that up without it being drama",
  "What would you do",
  "Is it my place to say anything",
];

const advReply = [
  "Be kind but honest",
  "Say it once and leave it",
  "Don't get dragged into it",
  "If they ask, tell them",
  "That's not your job to fix",
  "Tell them what you noticed and see how they respond",
];

// Everyday: small feelings, overheard vibe
const dayOpen = [
  "Do you ever get that thing where one small comment ruins your day",
  "I think I'm more emotional when I'm tired, everything feels personal after 9pm",
  "I'm in a weird mood and I can't even explain why",
  "I hate that my brain won't shut up for like 5 seconds",
  "I saw something that reminded me of them and now I'm annoyed",
];

const dayReply = ["same", "yeah fair", "that's so real", "you'll be ok", "lol yep", "mm", "true"];

// Adds “double text” and pauses
function maybeDoubleText(lines, speakerName) {
  if (!chance(0.22)) return lines;
  // Insert a short follow-up immediately after a line by the same speaker
  const insert = `${speakerName}: ${texify(pick(["wait", "no actually", "ok but still", "idk", "ignore me"]))}`;
  const idx = Math.floor(Math.random() * Math.max(1, lines.length));
  lines.splice(idx + 1, 0, insert);
  return lines;
}

function buildRelationship(A, B) {
  const lines = [];
  lines.push(line(A, pick(relOpen)));
  lines.push(line(B, pick(relPushback)));

  // sometimes A sends a short “...” or quick one
  if (chance(0.18)) lines.push(`${A}: ...`);

  lines.push(line(A, pick(relDetail)));

  // B either supports or pushes back (adds variation)
  if (chance(0.45)) {
    lines.push(line(B, pick(relArgue)));
  } else {
    lines.push(line(B, pick(["That sucks", "Ok fair", "I get it", "You're not wrong", "You're allowed to feel weird about that"])));
  }

  if (chance(0.35)) lines.push(`${A}: ${texify(pick(relShorts))}`);

  lines.push(line(A, pick(relClose)));

  if (chance(0.40)) lines.push(line(B, pick(["Don't text rn", "Text if you want, just don't spiral", "Give it a day", "Say it straight", "Ask them, gently"])));

  return maybeDoubleText(lines.filter(Boolean), A);
}

function buildKissy(A, B) {
  const lines = [];
  lines.push(line(A, pick(kissyMoment)));
  lines.push(line(B, pick(["and??", "ok go on", "pls", "what happened"])));

  lines.push(line(A, pick(kissyAfter)));

  lines.push(line(B, pick(kissyReact)));

  if (chance(0.35)) lines.push(line(A, pick(["I know. it's stupid", "Don't validate me", "I hate how happy I am rn", "shut up lol", "stoppp"])));

  return maybeDoubleText(lines.filter(Boolean), A);
}

function buildAdvice(A, B) {
  const lines = [];
  lines.push(line(A, pick(advOpen)));
  lines.push(line(B, pick(["ok tell me", "depends. what's the vibe", "go on", "yeah?"])));

  lines.push(line(A, pick(advDetail)));

  // B can disagree or challenge
  if (chance(0.35)) {
    lines.push(line(B, pick(["Are you sure you're not being a bit harsh", "Maybe they're just anxious", "Ok but what did you do", "That's a lot to assume"])));
  } else {
    lines.push(line(B, pick(["That's not great", "That's a red flag", "That's just immature", "They need to say what they want"])));
  }

  lines.push(line(A, pick(advPrompt)));
  if (chance(0.55)) lines.push(line(B, pick(advReply)));

  return maybeDoubleText(lines.filter(Boolean), A);
}

function buildEveryday(A, B) {
  const lines = [];
  lines.push(line(A, pick(dayOpen)));
  lines.push(line(B, pick(dayReply)));
  if (chance(0.55)) lines.push(line(A, pick(["Anyway. ignore me", "I'm fine, I'm just tired", "I'll get over it, I just needed to say it"])));
  if (chance(0.25)) lines.push(`${B}: ${texify(pick(["mm", "yeah", "ok", "fair"]))}`);
  return lines.filter(Boolean);
}

function varyLength(lines) {
  // Sometimes shorten, sometimes extend (keeps rhythm varied)
  if (lines.length > 4 && chance(0.18)) {
    // drop one middle line
    lines.splice(2, 1);
  }
  if (lines.length < 9 && chance(0.22)) {
    // add a short reaction near the end
    lines.push(`${pick([lines[0].split(":")[0], lines[1].split(":")[0]])}: ${texify(pick(["ok", "yeah", "mm", "true", "idk"]))}`);
  }
  // cap
  if (lines.length > 10) lines.length = 10;
  return lines;
}

function makeConversation() {
  const mode = weightedPick(WEIGHTS);

  const hetero = chance(HET_RATE);
  const A = hetero ? pick(female) : pick([...female, ...male]);
  const B = hetero ? pick(male) : pick([...male, ...female]);

  let lines = [];
  if (mode === "relationship") lines = buildRelationship(A, B);
  if (mode === "kissy") lines = buildKissy(A, B);
  if (mode === "advice") lines = buildAdvice(A, B);
  if (mode === "everyday") lines = buildEveryday(A, B);

  lines = varyLength(lines);

  return { id: crypto.randomUUID(), mode, dialect: "en-AU", lines };
}

// --- Generate + dedupe ---
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const seen = new Set();
const bank = [];

while (bank.length < TOTAL) {
  const c = makeConversation();
  const h = hash(c.lines);
  if (seen.has(h)) continue;
  seen.add(h);
  bank.push(c);
}

fs.writeFileSync(OUT, JSON.stringify(bank, null, 2), "utf8");
console.log(`Wrote ${bank.length} conversations to ${OUT}`);
