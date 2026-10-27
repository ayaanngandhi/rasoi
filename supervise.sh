#!/bin/bash
# Supervisor: keeps resuming the Rasoi build until FE+BE are up and built
cd /home/mac/projects/rasoi

CONTINUE_MSG="Continue the Rasoi build EXACTLY where you left off. You get cut off by provider turn limits, so: work in SMALL steps, keep prose minimal, verify as you go. State: backend DONE+tested (port 8601, uvicorn, SQLite). Frontend dir only has next.config.ts. Build the full frontend per PROMPT.md now: package.json + deps install, app router pages/components (Recipes / Menu / Shopping, colorful polished UI, lucide icons, no emojis), Tailwind v4 light-default theme, rewrites to 127.0.0.1:8601, then npm run build, then next start on port 8600. Verify everything in PROMPT.md, leave BOTH servers running, print FINAL SUMMARY only when truly done."

FRESH_MSG="Fresh context for the Rasoi project at /home/mac/projects/rasoi. READ PROMPT.md first, then inspect current state: backend/ is COMPLETE and tested (FastAPI :8601, SQLite). frontend/ is barely scaffolded (next.config.ts only). Your job: finish the FRONTEND per PROMPT.md — deps, all pages/components, Tailwind v4 theme (light default, dark toggle), Framer Motion polish, lucide-react icons only, NO emojis, rewrites /api + /uploads to 127.0.0.1:8601. Then npm run build, next start -p 8600. You will likely be cut off by turn limits mid-work: another supervisor instance will resume you, so always leave the project in a consistent state and note remaining work in docs/progress.md as you go. Verify per PROMPT.md, leave BOTH servers running."

for i in $(seq 1 12); do
  BUILT=$([ -f frontend/.next/BUILD_ID ] && echo yes || echo no)
  P8600=$(ss -tln | grep -c ':8600 ')
  P8601=$(ss -tln | grep -c ':8601 ')
  if [ "$BUILT" = "yes" ] && [ "$P8600" -ge 1 ] && [ "$P8601" -ge 1 ]; then
    echo "=== ALL DONE (iter $i): build exists, 8600+8601 listening ==="
    break
  fi
  echo ""
  echo "########## SUPERVISOR ITERATION $i — $(date +%H:%M:%S) built=$BUILT p8600=$P8600 p8601=$P8601 ##########"
  if [ "$BUILT" = "no" ] && [ ! -f frontend/package.json ]; then
    # nothing to continue meaningfully on fresh box; use fresh prompt first time
    if [ "$i" = "1" ]; then
      ~/.opencode/bin/opencode run -m opencode/x-preview-f-free "$FRESH_MSG" 2>&1 | tee -a build-open.log
    else
      ~/.opencode/bin/opencode run --continue -m opencode/x-preview-f-free "$CONTINUE_MSG" 2>&1 | tee -a build-open.log
    fi
  else
    ~/.opencode/bin/opencode run --continue -m opencode/x-preview-f-free "$CONTINUE_MSG" 2>&1 | tee -a build-open.log
  fi
  sleep 3
done
echo "SUPERVISOR EXIT $(date +%H:%M:%S)"
