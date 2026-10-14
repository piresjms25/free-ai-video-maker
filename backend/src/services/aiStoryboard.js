import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createProjectPreview = (title, script) => ({
  title,
  script,
  type: 'video-project',
  source: 'self-hosted-editor'
});
