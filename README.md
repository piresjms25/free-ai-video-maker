# Free AI Video Studio

A self-hosted AI video creation app inspired by InVideo, built with Node.js, React, FFmpeg, and Docker. This starter gives you a full-stack foundation for generating short video clips from scripts, planning scenes, and exporting MP4s locally.

## Features
- Script-based project creation
- AI-like scene planning and storyboard generation
- Real video rendering with FFmpeg
- Text-to-speech voice generation via espeak-ng
- React editor UI for project creation and preview
- Fully self-hosted Docker setup

## Tech stack
- Frontend: React + Vite
- Backend: Express + Node.js
- Queue / orchestration: Redis-ready structure
- Rendering: FFmpeg + espeak-ng
- Containerization: Docker Compose

## Quick start

### 1) Clone the repo

```bash
git clone https://github.com/piresjms25/free-ai-video-maker.git
cd free-ai-video-maker
```

### 2) Start the app

```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

### 3) Create a project
- Enter a video title and script.
- Choose a tone.
- Click Generate Video.

### 4) Output location
Generated videos are stored under `storage/<project-id>/final.mp4`.

## Project structure

```text
.
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       └── services/
│           ├── aiStoryboard.js
│           └── videoWorkflow.js
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
├── docker-compose.yml
├── README.md
└── .gitignore
```

## Notes
- This is an MVP starter, intended for local self-hosting and learning.
- Production expansions can include real AI image generation, stock media integrations, project timeline editing, cloud storage, and background worker jobs.

## License
MIT
