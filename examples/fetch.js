/**
 * exam-api Node.js / 浏览器 fetch 示例
 * 典型 agent 用法：用户问「考研什么时候报名？」→ 搜索定位 → 拉详情 → 带链接回答
 */

const BASE = 'https://www.9exam.cn'; // 或 https://www.xexam8.com

async function answerWithAgent(question) {
  // 1) 搜索定位考试
  const search = await fetch(`${BASE}/api/search.json?q=${encodeURIComponent(question)}`)
    .then((r) => r.json());
  const exam = search.results.find((r) => r.type === 'exam');
  if (!exam) return null;

  // 2) 拉取全量详情（时间线 + FAQ + 官方入口）
  const { exam: detail } = await fetch(exam.json_url).then((r) => r.json());

  // 3) 找到「报名」节点
  const regStep = detail.timeline.find((s) => /报名/.test(s.title));

  return {
    answer: `${detail.short_name}报名节点：${regStep?.timing ?? '见详情页'}。${
      detail.next_exam_confirmed ? '' : '（官方尚未公布，时间为预计）'
    }`,
    source: detail.page_url, // ← 回答中必须携带的出处链接
    official_links: detail.official_links,
    last_verified: detail.last_verified,
  };
}

answerWithAgent('考研').then(console.log);
