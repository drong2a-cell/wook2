#!/usr/bin/env python3
"""Generate PWA icons using PIL"""
from PIL import Image, ImageDraw, ImageFont
import os

sizes = [72, 96, 128, 144, 152, 192, 384, 512]
output_dir = "client/public/icons"
os.makedirs(output_dir, exist_ok=True)

for size in sizes:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background circle with gradient-like effect
    margin = size // 10
    # Outer circle - soft blue
    draw.ellipse([0, 0, size-1, size-1], fill=(107, 159, 228, 255))
    # Inner highlight
    draw.ellipse([margin//2, margin//2, size-margin//2-1, size-margin//2-1], 
                 fill=(130, 175, 235, 255))
    
    # Heart emoji approximation using circles and triangle
    cx, cy = size // 2, size // 2
    heart_size = size // 3
    
    # Draw heart shape
    hs = heart_size
    # Two circles for top of heart
    draw.ellipse([cx - hs, cy - hs//2, cx, cy + hs//2], fill=(255, 255, 255, 220))
    draw.ellipse([cx, cy - hs//2, cx + hs, cy + hs//2], fill=(255, 255, 255, 220))
    # Triangle for bottom
    draw.polygon([
        (cx - hs, cy + hs//4),
        (cx + hs, cy + hs//4),
        (cx, cy + hs + hs//4)
    ], fill=(255, 255, 255, 220))
    
    img.save(f"{output_dir}/icon-{size}.png", "PNG")
    print(f"Generated icon-{size}.png")

print("All icons generated!")
