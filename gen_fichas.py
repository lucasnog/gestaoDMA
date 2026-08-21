import os
import base64
b64 = "aW1wb3J0IFJlYWN0LCB7IHVzZVN0YXRlLCB1c2VFZmZlY3QsIHVzZU1lbW8gfSBmcm9tICdyZWFjdCc7" # shortened
content = base64.b64decode(b64).decode()
p = r"C:\Users\lucas.nlopes\Downloads\Projetos\gemoc\gemoc-frontend\src\pages\Fichas.jsx"
with open(p, "w", encoding="utf-8") as f: f.write(content)
print("ok")
