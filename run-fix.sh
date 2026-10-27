#!/bin/bash
# One OpenCode run for the Rasoi fix pass
cd /home/mac/projects/rasoi
exec ~/.opencode/bin/opencode run --continue -m opencode/x-preview-f-free "CONTINUE the Rasoi fix pass. Read docs/FIX_PROMPT.md fully first if you haven't. Work in SMALL steps, minimal prose, verify each change. You may be cut off by provider turn limits — a supervisor resumes you with --continue, so always leave the repo consistent and note remaining work in docs/fix-log.md as you go. When truly done and verified, write docs/FIX_DONE.md with your full summary." 2>&1 | tee -a fix-open.log
