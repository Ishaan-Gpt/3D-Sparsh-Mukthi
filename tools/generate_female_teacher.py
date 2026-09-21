import bpy
import math
import os

def build_realistic_rigged_female_teacher(filepath):
    # Reset Blender scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # 1. CREATE ARMATURE (RIG)
    bpy.ops.object.armature_add(enter_editmode=True, align='WORLD', location=(0, 0, 0))
    armature_obj = bpy.context.object
    armature_obj.name = "FemaleTeacher_Rig"
    armature = armature_obj.data
    armature.name = "FemaleTeacher_Armature"

    edit_bones = armature.edit_bones
    
    # Root & Hips
    root_bone = edit_bones['Bone']
    root_bone.name = "Hips"
    root_bone.head = (0, 0, 0.95)
    root_bone.tail = (0, 0, 1.05)
    
    # Spine & Chest
    spine = edit_bones.new('Spine')
    spine.head = (0, 0, 1.05)
    spine.tail = (0, 0, 1.25)
    spine.parent = root_bone

    chest = edit_bones.new('Chest')
    chest.head = (0, 0, 1.25)
    chest.tail = (0, 0, 1.45)
    chest.parent = spine

    neck = edit_bones.new('Neck')
    neck.head = (0, 0, 1.45)
    neck.tail = (0, 0, 1.55)
    neck.parent = chest

    head = edit_bones.new('Head')
    head.head = (0, 0, 1.55)
    head.tail = (0, 0, 1.75)
    head.parent = neck

    # Left Leg
    thigh_L = edit_bones.new('Thigh.L')
    thigh_L.head = (-0.12, 0, 0.95)
    thigh_L.tail = (-0.12, 0, 0.50)
    thigh_L.parent = root_bone

    shin_L = edit_bones.new('Shin.L')
    shin_L.head = (-0.12, 0, 0.50)
    shin_L.tail = (-0.12, 0, 0.08)
    shin_L.parent = thigh_L

    foot_L = edit_bones.new('Foot.L')
    foot_L.head = (-0.12, 0, 0.08)
    foot_L.tail = (-0.12, -0.15, 0)
    foot_L.parent = shin_L

    # Right Leg
    thigh_R = edit_bones.new('Thigh.R')
    thigh_R.head = (0.12, 0, 0.95)
    thigh_R.tail = (0.12, 0, 0.50)
    thigh_R.parent = root_bone

    shin_R = edit_bones.new('Shin.R')
    shin_R.head = (0.12, 0, 0.50)
    shin_R.tail = (0.12, 0, 0.08)
    shin_R.parent = thigh_R

    foot_R = edit_bones.new('Foot.R')
    foot_R.head = (0.12, 0, 0.08)
    foot_R.tail = (0.12, -0.15, 0)
    foot_R.parent = shin_R

    # Left Arm
    upper_arm_L = edit_bones.new('UpperArm.L')
    upper_arm_L.head = (-0.20, 0, 1.40)
    upper_arm_L.tail = (-0.45, 0, 1.40)
    upper_arm_L.parent = chest

    forearm_L = edit_bones.new('Forearm.L')
    forearm_L.head = (-0.45, 0, 1.40)
    forearm_L.tail = (-0.70, 0, 1.40)
    forearm_L.parent = upper_arm_L

    hand_L = edit_bones.new('Hand.L')
    hand_L.head = (-0.70, 0, 1.40)
    hand_L.tail = (-0.82, 0, 1.40)
    hand_L.parent = forearm_L

    # Right Arm
    upper_arm_R = edit_bones.new('UpperArm.R')
    upper_arm_R.head = (0.20, 0, 1.40)
    upper_arm_R.tail = (0.45, 0, 1.40)
    upper_arm_R.parent = chest

    forearm_R = edit_bones.new('Forearm.R')
    forearm_R.head = (0.45, 0, 1.40)
    forearm_R.tail = (0.70, 0, 1.40)
    forearm_R.parent = upper_arm_R

    hand_R = edit_bones.new('Hand.R')
    hand_R.head = (0.70, 0, 1.40)
    hand_R.tail = (0.82, 0, 1.40)
    hand_R.parent = forearm_R

    bpy.ops.object.mode_set(mode='OBJECT')

    # 2. MATERIALS
    def make_material(name, color, roughness=0.5):
        mat = bpy.data.materials.new(name=name)
        if hasattr(mat, "use_nodes"):
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            if bsdf:
                bsdf.inputs['Base Color'].default_value = (*color, 1.0)
                bsdf.inputs['Roughness'].default_value = roughness
        return mat

    skin_mat = make_material("Skin_Mat", (0.87, 0.67, 0.51), roughness=0.45)
    suit_top_mat = make_material("SuitTop_Mat", (0.05, 0.25, 0.55), roughness=0.6)
    skirt_mat = make_material("Skirt_Mat", (0.1, 0.12, 0.18), roughness=0.7)
    hair_mat = make_material("Hair_Mat", (0.1, 0.08, 0.06), roughness=0.8)
    shoe_mat = make_material("Shoe_Mat", (0.02, 0.02, 0.02), roughness=0.3)

    # 3. MESHES
    meshes = []

    # Head & Neck
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=24, radius=0.14, location=(0, 0, 1.65))
    head_mesh = bpy.context.object
    head_mesh.name = "Head_Mesh"
    head_mesh.scale = (0.9, 1.05, 1.1)
    head_mesh.data.materials.append(skin_mat)
    meshes.append((head_mesh, 'Head'))

    # Hair Bun
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, radius=0.16, location=(0, -0.02, 1.67))
    hair_mesh = bpy.context.object
    hair_mesh.name = "Hair_Mesh"
    hair_mesh.scale = (0.95, 1.08, 1.05)
    hair_mesh.data.materials.append(hair_mat)
    meshes.append((hair_mesh, 'Head'))

    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.075, location=(0, -0.15, 1.70))
    bun_mesh = bpy.context.object
    bun_mesh.name = "Bun_Mesh"
    bun_mesh.data.materials.append(hair_mat)
    meshes.append((bun_mesh, 'Head'))

    # Torso / Suit Blazer
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.20, depth=0.45, location=(0, 0, 1.25))
    torso_mesh = bpy.context.object
    torso_mesh.name = "Torso_Mesh"
    torso_mesh.scale = (1.1, 0.85, 1.0)
    torso_mesh.data.materials.append(suit_top_mat)
    meshes.append((torso_mesh, 'Chest'))

    # Skirt
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.28, radius2=0.20, depth=0.45, location=(0, 0, 0.80))
    skirt_mesh = bpy.context.object
    skirt_mesh.name = "Skirt_Mesh"
    skirt_mesh.scale = (1.05, 0.9, 1.0)
    skirt_mesh.data.materials.append(skirt_mat)
    meshes.append((skirt_mesh, 'Hips'))

    # Upper Arms & Forearms
    for side, sign, bone_prefix in [('L', -1, 'UpperArm.L'), ('R', 1, 'UpperArm.R')]:
        # Upper arm
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.05, depth=0.28, location=(sign * 0.32, 0, 1.40))
        arm_obj = bpy.context.object
        arm_obj.name = f"UpperArm_Mesh_{side}"
        arm_obj.rotation_euler = (0, math.radians(90), 0)
        arm_obj.data.materials.append(suit_top_mat)
        meshes.append((arm_obj, f'UpperArm.{side}'))

        # Forearm / Skin
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.04, depth=0.26, location=(sign * 0.58, 0, 1.40))
        forearm_obj = bpy.context.object
        forearm_obj.name = f"Forearm_Mesh_{side}"
        forearm_obj.rotation_euler = (0, math.radians(90), 0)
        forearm_obj.data.materials.append(skin_mat)
        meshes.append((forearm_obj, f'Forearm.{side}'))

        # Hand
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=12, radius=0.045, location=(sign * 0.74, 0, 1.40))
        hand_obj = bpy.context.object
        hand_obj.name = f"Hand_Mesh_{side}"
        hand_obj.data.materials.append(skin_mat)
        meshes.append((hand_obj, f'Hand.{side}'))

    # Legs & Shoes
    for side, sign in [('L', -1), ('R', 1)]:
        # Thigh
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.075, depth=0.45, location=(sign * 0.12, 0, 0.72))
        thigh_obj = bpy.context.object
        thigh_obj.name = f"Thigh_Mesh_{side}"
        thigh_obj.data.materials.append(skin_mat)
        meshes.append((thigh_obj, f'Thigh.{side}'))

        # Shin
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.055, depth=0.42, location=(sign * 0.12, 0, 0.29))
        shin_obj = bpy.context.object
        shin_obj.name = f"Shin_Mesh_{side}"
        shin_obj.data.materials.append(skin_mat)
        meshes.append((shin_obj, f'Shin.{side}'))

        # Shoe
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(sign * 0.12, -0.06, 0.04))
        shoe_obj = bpy.context.object
        shoe_obj.name = f"Shoe_Mesh_{side}"
        shoe_obj.scale = (0.09, 0.18, 0.08)
        shoe_obj.data.materials.append(shoe_mat)
        meshes.append((shoe_obj, f'Foot.{side}'))

    # 4. PARENT MESHES TO ARMATURE BONES
    for mesh_obj, bone_name in meshes:
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        armature_obj.select_set(True)
        bpy.context.view_layer.objects.active = armature_obj
        bpy.ops.object.parent_set(type='BONE', keep_transform=True)

    # 5. ANIMATIONS (Standing & Sitting Tracks)
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.mode_set(mode='POSE')
    pose_bones = armature_obj.pose.bones
    
    # Idle_Stand Action
    anim_data = armature_obj.animation_data_create()
    action_idle = bpy.data.actions.new(name="Idle_Stand")
    anim_data.action = action_idle
    for bone in pose_bones:
        bone.rotation_mode = 'XYZ'
        bone.keyframe_insert(data_path="rotation_euler", frame=1)

    # Sitting_Desk Action
    action_sit = bpy.data.actions.new(name="Sitting_Desk")
    anim_data.action = action_sit
    if 'Thigh.L' in pose_bones:
        pose_bones['Thigh.L'].rotation_euler = (math.radians(90), 0, 0)
        pose_bones['Thigh.L'].keyframe_insert(data_path="rotation_euler", frame=1)
    if 'Thigh.R' in pose_bones:
        pose_bones['Thigh.R'].rotation_euler = (math.radians(90), 0, 0)
        pose_bones['Thigh.R'].keyframe_insert(data_path="rotation_euler", frame=1)
    if 'UpperArm.L' in pose_bones:
        pose_bones['UpperArm.L'].rotation_euler = (0, 0, math.radians(-70))
        pose_bones['UpperArm.L'].keyframe_insert(data_path="rotation_euler", frame=1)
    if 'UpperArm.R' in pose_bones:
        pose_bones['UpperArm.R'].rotation_euler = (0, 0, math.radians(70))
        pose_bones['UpperArm.R'].keyframe_insert(data_path="rotation_euler", frame=1)

    bpy.ops.object.mode_set(mode='OBJECT')

    # 6. EXPORT TO GLB
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    
    # Blender glTF export execution
    try:
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format='GLB',
            export_apply=True,
            export_animations=True
        )
    except Exception as e:
        # Fallback for different Blender versions syntax
        bpy.ops.wm.gltf_export(filepath=filepath)

    print(f"DONE_GLB_EXPORT:{filepath}")

if __name__ == "__main__":
    import sys
    out_path = "c:/Ishaan GPT/APPS/sparsh-mukthi-3d/public/models/female_teacher.glb"
    build_realistic_rigged_female_teacher(out_path)
