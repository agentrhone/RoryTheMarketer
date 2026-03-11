import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getBrand } from "@/lib/brands";
import { getContextBundle, formatContextForPrompt } from "@/lib/context-bundle";
import { appendMessage, updateChatTitle, getChat } from "@/lib/chat-storage";

const client = new Anthropic();

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brand: brandId, chatId, messages } = body as {
    brand?: string;
    chatId?: string;
    messages?: { role: "user" | "assistant"; content: string }[];
  };

  if (!brandId || !getBrand(brandId)) {
    return new Response(JSON.stringify({ error: "Invalid brand" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!chatId || !messages?.length) {
    return new Response(JSON.stringify({ error: "Missing chatId or messages" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    return new Response(JSON.stringify({ error: "Last message must be from user" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Persist user message
  appendMessage(brandId, chatId, "user", lastMessage.content);

  // Auto-title from first user message
  const chat = getChat(brandId, chatId);
  if (chat && chat.messages.length === 1) {
    const title = lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? "..." : "");
    updateChatTitle(brandId, chatId, title);
  }

  // Build system prompt
  const bundle = getContextBundle(brandId);
  const contextText = formatContextForPrompt(bundle);
  const systemPrompt = `You are Rory, a senior marketing strategist and expert copywriter. You help marketers create compelling campaigns, write copy, develop strategy, and solve marketing problems.

You are direct, knowledgeable, and opinionated. You give specific, actionable advice — not generic marketing platitudes. When you don't know something, you say so.

Use the brand context below to give grounded, specific advice. Reference the brand voice, personas, and USPs when relevant.

---

${contextText}`;

  // Stream response
  const stream = client.messages.stream({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
        // Persist assistant message after stream completes
        appendMessage(brandId, chatId, "assistant", fullResponse);
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
