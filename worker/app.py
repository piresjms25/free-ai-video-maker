import os
import io
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from PIL import Image, ImageDraw, ImageFont

try:
    from diffusers import StableDiffusionPipeline
    import torch
except Exception:  # pragma: no cover
    StableDiffusionPipeline = None
    torch = None

app = FastAPI(title="Self-hosted SD worker")

MODEL_ID = os.getenv("DIFFUSION_MODEL_ID", "runwayml/stable-diffusion-v1-5")
DEVICE = "cuda" if os.getenv("USE_CUDA", "0") == "1" else "cpu"

pipe = None
if StableDiffusionPipeline is not None and torch is not None:
    try:
        pipe = StableDiffusionPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
        )
        pipe = pipe.to(DEVICE)
    except Exception:
        pipe = None


class SceneRequest(BaseModel):
    prompt: str
    width: int = 1280
    height: int = 720
    output_path: str | None = None


@app.get("/health")
def health():
    return {"ok": True, "device": DEVICE, "model_loaded": pipe is not None}


@app.post("/generate-scene")
def generate_scene(req: SceneRequest):
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is required")

    output_path = req.output_path or str(Path("/tmp") / f"{uuid.uuid4()}.png")
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    if pipe is not None:
        try:
            image = pipe(req.prompt, width=req.width, height=req.height).images[0]
            image.save(output_file)
            return JSONResponse({"ok": True, "path": str(output_file), "source": "diffusers"})
        except Exception:
            # fall through to a local placeholder image if SD cannot be used
            pass

    # Fallback: generate a clean placeholder image with a prompt label to keep the pipeline working
    img = Image.new("RGB", (req.width, req.height), color=(35, 55, 110))
    draw = ImageDraw.Draw(img)
    gradient = Image.new("RGB", (req.width, req.height))
    pixels = []
    for y in range(req.height):
        r = int(40 + (y / req.height) * 80)
        g = int(70 + (y / req.height) * 100)
        b = int(130 + (y / req.height) * 80)
        pixels.append((r, g, b))
    gradient.putdata([p for p in pixels for _ in range(req.width)])
    # simplest fallback fill: create subtle gradient bars
    for x in range(req.width):
        for y in range(req.height):
            r = int(30 + (x / req.width) * 120)
            g = int(40 + (y / req.height) * 150)
            b = int(90 + (x / req.width) * 100)
            img.putpixel((x, y), (r, g, b))

    label = req.prompt[:60]
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 42)
    except Exception:
        font = ImageFont.load_default()

    draw.text((60, 300), label, fill=(255, 255, 255), font=font)
    img.save(output_file)

    return JSONResponse({"ok": True, "path": str(output_file), "source": "placeholder"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
