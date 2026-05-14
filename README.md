# YouTube Transcript Analyzer — Claude AI + MCP

From the tutorial: **How to Automate Anything with Python Inside Claude Desktop (Using MCP)**

This repo has two things:

1. **Python MCP Server** (`server.py`) — run locally with Claude Desktop or Claude Code
2. **Web App** (`web/`) — deployed on Vercel, same functionality in the browser

---

## Python MCP Server (Local)

### Requirements
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Claude Desktop or Claude Code

### Run dev server
```bash
mcp dev server.py
```

### Connect to Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "YouTube": {
      "command": "uv",
      "args": ["--directory", "<ABSOLUTE_PATH>", "run", "server.py"]
    }
  }
}
```

### Connect to Claude Code CLI
```bash
claude mcp add --transport stdio YouTube -- uv --directory "<ABSOLUTE_PATH>" run server.py
```

---

## Web App

Live: **https://yt-transcript-ai.vercel.app**

```bash
cd web && npm install && npm run dev
```
Needs `ANTHROPIC_API_KEY` in `web/.env.local`.
