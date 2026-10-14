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

async function generateSceneImage(projectId, scene, index) {
  const sceneDirHost = path.join(storageRoot, projectId, 'scenes');
  await fs.mkdir(sceneDirHost, { recursive: true });

  // Worker writes into /tmp inside its container which is mapped to ./storage on the host
  const workerOutputPath = `/tmp/${projectId}/scenes/scene-${index}.png`;
  const localImagePath = path.join(sceneDirHost, `scene-${index}.png`);

  const workerBase = process.env.SD_WORKER_URL || 'http://worker:8000';

  try {
    const res = await fetch(`${workerBase}/generate-scene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: scene.prompt || scene.text, width: 1280, height: 720, output_path: workerOutputPath })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Worker error');

    // Worker saved the image to /tmp/... which is mounted to ./storage on the host, so the image should exist at localImagePath
    await fs.access(localImagePath);
    return localImagePath;
  } catch (err) {
    console.warn('Worker image generation failed, falling back to placeholder:', err.message);
    // Fallback: create a simple image via ffmpeg drawtext over a color
    const fallbackPath = localImagePath;
    const safeText = (scene.text || '').replace(/'/g, "\\'");
    const cmd = `ffmpeg -hide_banner -loglevel error -y -f lavfi -i color=c=0x243b66:s=1280x720 -vf "drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='${safeText}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2" -frames:v 1 ${fallbackPath}`;
    await execFileAsync('bash', ['-lc', cmd]);
    return fallbackPath;
  }
}

export async function renderProjectVideo({ projectId, title, script, tone, scenes }) {
  const projectDir = path.join(storageRoot, projectId);
  await fs.mkdir(projectDir, { recursive: true });

  const sceneDir = path.join(projectDir, 'scenes');
  await fs.mkdir(sceneDir, { recursive: true });

  const clipFiles = [];

  // Generate or fetch scene images
  const imageFiles = [];
  for (const [index, scene] of scenes.entries()) {
    const imagePath = await generateSceneImage(projectId, scene, index);
    imageFiles.push(imagePath);
    // attach image path to scene metadata (served later via assets route)
    scene.image = `/api/projects/${projectId}/assets/scenes/scene-${index}.png`;
    scene.thumbnail = scene.image; // same for now
  }

  // Build short clips from images
  for (const [index, scene] of scenes.entries()) {
    const img = imageFiles[index];
    const clipPath = path.join(sceneDir, `clip-${index}.mp4`);
    const duration = Number(scene.duration || 4);

    // Create a video from the static image (loop) and scale to 1280x720
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-y',
      '-loop', '1',
      '-i', img,
      '-c:v', 'libx264',
      '-t', String(duration),
      '-vf', 'scale=1280:720',
      '-pix_fmt', 'yuv420p',
      clipPath
    ];

    await execFileAsync('ffmpeg', args);
    clipFiles.push(clipPath);
  }

  // Create concat file
  const concatFile = path.join(projectDir, 'concat.txt');
  const concatContent = clipFiles.map((file) => `file '${file}'`).join('\n');
  await fs.writeFile(concatFile, concatContent, 'utf8');

  // Generate speech audio
  const voiceText = scenes.map((scene) => scene.text).join(' ');
  const speechFile = path.join(projectDir, 'speech.wav');
  try {
    await execFileAsync('espeak-ng', ['-w', speechFile, '-s', '150', '-p', '50', voiceText]);
  } catch {
    await fs.writeFile(speechFile, '');
  }

  // Build final video with optional audio
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
