import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { renderProjectVideo } from './services/videoWorkflow.js';
import { buildStoryboard } from './services/aiStoryboard.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const storageRoot = path.join(__dirname, '..', 'storage');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_, res) => {
  res.json({ ok: true, service: 'free-ai-video-studio-backend' });
});

app.get('/api/projects/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const projectPath = path.join(storageRoot, projectId);

  try {
    const exists = await fs.access(projectPath).then(() => true).catch(() => false);
    if (!exists) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const metadata = JSON.parse(
      await fs.readFile(path.join(projectPath, 'project.json'), 'utf8')
    );

    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: 'Unable to read project metadata' });
  }
});

app.get('/api/projects/:projectId/video', async (req, res) => {
  const { projectId } = req.params;
  const videoPath = path.join(storageRoot, projectId, 'final.mp4');

  try {
    await fs.access(videoPath);
    res.sendFile(videoPath);
  } catch {
    res.status(404).json({ error: 'Video not generated yet' });
  }
});

app.post('/api/projects', async (req, res) => {
  const { title, script, tone = 'cinematic' } = req.body;

  if (!title || !script || !script.trim()) {
    return res.status(400).json({ error: 'Title and script are required.' });
  }

  const projectId = randomUUID();
  const projectPath = path.join(storageRoot, projectId);
  await fs.mkdir(projectPath, { recursive: true });

  const storyboard = buildStoryboard(script, tone);

  const project = {
    id: projectId,
    title,
    tone,
    createdAt: new Date().toISOString(),
    storyboard,
    status: 'ready'
  };

  await fs.writeFile(
    path.join(projectPath, 'project.json'),
    JSON.stringify(project, null, 2),
    'utf8'
  );

  res.status(201).json(project);
});

app.post('/api/projects/:projectId/generate', async (req, res) => {
  const { projectId } = req.params;
  const projectPath = path.join(storageRoot, projectId);

  try {
    const metadataRaw = await fs.readFile(path.join(projectPath, 'project.json'), 'utf8');
    const metadata = JSON.parse(metadataRaw);

    await fs.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify({ ...metadata, status: 'rendering' }, null, 2),
      'utf8'
    );

    const result = await renderProjectVideo({
      projectId,
      title: metadata.title,
      script: metadata.storyboard.map((scene) => scene.text).join(' '),
      tone: metadata.tone,
      scenes: metadata.storyboard
    });

    const updatedProject = {
      ...metadata,
      ...result,
      status: 'complete'
    };

    await fs.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(updatedProject, null, 2),
      'utf8'
    );

    res.json(updatedProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Video generation failed', detail: error.message });
  }
});

app.listen(port, () => {
  console.log(`Free AI Video Studio backend running on http://localhost:${port}`);
});
