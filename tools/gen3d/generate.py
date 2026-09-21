"""
Local, free, offline text-to-3D generation (Shap-E, CPU).

Usage:
    venv/Scripts/python.exe generate.py "a wooden chair" --out chair.glb

Produces a static (unrigged) textured mesh. Model weights auto-download from
OpenAI's public CDN on first run (~1-2GB, cached under ~/.cache after that).
CPU inference: expect a few minutes per generation on this machine (no CUDA GPU).
"""
import argparse
import os
import torch

from shap_e.diffusion.sample import sample_latents
from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
from shap_e.models.download import load_model, load_config
from shap_e.util.notebooks import decode_latent_mesh

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prompt", help="Text description of the object to generate")
    ap.add_argument("--out", default="output.glb", help="Output file path (.glb/.obj/.ply)")
    ap.add_argument("--guidance-scale", type=float, default=15.0)
    ap.add_argument("--karras-steps", type=int, default=64, help="Lower = faster, less detail")
    args = ap.parse_args()

    device = torch.device("cpu")
    print("Loading models (first run downloads ~1-2GB, cached after)...")
    xm = load_model("transmitter", device=device)
    model = load_model("text300M", device=device)
    diffusion = diffusion_from_config(load_config("diffusion"))

    print(f"Generating: {args.prompt!r} (this takes a few minutes on CPU)...")
    latents = sample_latents(
        batch_size=1,
        model=model,
        diffusion=diffusion,
        guidance_scale=args.guidance_scale,
        model_kwargs=dict(texts=[args.prompt]),
        progress=True,
        clip_denoised=True,
        use_fp16=False,
        use_karras=True,
        karras_steps=args.karras_steps,
        sigma_min=1e-3,
        sigma_max=160,
        s_churn=0,
    )

    mesh = decode_latent_mesh(xm, latents[0]).tri_mesh()

    out_path = args.out
    ext = os.path.splitext(out_path)[1].lower()
    if ext == ".obj":
        with open(out_path, "w") as f:
            mesh.write_obj(f)
    elif ext == ".ply":
        with open(out_path, "wb") as f:
            mesh.write_ply(f)
    else:
        # write obj then convert via Blender for glb (richer format support)
        obj_path = out_path.rsplit(".", 1)[0] + "_raw.obj"
        with open(obj_path, "w") as f:
            mesh.write_obj(f)
        print(f"Wrote raw mesh: {obj_path}")
        print("Run convert_to_glb.py (Blender) to produce the final .glb")
        return

    print(f"Wrote: {out_path}")

if __name__ == "__main__":
    main()
