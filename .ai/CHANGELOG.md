# Candidate changes

2026-10-14: cloned verified repository; established baseline; researched primary documentation; created issue register and continuation state. Added executable outbox race regression (3 failures before fix, 4 passes after), queue serialization, browser media reader with three tests, web dependencies/parser, dependency lock and frozen CI/web-export gate. Database migrations: none. Live backend mutations: none. Production deployment: none.

Follow-up: owner binding (red/green 3 tests), acknowledged photo upload retry (red/green test), composer checkpoints, audience label correction, shared theme palette/background, responsive auth and accessible labels, removal of nonexistent OAuth screen registration. Final total 144 pass / 2 skipped. Browser auth visual checks and export passed; public auth endpoint HTTP 200.


Cold export fix: initialize NativeWind web CSS placeholder before Metro crawl. Reproduced in Linux CI; verified local export after removing generated web.css and clearing Metro cache. NativeWind still generates stylesheet contents.
