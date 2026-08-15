import shutil
import os

src = r"C:\Users\Mayer_R\.gemini\antigravity-ide\brain\6730460c-7e7a-4095-a1ab-a58973a90b03\media__1786743334870.jpg"
dst = r"c:\Users\Mayer_R\Desktop\نظام المسلة\frontend\src\assets\church_logo.png"

shutil.copyfile(src, dst)
print("Church logo copied successfully to frontend/src/assets/church_logo.png!")
