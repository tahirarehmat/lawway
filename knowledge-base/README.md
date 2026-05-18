# Lawway AI knowledge base

Place your firm documents here so the landing-page chat assistant can answer from them.

## Where to put files

| Folder | File types | Example |
|--------|------------|---------|
| `knowledge-base/pdfs/` | `.pdf` | `firm-faq.pdf`, `Pakistan_Family_Laws_Guide.pdf` |
| `knowledge-base/text/` | `.md`, `.txt` | `intake-guide.md`, `services.txt` |

After adding or updating files, **restart the Next.js dev server** (`npm run dev`).

## AI provider (recommended: Groq or OpenAI)

The assistant reads **all PDF/text files** from this folder and sends that content to the model with each question (RAG-style, no separate training step).

Add **one** of these to `.env` in the project root (server-only — no `NEXT_PUBLIC_`):

### Option A — Groq (fast, generous free tier)

1. Create a key at [https://console.groq.com/keys](https://console.groq.com/keys)
2. Add to `.env`:

```env
GROQ_API_KEY=gsk_xxxxxxxx
# Optional
GROQ_MODEL=llama-3.3-70b-versatile
AI_PROVIDER=groq
```

### Option B — OpenAI

1. Create a key at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Add to `.env`:

```env
OPENAI_API_KEY=sk-xxxxxxxx
# Optional
OPENAI_MODEL=gpt-4o-mini
AI_PROVIDER=openai
```

### Provider order

- Set `AI_PROVIDER=groq` or `openai` to force one provider.
- If omitted, order is: **Groq** (if `GROQ_API_KEY`) → **OpenAI** (if `OPENAI_API_KEY`) → **Gemini** (if `GEMINI_API_KEY`).

### Legacy Gemini (optional)

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
```

## Firestore (messages)

Landing chat messages are stored at:

```
landing_chats/{guestSessionId}/messages/{messageId}
```

Update Firebase **Firestore rules** to allow writes for landing chat in development.

## Tips

- Use **text-based PDFs** (not scanned images). Scanned PDFs need OCR first.
- Keep files focused; very large PDF sets increase API cost and latency.
- Do not put confidential client data in this folder if the chat is public on the landing page.
