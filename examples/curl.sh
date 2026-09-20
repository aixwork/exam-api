#!/usr/bin/env bash
# exam-api curl 示例（把 BASE 换成 https://www.xexam8.com 可访问考试吧的同名 API）
BASE="https://www.9exam.cn"

echo "== 考试索引（前 3 条）=="
curl -s "$BASE/api/exams.json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d['exams'][:3], ensure_ascii=False, indent=2))"

echo "== 考研详情（时间线节点数 / FAQ 数）=="
curl -s "$BASE/api/exams/kaoyan.json" | python3 -c "import json,sys; d=json.load(sys.stdin)['exam']; print('timeline:', len(d['timeline']), 'faq:', len(d['faq']), 'page:', d['page_url'])"

echo "== 未来 30 天考试 =="
curl -s "$BASE/api/upcoming.json?days=30" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f\"{x['date']} (+{x['days_until']}d) {x['short_name']} confirmed={x['confirmed']} → {x['page_url']}\") for x in d['exams']]"

echo "== 搜索「教资」=="
curl -s "$BASE/api/search.json?q=%E6%95%99%E8%B5%84" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(f\"[{r['type']}] {r.get('title') or r.get('short_name')} → {r['page_url']}\") for r in d['results'][:10]]"
