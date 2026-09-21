# MCP Server 接入指南

两个站点的 MCP（Model Context Protocol）端点已上线，供 AI agent 以原生工具方式调用考试数据：

| 站点 | MCP Endpoint | 方式 |
|---|---|---|
| 九州考苑 | `https://www.9exam.cn/api/mcp` | POST JSON-RPC（无状态） |
| 新考试吧 | `https://www.xexam8.com/api/mcp` | POST JSON-RPC（无状态） |

- 传输：MCP Streamable HTTP（响应为 `application/json`，非 SSE）
- 无状态：不签发 `MCP-Session-Id`，任意节点可处理任意请求
- 无需认证，CORS 开放

## 可用 Tools

| Tool | 说明 |
|---|---|
| `search_exams(keyword)` | 按关键词搜索考试，返回考试列表 + 页面链接 |
| `get_exam_detail(exam_id)` | 考试全量详情：时间线、FAQ、官方报名入口 |
| `list_upcoming_exams(days?)` | 未来 N 天考试倒计时（1-400，默认 30） |
| `search_content(query)` | 全站搜索：考试 / 攻略文章 / 资讯 |
| `get_exam_calendar(exam_id)` | 考试 ICS 订阅链接与事件列表（建倒计时/提醒） |
| `list_categories()` | 考试分类列表 |

## 客户端配置

**Claude Desktop / Cursor**（`mcp` 配置段）：

```json
{
  "mcpServers": {
    "9exam": {
      "url": "https://www.9exam.cn/api/mcp"
    }
  }
}
```

**ChatGPT**：通过「连接器 / Apps」添加自定义 MCP，填同一 URL。

## 手动测试

```bash
# 握手
curl -X POST https://www.9exam.cn/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"0.1"}}}'

# 列出工具
curl -X POST https://www.9exam.cn/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 调用：搜索考研
curl -X POST https://www.9exam.cn/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_exams","arguments":{"keyword":"考研"}}}'
```

## 参考实现

[`stateless-mcp-server.ts`](stateless-mcp-server.ts) 是本站生产环境在用的无状态 MCP 服务端骨架（约 130 行，零依赖，TypeScript）——实现 `initialize` / `ping` / `tools/list` / `tools/call` / `notifications/*` / 批量请求，可直接用于任何 Fetch API 风格的运行时（Astro / Cloudflare Workers / Deno 等）。工具的业务数据层在各站点仓库中。
