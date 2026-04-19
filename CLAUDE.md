## graphify

This project has a graphify knowledge graph committed at `docs/architecture-graph/`.

Rules:
- Before answering architecture or codebase questions, read `docs/architecture-graph/GRAPH_REPORT.md` for god nodes and community structure
- If `docs/architecture-graph/wiki/index.md` exists, navigate it instead of reading raw files
- After modifying code files in this session, run `bash scripts/update-graph.sh` to keep the graph current (AST-only, no API cost)
