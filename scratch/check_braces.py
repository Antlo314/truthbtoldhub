
import re

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove strings
    content = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '""', content)
    content = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", "''", content)
    content = re.sub(r"`[^`\\]*(?:\\.[^`\\]*)*`", "``", content)
    
    # Remove comments
    content = re.sub(r'//.*', '', content)
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)

    stack = []
    for i, char in enumerate(content):
        if char == '{': stack.append(('{', i))
        elif char == '}':
            if not stack: print(f"Extra }} at {i}")
            elif stack[-1][0] == '{': stack.pop()
            else: print(f"Mismatch }} at {i}")
        elif char == '(': stack.append(('(', i))
        elif char == ')':
            if not stack: print(f"Extra ) at {i}")
            elif stack[-1][0] == '(': stack.pop()
            else: print(f"Mismatch ) at {i}")

    if not stack:
        print("Pure balance")
    else:
        for char, pos in stack:
            # Find line number
            line_num = content[:pos].count('\n') + 1
            print(f"Unclosed {char} at line {line_num}")

check_braces('app/codex/page.tsx')
