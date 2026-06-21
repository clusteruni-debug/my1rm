# my1rm — Reference Ledger

Durable web-research references for this project. Before re-fetching an external
source, run from the workspace root:

    python -X utf8 scripts/check-web-reference-ledger.py --query "<topic>"

After web research that changes this project's code, tests, data interpretation,
or a decision, add a doc here with frontmatter:

    ---
    last_verified: YYYY-MM-DD
    sources:
      - <source name or URL>
    reliability: primary | vendor-doc | analyst | secondary
    aliases:
      - <optional synonym so a differently-worded query still finds this>
    refresh_trigger: <when the source can affect this project's code or decisions>
    ---

Full rule: root CLAUDE.md "Web Research — Reference Ledger" plus
docs/ops/CODEX-WEB-REFERENCE-LEDGER.md.
Helpfulness (how many re-fetches a doc has blocked) is surfaced by the scanner
via the --by-helpfulness flag.
