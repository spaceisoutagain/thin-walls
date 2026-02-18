import bank from "@/data/conversations.json";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- REAL watchers (in-memory) ----
declare global {
  // eslint-disable-next-line no-var
  var __thinWallsWatchers: number | undefined;
}
globalThis.__thinWallsWatchers ??= 0;

function incWatchers() {
  globalThis.__thinWallsWatchers = (globalThis.__thinWallsWatchers ?? 0) + 1;
}
function decWatchers() {
  globalThis.__thinWallsWatchers = Math.max(0, (globalThis.__thinWallsWatchers ?? 0) - 1);
}
function getWatchers() {
  return globalThis.__thinWallsWatchers ?? 0;
}

// ---- content (we'll upgrade this later) ----
const conversations = [
  [
    "Ella: he kissed me goodbye n then came back like he forgot something",
    "Sam: what'd he forget",
    "Ella: nothing. he just did it again. properly this time",
    "Sam: lol you're gone",
    "Ella: i know"
  ],
  [
    "Mia: idk why this is annoying me so much",
    "Tom: what happened",
    "Mia: he said \"all good\" but it didn't feel all good??",
    "Tom: did u say anything",
    "Mia: no, i just went quiet n now i'm mad at myself"
  ],
  [
    "Chloe: ngl i miss him but i dont wanna be the one who texts first again",
    "Jack: fair",
    "Chloe: like i can literally feel myself doing the spiral",
    "Jack: stop reading into it",
    "Chloe: i am TRYING"
  ]
];

function send(controller: ReadableStreamDefaultController<string>, data: string) {
  controller.enqueue(`data: ${data}\n\n`);
}

// “texting” pacing
function msPerChar(line: string) {
  // short texts type fast, longer texts type slower
  const base = 12;
  const lenFactor = Math.min(18, Math.max(0, line.length - 40) * 0.2);
  return base + lenFactor;
}

function pauseAfter(line: string) {
  // add human pauses
  if (line.length < 18) return 300 + Math.random() * 450;
  if (line.length < 60) return 450 + Math.random() * 700;
  return 700 + Math.random() * 1100;
}

function shouldShowTypingIndicator() {
  return Math.random() < 0.35;
}

async function emitTyping(controller: ReadableStreamDefaultController<string>, who: string) {
  // send a typing indicator event
  send(controller, `__TYPING__:${who}`);
  await sleep(500 + Math.random() * 900);
  send(controller, `__TYPING__:${who}:OFF`);
}

export async function GET() {
  incWatchers();

  const stream = new ReadableStream<string>({
    async start(controller) {
      // retry hint
      controller.enqueue(`retry: 2000\n\n`);

      try {
        while (true) {
          // push watcher count occasionally
          send(controller, `WATCHING: ${getWatchers()}`);

          const convoObj = (bank as any[])[
  Math.floor(Math.random() * (bank as any[]).length)
];

const convo = convoObj.lines as string[];


          for (const raw of convo) {
            // Optional: occasionally show typing indicator before a line
            const who = raw.split(":")[0]?.trim() || "…";
            if (shouldShowTypingIndicator()) {
              await emitTyping(controller, who);
            }

            // stream the line like someone typing
            let out = "";
            for (const ch of raw) {
              out += ch;
              // stream partial chunks sometimes for a “live” feel
              if (out.length % 3 === 0) {
                send(controller, `__LINE_PART__:${out}`);
              }
              await sleep(msPerChar(raw));
            }

            // finalise the line
            send(controller, `__LINE_FINAL__:${raw}`);
            await sleep(pauseAfter(raw));
          }

          // fade/end conversation
          await sleep(1200);
          send(controller, "__FADE__");
          await sleep(1200);
        }
      } catch {
        // ignore
      } finally {
        controller.close();
      }
    },
    cancel() {
      decWatchers();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
