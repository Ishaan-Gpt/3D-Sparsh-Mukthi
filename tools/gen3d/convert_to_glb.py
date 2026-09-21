"""
Convert a Shap-E raw .obj (with vertex colors, no UVs) into a clean .glb via
Blender headless. Shap-E meshes use per-vertex color, not textures, so this
bakes vertex colors into a material so it renders correctly in three.js.

Usage (run with system Blender, not the venv python):
    blender --background --python convert_to_glb.py -- input_raw.obj output.glb
"""
import bpy
import sys

argv = sys.argv[sys.argv.index("--") + 1:]
obj_path, out_glb = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=obj_path)

obj = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
bpy.context.view_layer.objects.active = obj
obj.select_set(True)

mat = bpy.data.materials.new("VertexColorMat")
mat.use_nodes = True
nt = mat.node_tree
vc_node = nt.nodes.new("ShaderNodeVertexColor")
bsdf = nt.nodes["Principled BSDF"]
color_attrs = obj.data.color_attributes
if len(color_attrs) > 0:
    vc_node.layer_name = color_attrs[0].name
    nt.links.new(vc_node.outputs["Color"], bsdf.inputs["Base Color"])
    print(f"Wired vertex color attribute: {color_attrs[0].name}")
else:
    print("WARNING: no vertex color attribute found on imported mesh")
obj.data.materials.append(mat)

bpy.ops.export_scene.gltf(filepath=out_glb, export_format="GLB")
print(f"Exported: {out_glb}")
