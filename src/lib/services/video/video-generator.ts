/**
 * Video Generation Service
 * 
 * 使用 HyperFrames 将文案转换为小红书 9:16 视频
 * 
 * 使用方法：
 *   const videoPath = await generateVideo({ title, subtitle, content... });
 */

import { spawn } from 'child_process';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';

export interface VideoData {
  // 封面
  coverTitle: string;
  coverSubtitle: string;
  // 引言
  quote: string;
  // 章节1
  chapter1Title: string;
  chapter1Content: string;
  // 章节2
  chapter2Title: string;
  chapter2Content: string;
  // 数据
  stat1: { value: string; label: string };
  stat2: { value: string; label: string };
  stat3: { value: string; label: string };
  // 章节3
  chapter3Title: string;
  chapter3Highlight: string;
  // 结论
  conclusion: string;
}

export interface GenerateVideoOptions {
  data: VideoData;
  outputDir?: string;
  templatePath?: string;
}

/**
 * 渲染视频
 * @param options 生成选项
 * @returns 生成的视频文件路径
 */
export async function generateVideo(options: GenerateVideoOptions): Promise<string> {
  const { data, outputDir, templatePath } = options;
  
  // 默认路径
  const defaultOutputDir = join(process.cwd(), 'videos');
  const defaultTemplatePath = join(
    process.cwd(), 
    'node_modules', 
    '..', 
    'skills', 
    'video-generation', 
    'references',
    'mission-control-v2-xhs-final.html'
  );
  
  const targetOutputDir = outputDir || defaultOutputDir;
  const targetTemplatePath = templatePath || defaultTemplatePath;
  
  // 确保输出目录存在
  if (!existsSync(targetOutputDir)) {
    mkdirSync(targetOutputDir, { recursive: true });
  }
  
  // 生成项目目录
  const projectDir = join(targetOutputDir, `video-${Date.now()}`);
  mkdirSync(projectDir, { recursive: true });
  
  // 复制模板
  const templateContent = require('fs').readFileSync(targetTemplatePath, 'utf-8');
  
  // 替换变量
  let html = templateContent
    .replace(/AI 驱动的<br\/>/g, data.coverTitle.replace(/<br\/>/g, ''))
    .replace(/让效率提升 10 倍/g, data.coverSubtitle)
    .replace(/2026年，AI agent 正在改变我们的工作方式。你是否也感受到了这场变革？/g, data.quote)
    .replace(/AI Agent 的现状/g, data.chapter1Title)
    .replace(/从 ChatGPT 到 Claude，AI agent 已经渗透到开发的每个环节。但真正的问题是：如何在实际项目中有效使用它们？/g, data.chapter1Content)
    .replace(/Mission Control V2<br\/>/g, data.chapter2Title.replace(/<br\/>/g, ''))
    .replace(/从需求分析到代码生成，从测试验证到部署发布，<span class="highlight">全流程自动化<\/span>。/g, data.chapter2Content)
    .replace(/10x/g, data.stat1.value)
    .replace(/开发效率提升/g, data.stat1.label)
    .replace(/99%/g, data.stat2.value)
    .replace(/代码通过率/g, data.stat2.label)
    .replace(/50\+/g, data.stat3.value)
    .replace(/自动化任务/g, data.stat3.label)
    .replace(/立即开始/g, data.chapter3Title)
    .replace(/选择正确的工具，就是选择了效率。Mission Control V2，让 AI 成为你的生产力倍增器。/g, data.chapter3Highlight)
    .replace(/未来已来<br\/>/g, data.conclusion.replace(/<br\/>/g, ''));
  
  // 写入 index.html
  const indexPath = join(projectDir, 'index.html');
  writeFileSync(indexPath, html);
  
  // 渲染视频
  const outputFile = join(projectDir, 'output.mp4');
  await renderWithHyperFrames(indexPath, outputFile);
  
  return outputFile;
}

/**
 * 使用 HyperFrames 渲染视频
 */
function renderWithHyperFrames(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      'hyperframes', 'render',
      '-o', outputPath,
      inputPath
    ];
    
    const proc = spawn('npx', args, { 
      cwd: require('path').dirname(inputPath),
      stdio: 'inherit'
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`HyperFrames render failed with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

/**
 * 示例：使用默认数据生成视频
 */
export async function generateSampleVideo(): Promise<string> {
  const sampleData: VideoData = {
    coverTitle: 'AI 驱动的任务管理',
    coverSubtitle: 'Mission Control V2 让效率提升 10 倍',
    quote: '2026年，AI 正在改变我们的工作方式。',
    chapter1Title: 'AI Agent 的现状',
    chapter1Content: '从 ChatGPT 到 Claude，AI agent 已经渗透到每个环节。',
    chapter2Title: 'Mission Control V2 的解决方案',
    chapter2Content: '从需求到部署，<span class="highlight">全流程自动化</span>。',
    stat1: { value: '10x', label: '效率提升' },
    stat2: { value: '99%', label: '代码通过率' },
    stat3: { value: '50+', label: '自动化任务' },
    chapter3Title: '立即开始',
    chapter3Highlight: '选择正确的工具，就是选择效率。',
    conclusion: '未来已来',
  };
  
  return generateVideo({ data: sampleData });
}

export default {
  generateVideo,
  generateSampleVideo,
};
