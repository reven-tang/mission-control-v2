#!/usr/bin/env python3
"""
Mission Control v2 — Research Pipeline
自动执行：last30days 引擎 → 解析痛点 → 创建 Opportunities → 高优先级自动建任务
"""

import subprocess
import json
import re
import sys
import os
from datetime import datetime
from pathlib import Path

# 配置
MC_PORT = os.getenv('MC_PORT', '3001')
MC_BASE = f'http://localhost:{MC_PORT}'
SKILL_PATH = Path.home() / '.openclaw' / 'workspace' / 'skills' / 'last30days-official' / 'scripts' / 'last30days.py'
SAVE_DIR = Path('/tmp/last30days-research')

# 研究主题（可配置）
TOPICS = [
    "AI agent user pain points",
    "AI agent cost tracking issues",
    "AI agent observability problems",
]

def run_last30days(topic: str) -> str:
    """执行 last30days 引擎，返回 markdown 输出"""
    print(f"🔬 Running last30days: {topic}")
    SAVE_DIR.mkdir(exist_ok=True)
    
    cmd = [
        sys.executable, str(SKILL_PATH),
        topic,
        "--quick",
        "--emit", "md",
        "--save-dir", str(SAVE_DIR),
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            print(f"⚠️  Engine error: {result.stderr[:200]}")
            return ""
        return result.stdout
    except subprocess.TimeoutExpired:
        print(f"⚠️  Engine timeout")
        return ""

def parse_pain_points(markdown: str) -> list:
    """解析 markdown 输出为痛点列表"""
    pains = []
    current = {}
    
    for line in markdown.split('\n'):
        line = line.strip()
        
        # 标题行
        if line.startswith('## '):
            if current.get('title'):
                pains.append(current)
            current = {'title': line.replace('## ', ''), 'description': '', 'tags': []}
        
        # 来源
        elif line.startswith('- Source:'):
            current['source'] = line.replace('- Source:', '').strip()
        
        # URL
        elif line.startswith('- URL:'):
            current['source_url'] = line.replace('- URL:', '').strip()
        
        # Engagement
        elif line.startswith('- Engagement:'):
            eng = line.replace('- Engagement:', '').strip()
            upvotes = re.search(r'(\d+)\s*upvotes?', eng)
            comments = re.search(r'(\d+)\s*comments?', eng)
            current['engagement'] = {
                'upvotes': int(upvotes.group(1)) if upvotes else 0,
                'comments': int(comments.group(1)) if comments else 0,
            }
        
        # Tags
        elif line.startswith('- Tags:'):
            tags = line.replace('- Tags:', '').strip()
            current['tags'] = [t.strip() for t in tags.split(',')]
        
        # 描述（累积）
        elif current.get('title') and line and not line.startswith('-'):
            current['description'] += line + ' '
    
    # 最后一个
    if current.get('title'):
        pains.append(current)
    
    # 清理描述
    for p in pains:
        p['description'] = p['description'].strip()[:500]
        p['severity'] = infer_severity(p.get('engagement', {}))
    
    return pains

def infer_severity(engagement: dict) -> str:
    """根据互动数据推断严重度"""
    comments = engagement.get('comments', 0)
    if comments >= 20:
        return 'critical'
    elif comments >= 10:
        return 'high'
    elif comments >= 5:
        return 'medium'
    return 'low'

def post_pain_points(pains: list) -> list:
    """POST 痛点到 /api/research"""
    import urllib.request
    
    items = []
    for p in pains:
        if not p.get('title') or not p.get('description'):
            continue
        items.append({
            'title': p['title'][:100],
            'description': p['description'],
            'source': p.get('source', 'Unknown'),
            'source_url': p.get('source_url', ''),
            'engagement': p.get('engagement', {}),
            'tags': p.get('tags', [])[:5],
            'severity': p.get('severity', 'medium'),
        })
    
    if not items:
        print("⚠️  No valid pain points to import")
        return []
    
    print(f"📥 Importing {len(items)} pain points...")
    req = urllib.request.Request(
        f'{MC_BASE}/api/research',
        data=json.dumps({'items': items}).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        res = urllib.request.urlopen(req, timeout=30)
        result = json.loads(res.read())
        if result.get('success'):
            print(f"✅ Imported {len(result.get('data', []))} pain points")
            return result.get('data', [])
        else:
            print(f"❌ Import failed: {result.get('error')}")
            return []
    except Exception as e:
        print(f"❌ Network error: {e}")
        return []

def create_opportunities(pain_points: list) -> list:
    """自动从痛点创建 Opportunities（按 tags 聚类）"""
    import urllib.request
    
    # 简单聚类：按 severity 分组
    clusters = {}
    for pp in pain_points:
        sev = pp.get('severity', 'medium')
        if sev not in clusters:
            clusters[sev] = []
        clusters[sev].append(pp)
    
    opportunities = []
    for severity, pps in clusters.items():
        if not pps:
            continue
        
        # 为每个聚类创建 opportunity
        title = f"Solve {severity} pain points: {pps[0]['title'][:50]}"
        desc = f"Address {len(pps)} {severity}-severity pain points:\n" + '\n'.join(f"- {p['title']}" for p in pps[:5])
        
        req = urllib.request.Request(
            f'{MC_BASE}/api/opportunities',
            data=json.dumps({
                'pain_point_ids': [p['id'] for p in pps],
                'title': title,
                'description': desc,
                'score': 80 if severity == 'critical' else 60 if severity == 'high' else 40,
            }).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST',
        )
        try:
            res = urllib.request.urlopen(req, timeout=30)
            result = json.loads(res.read())
            if result.get('success'):
                opportunities.append(result.get('data'))
                print(f"✅ Created opportunity: {title[:60]}")
        except Exception as e:
            print(f"⚠️  Failed to create opportunity: {e}")
    
    return opportunities

def build_mvp_for_high_priority(opportunities: list):
    """为高优先级 opportunities 自动 Build MVP"""
    import urllib.request
    
    for opp in opportunities:
        if opp.get('score', 0) >= 70:  # 高优先级
            opp_id = opp.get('id')
            if not opp_id:
                continue
            
            print(f"🚀 Building MVP for: {opp.get('title', '')[:50]}")
            req = urllib.request.Request(
                f'{MC_BASE}/api/opportunities?id={opp_id}&action=build-mvp',
                method='POST',
            )
            try:
                res = urllib.request.urlopen(req, timeout=30)
                result = json.loads(res.read())
                if result.get('success'):
                    task = result.get('data', {}).get('task', {})
                    print(f"✅ MVP task created: {task.get('title', '')[:60]}")
            except Exception as e:
                print(f"⚠️  Failed to build MVP: {e}")

def main():
    print(f"🚀 Research Pipeline started at {datetime.now().isoformat()}")
    print(f"   MC Base: {MC_BASE}")
    print(f"   Topics: {len(TOPICS)}")
    print()
    
    all_pains = []
    for topic in TOPICS:
        md = run_last30days(topic)
        if md:
            pains = parse_pain_points(md)
            all_pains.extend(pains)
            print(f"   Found {len(pains)} pain points\n")
    
    if not all_pains:
        print("❌ No pain points found. Exiting.")
        return
    
    print(f"Total: {len(all_pains)} pain points\n")
    
    # 导入痛点
    imported = post_pain_points(all_pains)
    if not imported:
        print("❌ Failed to import pain points. Exiting.")
        return
    
    # 创建 opportunities
    opps = create_opportunities(imported)
    if not opps:
        print("⚠️  No opportunities created")
        return
    
    # 高优先级自动建 MVP
    build_mvp_for_high_priority(opps)
    
    print()
    print(f"✅ Pipeline completed at {datetime.now().isoformat()}")
    print(f"   Pain points: {len(imported)}")
    print(f"   Opportunities: {len(opps)}")
    print(f"   MVP tasks: created for high-priority opps")

if __name__ == '__main__':
    main()
