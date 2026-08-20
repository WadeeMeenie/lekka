from PIL import Image, ImageDraw

size = 1024
image = Image.new("RGB", (size, size), "#10211D")
draw = ImageDraw.Draw(image)
center = size // 2
draw.ellipse((170, 170, 854, 854), fill="#2F7D67")
draw.ellipse((250, 250, 774, 774), fill="#10211D")
draw.ellipse((340, 340, 684, 684), fill="#E9A23B")
draw.ellipse((650, 220, 790, 360), fill="#D95D4F")
draw.line((center, center, 720, 290), fill="#F7F8F5", width=30)
image.save("assets/images/icon.png")
for name in ("splash-icon.png", "favicon.png", "android-icon-foreground.png"):
    image.save(f"assets/images/{name}")
