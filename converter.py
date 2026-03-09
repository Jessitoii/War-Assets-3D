import bpy
import os
import sys

def convert_to_glb(input_path, output_path, target_size_mb=10):
    """
    Headless Blender script to convert OBJ/FBX/STL to optimized GLB.
    """
    abs_input = os.path.abspath(input_path)
    abs_output = os.path.abspath(output_path)
    
    print(f"--- BLENDER CONVERSION START ---")
    print(f"[*] Input: {abs_input}")
    print(f"[*] Output: {abs_output}")

    # Ensure output directory exists
    out_dir = os.path.dirname(abs_output)
    if not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
        print(f"[*] Created output directory: {out_dir}")

    # 1. Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # 2. Import based on extension
    ext = os.path.splitext(input_path)[1].lower()
    try:
        if ext == '.obj':
            bpy.ops.wm.obj_import(filepath=abs_input)
        elif ext == '.fbx':
            bpy.ops.wm.fbx_import(filepath=abs_input)
        elif ext == '.stl':
            bpy.ops.wm.stl_import(filepath=abs_input)
        elif ext == '.glb' or ext == '.gltf':
            bpy.ops.import_scene.gltf(filepath=abs_input)
        else:
            print(f"[-] Unsupported format: {ext}")
            return False
        print(f"[*] Import successful: {abs_input}")
    except Exception as e:
        print(f"[-] Import failed for {abs_input}: {e}")
        return False

    # Log scene content
    mesh_count = sum(1 for obj in bpy.context.scene.objects if obj.type == 'MESH')
    print(f"[*] Scene contains {len(bpy.context.scene.objects)} objects ({mesh_count} meshes)")

    # 3. Join all mesh objects into one for optimization
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
    
    if mesh_count > 1:
        bpy.ops.object.join()
        print(f"[*] Joined {mesh_count} meshes")
        
    # 4. Apply Decimate Modifier for performance
    active_obj = bpy.context.view_layer.objects.active
    if active_obj and active_obj.type == 'MESH':
        poly_count = len(active_obj.data.polygons)
        print(f"[*] Original Poly Count: {poly_count}")
        
        # If poly count is extreme (> 100k), decimate heavily
        ratio = 1.0
        if poly_count > 500000:
            ratio = 0.1
        elif poly_count > 100000:
            ratio = 0.3
        elif poly_count > 50000:
            ratio = 0.5
            
        if ratio < 1.0:
            mod = active_obj.modifiers.new(name="Decimate", type='DECIMATE')
            mod.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=mod.name)
            print(f"[*] Decimated to {ratio*100}% of original")

    # 5. Export as GLB
    try:
        bpy.ops.export_scene.gltf(
            filepath=abs_output,
            export_format='GLB',
            export_apply=True
        )
        if os.path.exists(abs_output):
            print(f"[+] EXPORT SUCCESS: {abs_output}")
            print(f"[+] Size: {os.path.getsize(abs_output) / 1024 / 1024:.2f} MB")
            return True
        else:
            print(f"[-] EXPORT FAILED: File not found after operation at {abs_output}")
            return False
    except Exception as e:
        print(f"[-] Export exception: {e}")
        return False

if __name__ == "__main__":
    if "--" in sys.argv:
        args = sys.argv[sys.argv.index("--") + 1:]
        if len(args) >= 2:
            success = convert_to_glb(args[0], args[1])
            if not success:
                sys.exit(1)
        else:
            print("Usage: blender --background --python converter.py -- <input> <output>")
            sys.exit(1)
