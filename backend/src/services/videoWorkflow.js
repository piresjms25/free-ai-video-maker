import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageRoot = path.join(__dirname, '..', 'storage');

export function buildStoryboard(script, tone = 'cinematic') {
  const cleanedScript = script
    .replace(/\s+/g, ' ')
    .trim();

  const rawScenes = cleanedScript
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const scenes = rawScenes.slice(0, 6).map((sentence, index) => ({
    id: index + 1,
    title: `${tone.charAt(0).toUpperCase() + tone.slice(1)} Scene ${index + 1}`,
    text: sentence,
    duration: 4,
    prompt: sentence
  }));

  if (!scenes.length) {
    return [{
      id: 1,
      title: 'Opening scene',
      text: 'Welcome to your AI-generated video project.',
      duration: 4,
      prompt: 'Welcome to your AI-generated video project.'
    }];
  }

  return scenes;
}

export async function renderProjectVideo({ projectId, title, script, tone, scenes }) {
  const projectDir = path.join(storageRoot, projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const sceneDir = path.join(projectDir, 'scenes');
  await fs.mkdir(sceneDir, { recursive: true });

  const clipFiles = [];

  for (const [index, scene] of scenes.entries()) {
    const clipPath = path.join(sceneDir, `clip-${index}.mp4`);
    const safeTitle = scene.text.replace(/'/g, "\\'");
    const color = ['#1f6feb', '#00b894', '#f39c12', '#8e44ad', '#e74c3c', '#16a085'][index % 6];

    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=${color}:s=1280x720:d=${scene.duration}`,
      '-vf', `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${safeTitle}':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=(h-text_h)/2+120:shadowcolor=black@0.5:shadowx=2:shadowy=2`,
      '-pix_fmt', 'yuv420p',
      clipPath
    ]);

    clipFiles.push(clipPath);
  }

  const concatFile = path.join(projectDir, 'concat.txt');
  const concatContent = clipFiles.map((file) => `file '${file}'`).join('\n');
  await fs.writeFile(concatFile, concatContent, 'utf8');

  const voiceText = scenes.map((scene) => scene.text).join(' ');
  const speechFile = path.join(projectDir, 'speech.wav');

  try {
    await execFileAsync('espeak-ng', ['-w', speechFile, '-s', '150', '-p', '50', voiceText]);
  } catch {
    await fs.writeFile(speechFile, '');
  }

  const outputVideo = path.join(projectDir, 'final.mp4');

  const cmdArgs = [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile
  ];

  try {
    await fs.access(speechFile);
    const speechStats = await fs.stat(speechFile);
    if (speechStats.size > 0) {
      cmdArgs.push('-i', speechFile, '-c:v', 'libx264', '-c:a', 'aac', '-shortest', outputVideo);
    } else {
      cmdArgs.push('-c:v', 'libx264', outputVideo);
    }
  } catch {
    cmdArgs.push('-c:v', 'libx264', outputVideo);
  }

  await execFileAsync('ffmpeg', cmdArgs);

  return {
    title,
    tone,
    projectId,
    videoPath: `/api/projects/${projectId}/video`,
    scenes,
    outputFile: 'final.mp4'
  };
}
