import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function App() {
  const [title, setTitle] = useState('AI Product Launch Video');
  const [script, setScript] = useState(
    'Welcome to our new video product. Discover how AI can help teams move faster. Build campaigns, generate scenes, and deliver polished content in minutes.'
  );
  const [tone, setTone] = useState('cinematic');
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

        {project && project.videoPath && (
          <section className="preview-panel">
            <h2>Preview</h2>
            <video src={`${API_URL}${project.videoPath}`} controls />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
