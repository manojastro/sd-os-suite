# Deployment

Private application URL: https://sd-os-suite-workspace.manojkumar9080522712.chatgpt.site

Sites confirmed successful publication on 2026-11-09. Access remains restricted to the owner account. Hosted source commit: `d9fa7e90ff4e30ba9c1837136f1fadb1a9a8e3e0`.

The deployed static artifact is identical to the tested standalone build. The hosted source checkout is `/home/manojkumar9080/sd-os-hosting/.sites-checkout`. Browser operational data remains in the visiting browser's IndexedDB; hosting does not synchronize it between devices. Download the standalone file from `/SD_OS_Suite.html` on the deployed origin.

24 focused tests passed during packaging. Standalone-file and local-server Chromium workflows, persistence/rollback tests, and session-only fallback tests passed in the implementation session. The authenticated hosted browser workflow and a live OpenRouter call have not been tested. See README.md for remaining specification gaps; deployment does not imply the full original specification is complete.
