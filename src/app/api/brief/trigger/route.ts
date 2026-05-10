import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';

const runBrief = () => {
  return execSync('python3 /Users/jhwu/.openclaw/workspace/tools/brief.py', {
    encoding: 'utf-8', timeout: 30000
  });
};

export async function GET() {
  try {
    const out = runBrief();
    return NextResponse.json({ success: true, content: out, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}

export async function POST() {
  try {
    const out = runBrief();
    return NextResponse.json({ success: true, content: out, timestamp: Date.now() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}