import { useEffect, useState, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function App() {
  const [title, setTitle] = useState('AI Product Launch Video');
  const [script, setScript] = useState(
    'Welcome to our new video product. Discover how AI can help teams move faster. Build campaigns, generate scenes, and deliver polished content in minutes.'
  );
  const [tone, setTone] = useState('cinematic');
  const [project, setProject] = useState(null);
  const [selectedSceneId, setSelectedSceneId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const dragItem = useRef();
  const dragOverItem = useRef();

  useEffect(() => {
    if (!project || !project.storyboard || !project.storyboard.length) return;
    setSelectedSceneId(project.storyboard[0].id);
  }, [project]);

  function getTimelineScenes() {
    return project?.storyboard || [
      { id: 1, title: 'Scene 1', text: 'Welcome to your AI project', duration: 4, prompt: 'Welcome to your AI project' },
      { id: 2, title: 'Scene 2', text: 'Build smarter campaigns', duration: 4, prompt: 'Build smarter campaigns' },
      { id: 3, title: 'Scene 3', text: 'Export polished results', duration: 4, prompt: 'Export polished results' }
    ];
  }

  const timelineScenes = getTimelineScenes();
  const selectedScene = timelineScenes.find((s) => s.id === selectedSceneId) || timelineScenes[0];

  function updateProjectStoryboard(nextStoryboard) {
    if (!project) {
      setProject({ id: null, title, tone, storyboard: nextStoryboard });
      return;
    }
    setProject({ ...project, storyboard: nextStoryboard });
  }

  function updateSelectedScene(key, value) {
    if (!project || !project.storyboard) return;
    const nextStoryboard = project.storyboard.map((scene) =>
      scene.id === selectedSceneId ? { ...scene, [key]: value } : scene
    );
    updateProjectStoryboard(nextStoryboard);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const createRes = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, script, tone })
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Unable to create project');
      }

      setProject(createData);

      const generateRes = await fetch(`${API_URL}/api/projects/${createData.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const generateData = await generateRes.json();
      if (!generateRes.ok) {
        throw new Error(generateData.error || 'Video generation failed');
      }

      setProject(generateData);
    } catch (err) {
      setError(err.message || 'Something went wrong while generating the video.');
    } finally {
      setIsLoading(false);
    }
  }

  async function rerenderProject() {
    if (!project || !project.id) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/projects/${project.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          tone: project.tone,
          storyboard: project.storyboard
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Re-render failed');
      }

      setProject(data);
    } catch (err) {
      setError(err.message || 'Unable to re-render the project.');
    } finally {
      setIsLoading(false);
    }
  }

  // Drag and drop handlers
  function handleDragStart(e, position) {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnter(e, position) {
    dragOverItem.current = position;
    e.preventDefault();
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop() {
    const list = [...timelineScenes];
    const dragIndex = dragItem.current;
    const hoverIndex = dragOverItem.current;
    if (dragIndex === undefined || hoverIndex === undefined) return;

    const draggedItem = list.splice(dragIndex, 1)[0];
    list.splice(hoverIndex, 0, draggedItem);

    // reassign ids to keep them consistent
    const reordered = list.map((scene, i) => ({ ...scene, id: i + 1 }));
    updateProjectStoryboard(reordered);

    dragItem.current = null;
    dragOverItem.current = null;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="dot" />
          Free AI Video Studio
        </div>

        <nav className="nav">
          <span className="nav-item active">Create</span>
          <span className="nav-item">Storyboard</span>
          <span className="nav-item">Assets</span>
          <span className="nav-item">Export</span>
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <h1>New project</h1>
          <button type="button" className="ghost-button">Save draft</button>
        </header>

        <div className="workspace">
          <section className="editor-panel">
            <form className="editor-form" onSubmit={handleSubmit}>
              <label>
                Project title
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Your video title"
                />
              </label>

              <label>
                Tone
                <select value={tone} onChange={(event) => setTone(event.target.value)}>
                  <option value="cinematic">Cinematic</option>
                  <option value="marketing">Marketing</option>
                  <option value="minimal">Minimal</option>
                  <option value="energetic">Energetic</option>
                </select>
              </label>

              <label>
                Script
                <textarea
                  rows="12"
                  value={script}
                  onChange={(event) => setScript(event.target.value)}
                  placeholder="Write your video script here..."
                />
              </label>

              <button className="primary-button" type="submit" disabled={isLoading}>
                {isLoading ? 'Generating video...' : 'Generate video'}
              </button>
            </form>

            {error && <div className="error-box">{error}</div>}
          </section>

          <section className="preview-panel">
            <div className="preview-header">
              <h2>Preview</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="ghost-button small" onClick={rerenderProject}>
                  Re-render
                </button>
              </div>
            </div>

            {project && project.videoPath ? (
              <video src={`${API_URL}${project.videoPath}`} controls />
            ) : (
              <div className="preview-placeholder">
                <div className="placeholder-box">
                  <span>Your rendered preview will appear here.</span>
                </div>
              </div>
            )}

            <div className="timeline">
              <div className="timeline-header">
                <h3>Scene timeline</h3>
                <span>{timelineScenes.length} scenes</span>
              </div>

              <div className="timeline-list">
                {timelineScenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`timeline-card ${selectedScene?.id === scene.id ? 'active' : ''}`}
                    onClick={() => setSelectedSceneId(scene.id)}
                  >
                    <span className="timeline-index">0{scene.id}</span>
                    <div className="timeline-content">
                      <strong>{scene.title || `Scene ${scene.id}`}</strong>
                      <small>{scene.text || 'Scene caption'}</small>
                    </div>
                    <span className="timeline-duration">{scene.duration || 4}s</span>
                  </button>
                ))}
              </div>

              {selectedScene && (
                <div className="scene-editor">
                  <h4>Edit selected scene</h4>

                  <label>
                    Scene title
                    <input
                      type="text"
                      value={selectedScene.title || ''}
                      onChange={(event) => updateSelectedScene('title', event.target.value)}
                    />
                  </label>

                  <label>
                    Caption / prompt
                    <textarea
                      rows="4"
                      value={selectedScene.text || ''}
                      onChange={(event) => updateSelectedScene('text', event.target.value)}
                    />
                  </label>

                  <label>
                    Duration: {selectedScene.duration || 4}s
                    <input
                      type="range"
                      min="2"
                      max="12"
                      value={selectedScene.duration || 4}
                      onChange={(event) =>
                        updateSelectedScene('duration', Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
