/**
 * 极简无状态 MCP（Model Context Protocol）服务端
 * 实现 Streamable HTTP 传输的 JSON-RPC 2.0 子集：
 *   initialize / ping / tools/list / tools/call / notifications/* / batch
 * - 无 session（PM2 cluster 安全）：不签发 MCP-Session-Id
 * - 响应为 application/json（Spec 允许的非流式模式）
 * - 只读工具、CORS 开放，无敏感数据面
 */

export interface McpToolDef {
  name: string;
  description: string;
  /** JSON Schema object（inputSchema） */
  inputSchema: Record<string, any>;
  /** 返回可 JSON 序列化的数据；自动包装为 content + structuredContent */
  handler: (args: any) => Promise<any>;
}

export interface McpServerOptions {
  serverName: string;
  version: string;
  tools: McpToolDef[];
  /** initialize 响应中的 instructions，指导 agent 正确使用工具 */
  instructions?: string;
}

const PROTOCOL_VERSION = '2025-06-18';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id',
};

function ok(id: any, result: any) {
  return { jsonrpc: '2.0', id, result };
}
function err(id: any, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

export function createMcpHandler(opts: McpServerOptions) {
  async function handleMessage(msg: any): Promise<object | null> {
    if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0') {
      return err(msg?.id ?? null, -32600, 'Invalid Request');
    }
    const { id, method, params } = msg;
    const isNotification = id === undefined || id === null && String(method).startsWith('notifications/');

    try {
      switch (method) {
        case 'initialize':
          return ok(id, {
            protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: opts.serverName, version: opts.version },
            ...(opts.instructions ? { instructions: opts.instructions } : {}),
          });
        case 'notifications/initialized':
        case 'notifications/cancelled':
        case 'notifications/progress':
          return null; // notification，无响应体
        case 'ping':
          return ok(id, {});
        case 'tools/list':
          return ok(id, {
            tools: opts.tools.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          });
        case 'tools/call': {
          const tool = opts.tools.find((t) => t.name === params?.name);
          if (!tool) return err(id, -32602, `Unknown tool: ${params?.name}`);
          try {
            const data = await tool.handler(params?.arguments ?? {});
            return ok(id, {
              content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
              structuredContent: data,
            });
          } catch (e: any) {
            return ok(id, {
              content: [{ type: 'text', text: `Error: ${e?.message || 'tool failed'}` }],
              isError: true,
            });
          }
        }
        case 'resources/list':
          return ok(id, { resources: [] });
        case 'resources/templates/list':
          return ok(id, { resourceTemplates: [] });
        case 'prompts/list':
          return ok(id, { prompts: [] });
        default:
          if (isNotification) return null;
          return err(id, -32601, `Method not found: ${method}`);
      }
    } catch (e: any) {
      return err(id ?? null, -32603, e?.message || 'Internal error');
    }
  }

  return async function handleRequest(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method === 'GET') {
      // 无状态模式不提供 SSE 流（Spec 允许 405）
      return new Response(
        JSON.stringify({ error: 'This MCP server is stateless; POST JSON-RPC requests only.' }),
        { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify(err(null, -32700, 'Parse error')), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const isBatch = Array.isArray(body);
    const msgs = isBatch ? body : [body];
    const results = (await Promise.all(msgs.map((m) => handleMessage(m)))).filter((r) => r !== null);

    if (results.length === 0) {
      return new Response(null, { status: 202, headers: CORS });
    }
    return new Response(JSON.stringify(isBatch ? results : results[0]), {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  };
}
