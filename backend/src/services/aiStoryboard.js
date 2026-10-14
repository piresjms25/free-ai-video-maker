export function buildPromptFromText(text, tone = 'cinematic') {
  const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
  if (!cleanText) {
    return `A ${tone} editorial shot with polished composition, soft cinematic lighting, and strong visual storytelling.`;
  }

  const toneMap = {
    cinematic: 'cinematic, dramatic lighting, layered depth, polished composition, realistic textures',
    marketing: 'high-impact marketing shot, vibrant color grading, premium product presentation, polished commercial style',
    minimal: 'minimalist composition, clean framing, soft neutral palette, elegant simplicity',
    energetic: 'high-energy motion, bold contrast, vibrant colors, dynamic framing, exciting visual flow'
  };

  const style = toneMap[tone] || toneMap.cinematic;
  return `${cleanText}, ${style}, modern visual storytelling, ultra detailed, crisp focus`;
}

export function buildStoryboard(script, tone = 'cinematic') {
  const cleanedScript = String(script || '').replace(/\s+/g, ' ').trim();
  const rawScenes = cleanedScript
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const scenes = rawScenes.slice(0, 6).map((sentence, index) => ({
    id: index + 1,
    title: `${tone.charAt(0).toUpperCase() + tone.slice(1)} Scene ${index + 1}`,
    text: sentence,
    duration: 4,
    prompt: buildPromptFromText(sentence, tone)
  }));

  if (!scenes.length) {
    return [{
      id: 1,
      title: 'Opening scene',
      text: 'Welcome to your AI-generated video project.',
      duration: 4,
      prompt: buildPromptFromText('Welcome to your AI-generated video project.', tone)
    }];
  }

  return scenes;
}

export const createProjectPreview = (title, script) => ({
  title,
  script,
  type: 'video-project',
  source: 'self-hosted-editor'
});
