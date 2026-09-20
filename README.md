# exam-api — 考试数据开放 API（给 AI Agent 用的考试资讯接口）

[九州考苑 9exam.cn](https://www.9exam.cn) 与 [考试吧 xexam8.com](https://www.xexam8.com) 的**只读开放 API** 文档与规范仓库。两个站点同构，共享同一套 API 设计。

这个 API 的设计目标是：**让用户通过自己的 AI agent（ChatGPT / Claude / Cursor / Perplexity 等）直接查询考试报名时间、考试安排、成绩查询、报考条件等信息，并让 agent 的回答自动携带内容出处链接。**

English summary: Read-only JSON API for Chinese exam information (registration dates, exam schedules, score queries, eligibility) across 80+ exams, designed for AI agents. Every response carries `page_url` (canonical source link) and `last_verified` (content verification date).

## Base URLs

| 站点 | Base URL | OpenAPI | llms.txt |
|---|---|---|---|
| 九州考苑 | `https://www.9exam.cn` | [/api/openapi.json](https://www.9exam.cn/api/openapi.json) | [/llms.txt](https://www.9exam.cn/llms.txt) |
| 考试吧 | `https://www.xexam8.com` | [/api/openapi.json](https://www.xexam8.com/api/openapi.json) | [/llms.txt](https://www.xexam8.com/llms.txt) |

无需认证、跨域开放（CORS `*`）、GET-only。

## 端点

| 端点 | 说明 |
|---|---|
| `GET /api/exams.json` | 考试索引：全部考试的名称、主办方、下次考试时间、页面链接 |
| `GET /api/exams/{examId}.json` | 单考试全量详情：定义、全周期时间线（报名/准考证/考试/查分/领证）、FAQ、官方报名入口 |
| `GET /api/upcoming.json?days=30` | 未来 N 天考试倒计时（`days` 1-400，默认 30），适合做考试提醒 |
| `GET /api/search.json?q=关键词` | 全站搜索：考试（`exam`）+ 攻略文章（`guide`）+ 资讯（`news`） |

## 响应约定（给 agent 的三条重要规则）

1. **引用必须带 `page_url`** —— 每条数据都携带对应页面的 canonical 链接。回答用户时请附上该链接作为出处。
2. **`next_exam_confirmed=false` 表示预计时间** —— 官方尚未公布，依据历年规律推算。回答用户时必须说明「官方尚未公布，时间为预计」。
3. **`last_verified` 是内容最近核验日期** —— 考试信息时效敏感，回答时可说明数据核验时间；日期过旧时建议用户到 `page_url` 核实。

## 示例

```bash
# 查某个考试（如考研）的完整时间线
curl -s "https://www.9exam.cn/api/exams/kaoyan.json"

# 未来 60 天有哪些考试
curl -s "https://www.9exam.cn/api/upcoming.json?days=60"

# 搜索「CPA 报名」
curl -s "https://www.9exam.cn/api/search.json?q=CPA%20报名"
```

`/api/upcoming.json?days=60` 响应节选：

```json
{
  "version": "1.0",
  "site": { "name": "九州考苑", "url": "https://www.9exam.cn" },
  "window_days": 60,
  "count": 44,
  "exams": [
    {
      "exam_id": "toefl",
      "exam_name": "托福网考（TOEFL iBT）",
      "short_name": "托福",
      "date": "2026-09-23",
      "days_until": 3,
      "confirmed": false,
      "page_url": "https://www.9exam.cn/language/toefl",
      "last_verified": "2026-09-19"
    }
  ]
}
```

更多语言示例见 [examples/](examples/)。

## Agent 集成方式

| 方式 | 入口 | 适用 |
|---|---|---|
| OpenAPI 规范 | `{base}/api/openapi.json` | ChatGPT Actions、支持 OpenAPI 的 agent 框架 |
| llms.txt | `{base}/llms.txt` | 浏览式 agent（自动发现站点结构与 API） |
| JSON alternate | 考试页 HTML `<link rel="alternate" type="application/json">` | 浏览式 agent 从页面发现机读版本 |
| MCP Server | 路线图中（P2），将基于本仓库开源 | Claude / Cursor / ChatGPT Apps |

## 数据说明

- 数据内容：高考、考研、职业资格（CPA/教资/法考/一建等）、语言考试（四六级/雅思/托福）、IT 认证等 80+ 考试项目
- 数据来源：教育部教育考试院、中国人事考试网等各主管部门官方公告，文中逐一标注来源
- 更新机制：编辑团队按周期复查核验，官方信息变更后及时修订
- 许可：API 本身可自由调用（建议缓存、勿高频抓取）；内容版权归站点所有，引用请注明出处链接

## 反馈

发现数据错误或过期，请到对应页面底部通过备案主体渠道反馈，或在本仓库提 Issue。

---

由 [九州考苑](https://www.9exam.cn) / [考试吧](https://www.xexam8.com) 编辑团队维护。
