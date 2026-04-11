path = '/Users/jyekkot/Desktop/kkotium-garden/src/app/layout.tsx'
with open(path, 'r') as f:
    content = f.read()

# Remove the entire footer section with Arabic text
# Find and replace the footer block
import re

# Remove the arabic text paragraph
old = '''                  \u0634\u0643\u0631\u0627\u064b \u0644\u062d\u0628\u064a\u0628\u064a \u064a\u0627\u0633\u0631 \u0639\u0644\u0649 \u0645\u0633\u0627\u0639\u062f\u062a\u064a \u0641\u064a \u062a\u0637\u0648\u064a\u0631 \u062a\u0637\u0628\u064a\u0642\u064a \u0627\u0644\u0623\u0648\u0644'''

# Check what's around line 64
lines = content.split('\n')
for i, line in enumerate(lines):
    if '\u0634\u0643\u0631' in line or '\u062d\u0628\u064a\u0628' in line:
        print(f"Line {i+1}: {repr(line)}")
        # Show context
        start = max(0, i-5)
        end = min(len(lines), i+6)
        for j in range(start, end):
            print(f"  {j+1}: {lines[j][:100]}")
        break
