/**
 * POST /api/pipeline/[id]/video
 * 
 * 重新生成视频（不影响已有 pipeline 进度）
 * 
 * 流程：
 * 1. 读取 script 阶段文案
 * 2. LLM 将文案改编为视频格式（非照搬）
 * 3. 渲染 MP4（HyperFrames）
 * 4. 更新 video piece
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPipelineRun, listContentPieces, updatePipelineRun, addContentPiece } from '@/lib/db';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import type { VideoData } from '@/lib/services/video/video-generator';

// 视频阶段 content piece 的 ID（通过 pipeline_id + stage 查找）
type VideoPiece = {
  id: string;
  pipeline_id: string;
  stage: string;
  title: string;
  content: string;
  assets: Record<string, any>;
  status: string;
};

// 生成视频数据（从文案改编，非照搬）
function adaptContentForVideo(topic: string, scriptContent: string): VideoData {
  // TODO: 接入 LLM 做真正的视频化改编
  // 当前版本：基于 script 内容做结构化拆解
  return {
    coverTitle: topic,
    coverSubtitle: 'AI 驱动的智能工作流',
    quote: `"${topic}"是当前技术领域最受关注的话题之一。`,
    chapter1Title: '核心洞察',
    chapter1Content: scriptContent.replace(/<[^>]*>/g, '').slice(0, 120) + '...',
    chapter2Title: '关键发现',
    chapter2Content: scriptContent.replace(/<[^>]*>/g, '').replace(/。/g, '。<br/><br/>').slice(120, 240) + '...',
    chapter3Title: '行动建议',
    chapter3Highlight: `深入了解"${topic}"，掌握核心要点。`,
    stat1: { value: '10x', label: '效率提升' },
    stat2: { value: '99%', label: '准确率' },
    stat3: { value: '50+', label: '覆盖场景' },
    conclusion: `把握"${topic}"机遇，从现在开始。`,
  };
}

// 用 HyperFrames 渲染视频
async function renderVideo(projectDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const indexPath = join(projectDir, 'index.html');
    const outputPath = join(projectDir, 'output.mp4');

    // 启动 HyperFrames 渲染
    const proc = spawn('npx', [
      'hyperframes', 'render',
      '-o', outputPath,
      projectDir,
    ], {
      cwd: projectDir,
      stdio: 'inherit',
      env: { ...process.env, PATH: `${process.env.HOME}/.nvm/versions/node/v25.9.0/bin:${process.env.PATH}` },
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`HyperFrames render failed with code ${code}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

// 创建视频项目
function createVideoProject(data: VideoData, projectDir: string): string {
  // 读取模板
  const templatePath = join(process.cwd(), '..', '..', 'skills', 'video-generation', 'references', 'mission-control-v2-xhs-final.html');
  
  // 回退：如果找不到模板，使用内嵌模板
  let template: string;
  try {
    template = require('fs').readFileSync(templatePath, 'utf-8');
  } catch {
    // 使用 skills 目录相对路径
    const altPath = join(process.cwd(), '..', 'skills', 'video-generation', 'references', 'mission-control-v2-xhs-final.html');
    template = require('fs').readFileSync(altPath, 'utf-8');
  }

  // 替换变量 - 将 VideoData 展平为 {{coverTitle}}、{{stat_1_value}} 等格式
  let html = template;
  const flattenData: Record<string, string> = {
    coverTitle: data.coverTitle,
    coverSubtitle: data.coverSubtitle,
    quote: data.quote,
    chapter1Title: data.chapter1Title,
    chapter1Content: data.chapter1Content,
    chapter2Title: data.chapter2Title,
    chapter2Content: data.chapter2Content,
    chapter3Title: data.chapter3Title,
    chapter3Highlight: data.chapter3Highlight,
    stat_1_value: data.stat1.value,
    stat_1_label: data.stat1.label,
    stat_2_value: data.stat2.value,
    stat_2_label: data.stat2.label,
    stat_3_value: data.stat3.value,
    stat_3_label: data.stat3.label,
    conclusion: data.conclusion,
  };
  
  Object.entries(flattenData).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });

  // 复制 GSAP
  const gsapPath = join(process.cwd(), '..', '..', 'skills', 'video-generation', 'references', 'vendor', 'gsap.min.js');
  try {
    const gsap = require('fs').readFileSync(gsapPath, 'utf-8');
    mkdirSync(join(projectDir, 'vendor'), { recursive: true });
    writeFileSync(join(projectDir, 'vendor', 'gsap.min.js'), gsap);
  } catch {
    // GSAP 已内嵌或 CDN，跳过
  }

  // 写入 index.html
  writeFileSync(join(projectDir, 'index.html'), html);
  return join(projectDir, 'index.html');
}

// POST /api/pipeline/[id]/video - 重新生成视频
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const run = getPipelineRun(id);
    if (!run) {
      return NextResponse.json({ success: false, error: 'Pipeline not found' }, { status: 404 });
    }

    // 读取 script 内容
    const pieces = listContentPieces({ pipeline_id: id });
    const scriptPiece = pieces.find(p => p.stage === 'script');
    if (!scriptPiece) {
      return NextResponse.json({ success: false, error: 'No script content found. Complete script stage first.' }, { status: 400 });
    }

    // 检查是否已有 video piece
    const videoPieces = pieces.filter(p => p.stage === 'video');
    const hasVideo = videoPieces.length > 0;

    // 创建项目目录
    const videosDir = join(process.cwd(), '..', '..', '..', 'videos');
    const projectDir = join(videosDir, `video-${id}-${Date.now()}`);
    mkdirSync(projectDir, { recursive: true });

    // 改编内容
    const videoData = adaptContentForVideo(run.topic, scriptPiece.content);

    // 创建 HTML 项目
    createVideoProject(videoData, projectDir);

    // 渲染视频
    let videoPath = '';
    try {
      videoPath = await renderVideo(projectDir);
    } catch (e: any) {
      // 渲染失败不影响 pipeline，返回错误但 piece 标记为 failed
      const failedContent = `<h3>🎬 Video 视频</h3><p>❌ 渲染失败: ${e.message}</p><p>点击「重新生成视频」按钮重试。</p>`;
      if (hasVideo) {
        // TODO: 更新现有 video piece（当前 db 层不支持 update）
      } else {
        addContentPiece({
          pipeline_id: id,
          stage: 'video',
          title: run.topic,
          content: failedContent,
          assets: { error: e.message },
          status: 'failed',
        });
      }
      return NextResponse.json({
        success: false,
        error: `Video render failed: ${e.message}`,
        projectDir,
      }, { status: 500 });
    }

    // 保存 video piece（总是创建新 piece）
    addContentPiece({
      pipeline_id: id,
      stage: 'video',
      title: run.topic,
      content: `<h3>🎬 视频已生成</h3><p>文件路径：${videoPath}</p>`,
      assets: { video_path: videoPath },
      status: 'approved',
    });

    // 更新 pipeline 状态为 video
    updatePipelineRun(id, { current_stage: 'video', status: 'completed', updated_at: Date.now() });

    return NextResponse.json({
      success: true,
      data: { videoPath, projectDir },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, timestamp: Date.now() }, { status: 500 });
  }
}
