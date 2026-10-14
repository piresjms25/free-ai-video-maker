# Free AI Video Studio

A self-hosted / hosted-hybrid AI video creation app inspired by InVideo, built with Node.js, React, FFmpeg, and Docker. This starter gives you a full-stack foundation for generating short video clips from scripts, planning scenes, and exporting MP4s locally.

## Features
- Script-based project creation
- AI-like scene planning and storyboard generation
- Free-tier hosted AI image generation via Hugging Face Inference API
- Local FFmpeg video rendering
- React editor UI for project creation and preview
- Containerized developer setup with Docker Compose

## Tech stack
- Frontend: React + Vite
- Backend: Express + Node.js
- Worker: Python HTTP worker for hosted AI generation
- Rendering: FFmpeg
- Optional queue: Redis

## Requirements
- Docker + Docker Compose
- A Hugging Face token (free tier)
- Node 20+

## Setup

### 1) Clone the repo

```bash
git clone https://github.com/piresjms25/free-ai-video-maker.git
cd free-ai-video-maker
```

### 2) Create a local environment file
Create a `.env` file in the project root:

```bash
HF_API_TOKEN=hf_your_token_here
```

### 3) Start the app

```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Worker API: http://localhost:8000

### 4) Create a project
- Enter a video title and script.
- Choose a tone.
- Click Generate video.

### 5) Output location
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
├── worker/
│   ├── app.py
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
├── .env.example
├── README.md
└── .gitignore
```

## Notes
- This version uses free-tier hosted inference for generated visuals.
- If the hosted API is unavailable, the worker falls back to placeholder images so the export still works.
- For production-grade video generation, add a queue, better timing controls, and richer prompt templates.

## License
MIT
