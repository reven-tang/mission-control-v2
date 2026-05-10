#!/usr/bin/env python3
"""
Quill Agent — Content Research & Script Generation
Integrates with last30days for trend analysis
"""

import subprocess
import json
import sys
from pathlib import Path

SKILL_PATH = Path.home() / '.openclaw' / 'workspace' / 'skills' / 'last30days-official' / 'scripts' / 'last30days.py'

def run_research(topic: str) -> dict:
    """Run last30days research on topic"""
    cmd = [sys.executable, str(SKILL_PATH), topic, '--quick', '--emit', 'compact']
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            return {'error': result.stderr[:200]}
        
        # Parse compact output
        lines = result.stdout.strip().split('
')
        keywords = []
        trends = []
        competitors = []
        
        for line in lines:
            if 'pain point' in line.lower() or 'issue' in line.lower():
                keywords.append(line.split(':')[0].strip() if ':' in line else line.strip())
            if 'trend' in line.lower() or 'growth' in line.lower():
                trends.append({'keyword': line.strip(), 'volume': 1000, 'growth': 10})
        
        return {
            'topic': topic,
            'keywords': keywords[:10],
            'trends': trends[:5],
            'competitors': [],
            'outline': generate_outline(keywords[:5]),
            'seo_recommendations': [f'Include keyword: {k}' for k in keywords[:5]],
        }
    except Exception as e:
        return {'error': str(e)}

def generate_outline(keywords: list) -> list:
    """Generate content outline from keywords"""
    if not keywords:
        return []
    
    outline = [
        {'section': 'Introduction', 'points': [f'Hook: {keywords[0]}']},
        {'section': 'Problem Analysis', 'points': [f'Pain point: {k}' for k in keywords[:3]]},
        {'section': 'Solutions', 'points': ['Best practices', 'Tools & techniques']},
        {'section': 'Conclusion', 'points': ['Summary', 'Call to action']},
    ]
    return outline

def generate_script(research: dict) -> str:
    """Generate content script from research"""
    topic = research.get('topic', 'Unknown')
    keywords = research.get('keywords', [])
    outline = research.get('outline', [])
    
    script = f"""
# {topic}

## Introduction
Today we're exploring {topic}.
Key topics: {', '.join(keywords[:3])}.

## Content Body
"""
    
    for section in outline:
        script += f"
### {section['section']}
"
        for point in section.get('points', []):
            script += f"- {point}
"
    
    script += f"""
## SEO Keywords
{', '.join(keywords[:10])}

## Recommended Platforms
- 微信公众号
- 小红书
- 知乎
"""
    
    return script.strip()

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('topic', help='Research topic')
    parser.add_argument('--output', '-o', help='Output JSON file')
    args = parser.parse_args()
    
    research = run_research(args.topic)
    script = generate_script(research)
    
    result = {
        'research': research,
        'script': script,
        'status': 'completed' if 'error' not in research else 'failed',
    }
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)
    else:
        print(json.dumps(result, indent=2))
