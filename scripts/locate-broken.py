#!/usr/bin/env python3
# Locate broken Korean patterns in discord-builder.ts
import codecs

with open('src/lib/notifications/discord-builder.ts', encoding='utf-8') as f:
    content = f.read()
try:
    decoded = codecs.decode(content, 'unicode_escape')
except Exception as e:
    print('decode err:', e)
    decoded = content

# Find lines containing broken patterns
broken_words = ['\ub290\ub300\uace0', '\ubc14\uc0c1', '\uc8fc\ub384', '\uc4de\uc2a4']

for word in broken_words:
    for i, line in enumerate(decoded.split('\n'), 1):
        if word in line:
            # Print line number and a short context
            short = line.strip()[:120]
            print(f'L{i}: {short}')
