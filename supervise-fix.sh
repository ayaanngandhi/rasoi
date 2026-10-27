#!/bin/bash
# Supervisor: keeps resuming the Rasoi fix pass until FIX_DONE.md exists + ports up
cd /home/mac/projects/rasoi

for i in $(seq 1 12); do
  DONE=$([ -f docs/FIX_DONE.md ] && echo yes || echo no)
  P8600=$(ss -tln | grep -c ':8600 ')
  P8601=$(ss -tln | grep -c ':8601 ')
  if [ "$DONE" = "yes" ] && [ "$P8600" -ge 1 ] && [ "$P8601" -ge 1 ]; then
    echo "=== FIX PASS COMPLETE (iter $i): FIX_DONE.md exists, 8600+8601 listening ==="
    break
  fi
  echo ""
  echo "########## SUPERVISOR ITERATION $i — $(date +%H:%M:%S) done=$DONE p8600=$P8600 p8601=$P8601 ##########"
  ~/.opencode/bin/opencode run --continue -m opencode/x-preview-f-free "Continue the Rasoi fix pass EXACTLY where you left off. Read docs/FIX_PROMPT.md for the full task list and docs/fix-log.md for progress notes from previous iterations. Small steps, verify everything, update fix-log.md as you go. Write docs/FIX_DONE.md only when ALL tasks are complete and verified." 2>&1 | tee -a fix-open.log
  sleep 3
done
echo "SUPERVISOR EXIT $(date +%H:%M:%S)"
