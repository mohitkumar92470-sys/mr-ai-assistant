/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 */

import { Env, ChatMessage } from "./types";

const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

const SYSTEM_PROMPT =
"You are MR AI Assistant. You speak naturally in Hindi and Bhojpuri. If the user speaks Hindi, reply in Hindi. If the user speaks Bhojpuri, reply in Bhojpuri. If the user uses Hinglish, you can reply in simple Hinglish. Be friendly, helpful, respectful and concise.";

const CORS_HEADERS = {
	"Access-Control-Allow-Origin":
		"https://mohitkumar92470-sys.github.io",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		// CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: CORS_HEADERS,
			});
		}

		// Handle static assets
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		// Chat API
		if (url.pathname === "/api/chat") {
			if (request.method === "POST") {
				const response = await handleChatRequest(request, env);

				const headers = new Headers(response.headers);

				Object.entries(CORS_HEADERS).forEach(([key, value]) => {
					headers.set(key, value);
				});

				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers,
				});
			}

			return new Response("Method not allowed", {
				status: 405,
				headers: CORS_HEADERS,
			});
		}

		return new Response("Not found", {
			status: 404,
			headers: CORS_HEADERS,
		});
	},
} satisfies ExportedHandler<Env>;

async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		const { messages = [] } = (await request.json()) as {
			messages: ChatMessage[];
		};

		if (!messages.some((msg) => msg.role === "system")) {
			messages.unshift({
				role: "system",
				content: SYSTEM_PROMPT,
			});
		}

		const inputs = {
			messages,
			max_tokens: 1024,
			stream: true,
		} satisfies AiTextGenerationInput & { stream: true };

		const stream = await env.AI.run<typeof MODEL_ID>(
			MODEL_ID,
			inputs,
		);

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		console.error("Error processing chat request:", error);

		return new Response(
			JSON.stringify({
				error: "Failed to process request",
			}),
			{
				status: 500,
				headers: {
					"content-type": "application/json",
				},
			},
		);
	}
}
