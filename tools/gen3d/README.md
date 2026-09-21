# gen3d — local, free, offline text-to-3D

Generates a static 3D mesh from a text prompt, entirely on this machine, no
API keys, no cloud service, no login. Uses [Shap-E](https://github.com/openai/shap-e)
(OpenAI, open source, MIT license) running on CPU.

## Setup (already done once)

```
python -m venv venv
venv/Scripts/python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu
venv/Scripts/python.exe -m pip install git+https://github.com/openai/shap-e.git
venv/Scripts/python.exe -m pip install pyyaml ipywidgets
```

## Generate a model

```
venv/Scripts/python.exe generate.py "a leather armchair" --out armchair.obj
```

- First run downloads ~4GB of model weights into `shap_e_model_cache/`
  (cached after that — later runs skip the download).
- CPU-only on this machine (no CUDA GPU): expect **~10-12 min per generation**
  at the fast `--karras-steps 16` setting, or **~40+ min** at the default 64
  steps (`64` looks noticeably better — more geometric detail, cleaner
  surfaces). Start with 16 to iterate on a prompt, do a final 64-step pass
  once you're happy with it.
- Output is `.obj` with per-vertex color (no UV texture — that's how Shap-E
  represents color).

## Convert to GLB (for use in the classroom/Three.js scene)

```
"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background \
  --python convert_to_glb.py -- armchair.obj armchair.glb
```

Bakes the per-vertex color into a material so it renders correctly in
three.js/`<primitive>`.

## What this is good for

Static props, furniture, decorations, simple environment pieces — anything
that doesn't need to move or be rigged. Quality is rough-but-recognizable at
low step counts, decent at 64 steps; it will never match a hand-modeled or
paid-generator (Meshy/Rodin/Mint) result, but it's real, novel, offline
generation with zero cost.

## What this is NOT for

**Rigged, animated characters.** Shap-E produces a static mesh only — no
skeleton, no skinning, no animation. Turning a generated character mesh into
something like the classroom's Teacher/Student avatars requires a separate,
much harder rigging step (auto-rig tooling, weight painting, animation
retargeting) that this tool does not attempt. For animated humanoid
characters, prefer reshaping/recoloring the existing rigged Emilian-based
assets (see `Teacher.jsx`'s `ANIM_CONFIG`), or sourcing a pre-rigged
CC0/free asset.

## Tuning

- `--guidance-scale` (default 15.0): higher = more literal to the prompt,
  less varied geometry.
- `--karras-steps` (default 64): diffusion steps. Lower = faster, rougher.
