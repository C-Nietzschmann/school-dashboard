/* A minimal MCP server over Streamable HTTP — just enough for claude.ai to use
   the dashboard as a custom connector, with no SDK and no dependencies.

   Why it exists: the companion app runs inside Claude as an artifact, and an
   artifact has no network of its own. What it does have is the viewer's
   connectors. Add this server as one (Settings → Connectors → Add custom
   connector, URL https://<your host>/mcp/<APP_TOKEN>) and the artifact — and
   Claude chat — can read today's plan and write changes back.

   The protocol here is JSON-RPC 2.0 over POST. Every request gets a plain JSON
   response; notifications get 202 and no body. There is no server-to-client
   stream, so GET is refused with 405, which the spec allows.                 */

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];

export function createMcpServer({ name, version, instructions, tools }) {
  const byName = new Map(tools.map((t) => [t.name, t]));
  const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
  const fail = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

  async function one(msg) {
    if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
      return fail(msg?.id, -32600, 'invalid request');
    }
    const { id, method, params = {} } = msg;
    const isNote = id === undefined || id === null;
    if (isNote) return null;                       // notifications/initialized and friends

    switch (method) {
      case 'initialize': {
        const asked = params.protocolVersion;
        return ok(id, {
          protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[1],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name, version },
          instructions,
        });
      }
      case 'ping':
        return ok(id, {});
      case 'tools/list':
        return ok(id, { tools: tools.map(({ name, title, description, inputSchema, annotations }) =>
          ({ name, title, description, inputSchema, annotations })) });
      case 'tools/call': {
        const tool = byName.get(params.name);
        if (!tool) return fail(id, -32602, `unknown tool ${params.name}`);
        try {
          const out = await tool.handler(params.arguments || {});
          // a tool with pictures to show hands back its own content blocks
          if (Array.isArray(out?.$content)) return ok(id, { content: out.$content });
          return ok(id, { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out });
        } catch (e) {
          // a tool that ran and failed is a result, not a protocol error — the
          // caller should see the message
          return ok(id, { content: [{ type: 'text', text: 'Error: ' + (e?.message || String(e)) }], isError: true });
        }
      }
      default:
        return fail(id, -32601, `method not found: ${method}`);
    }
  }

  // Returns the response body, or null when nothing should be sent (202).
  return async function handle(body) {
    if (Array.isArray(body)) {
      const out = (await Promise.all(body.map(one))).filter(Boolean);
      return out.length ? out : null;
    }
    return one(body);
  };
}
