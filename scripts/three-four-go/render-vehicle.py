"""
Renders one 3-4-Go! car from a .glb model: 48 rotations (7.5° apart) at a
few viewing heights, orthographic, no anti-aliasing (crisp pixel edges),
transparent background. Run by render-vehicles.mjs through Blender:

  Blender -b --factory-startup --python render-vehicle.py -- <model.glb> <out dir> '<json options>'

Options: elevations (degrees), frames, pixelsPerUnit, unitsPerMeter,
forward ("+x", "-x", "+y" or "-y": which way the car's nose points after
import), test (render a single top-down picture instead).

Frame k shows the car pointing at k·7.5° on screen, clockwise from
pointing right (so frame 12 faces the viewer, frame 36 drives away). The
car's centre on the ground is always at the middle of the picture.
Writes e<elevation index>_<frame>.png and info.json to the out dir.
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
model, out_dir, options = argv[0], argv[1], json.loads(argv[2])
os.makedirs(out_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=model)
scene = bpy.context.scene

# Size of the model (world space, metres).
meshes = [o for o in scene.objects if o.type == "MESH"]
points = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
lo = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
hi = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))

# Everything hangs off a pivot at the car's centre on the ground, scaled to game units.
pivot = bpy.data.objects.new("pivot", None)
scene.collection.objects.link(pivot)
for obj in [o for o in scene.objects if o.parent is None and o is not pivot]:
    obj.location -= centre
    obj.parent = pivot
units = options["unitsPerMeter"]
pivot.scale = (units, units, units)

forward = options["forward"]
along_x = forward in ("+x", "-x")
length = (hi.x - lo.x if along_x else hi.y - lo.y) * units
width = (hi.y - lo.y if along_x else hi.x - lo.x) * units
height = (hi.z - lo.z) * units
# Rotation that points the nose along +x (screen right).
base = {"+x": 0.0, "+y": -math.pi / 2, "-x": math.pi, "-y": math.pi / 2}[forward]

# Render settings: workbench (flat studio light that follows the camera, model textures), no AA.
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "TEXTURE"
scene.display.render_aa = "OFF"
scene.render.film_transparent = True
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"

ppu = options["pixelsPerUnit"]
size = math.ceil((math.hypot(length, width) + height) * ppu) + 8
size += size % 2  # even, so the centre is on a pixel corner
scene.render.resolution_x = size
scene.render.resolution_y = size
scene.render.resolution_percentage = 100

camera_data = bpy.data.cameras.new("camera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = size / ppu
camera = bpy.data.objects.new("camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera


def look_from(elevation):
    """Camera on the −y side, tilted down by `elevation`, aimed at the origin."""
    distance = 100
    camera.location = (0, -distance * math.cos(elevation), distance * math.sin(elevation))
    camera.rotation_euler = (math.pi / 2 - elevation, 0, 0)


if options.get("test"):
    look_from(math.pi / 2 - 1e-4)
    pivot.rotation_euler = (0, 0, 0)
    scene.render.filepath = os.path.join(out_dir, "test.png")
    bpy.ops.render.render(write_still=True)
    sys.exit(0)

frames = options["frames"]
for e, degrees in enumerate(options["elevations"]):
    look_from(math.radians(degrees))
    for k in range(frames):
        # Screen angle θ clockwise from right = world angle −θ (y points away from the camera).
        pivot.rotation_euler = (0, 0, base - k * 2 * math.pi / frames)
        scene.render.filepath = os.path.join(out_dir, f"e{e}_{k:02d}.png")
        bpy.ops.render.render(write_still=True)

with open(os.path.join(out_dir, "info.json"), "w") as f:
    json.dump({"size": size, "length": length, "width": width, "height": height}, f)
