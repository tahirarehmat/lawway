# Lawway AI knowledge base

Place your firm documents here so the landing-page chat assistant can answer from them. The assistant uses **Cerebras** only, with retrieval over curated folders plus a large pre-extracted statute corpus.

## Sources (what the AI reads)

| Source | Location | Role |
|--------|----------|------|
| Curated PDFs | `knowledge-base/pdfs/` (`.pdf`) | Firm guides / FAQs extracted at runtime |
| Curated text | `knowledge-base/text/` (`.md`, `.txt`) | Q&A and short guides |
| Statute corpus | `src/lib/pdf_data.json` | Pre-extracted PDF text (`file_name` + `text`); loaded once and cached in memory |

`loadKnowledgeContext(question?)` in `src/lib/knowledgeBase.ts` merges these sources, scores passages against the user question, and **caps** the context sent to Cerebras (so the large JSON corpus is not dumped wholesale).

After adding or updating files under `knowledge-base/`, **restart the Next.js dev server** (`npm run dev`). Changes to `pdf_data.json` also require a restart (cache is process-lifetime).

## AI provider (Cerebras only)

1. Create a key at [Cerebras Cloud API keys](https://cloud.cerebras.ai/)
2. Add to `.env` in the project root (**server-only** — do not use `NEXT_PUBLIC_`):

```env
CEREBRAS_API_KEY=csk-xxxxxxxx
# Optional
CEREBRAS_MODEL=llama-3.3-70b
AI_PROVIDER=cerebras
```

Restart the Next.js server after changing env vars.

If `CEREBRAS_API_KEY` is missing, the chat falls back to keyword search over the retrieved knowledge context (no other LLM providers).

## Firestore (messages)

Landing chat messages are stored at:

```
landing_chats/{guestSessionId}/messages/{messageId}
```

Update Firebase **Firestore rules** to allow writes for landing chat in development.

## Tips

- Use **text-based PDFs** in `knowledge-base/pdfs/` (not scanned images). Scanned PDFs need OCR first.
- Prefer updating `src/lib/pdf_data.json` for large statute sets; keep `knowledge-base/text/` for curated Q&A.
- Keep curated files focused; very large contexts increase API cost and latency.
- Do not put confidential client data in this folder or in `pdf_data.json` if the chat is public on the landing page.
- Never commit API keys or secrets.
