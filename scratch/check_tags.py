
import re

def check_tags(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove strings
    content = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '""', content)
    content = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", "''", content)
    content = re.sub(r"`[^`\\]*(?:\\.[^`\\]*)*`", "``", content, flags=re.DOTALL)
    
    # Remove comments
    content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
    # Be careful with // comments, only if they are not in URLs
    # Since strings are removed, // should be safe now?
    content = re.sub(r'//.*', '', content)

    # Find all tags
    # Matches <Tag ... > or <Tag ... /> or </Tag>
    # Group 1: Slash if closing
    # Group 2: Tag name
    # Group 3: Slash if self-closing
    tag_regex = r'<(/)?([A-Za-z0-9]+)(?:[^>]*?(/)?>)'
    
    stack = []
    for match in re.finditer(tag_regex, content):
        is_closing = match.group(1) is not None
        tag_name = match.group(2)
        is_self_closing = match.group(3) is not None
        
        if is_self_closing:
            continue
        
        if is_closing:
            if not stack:
                print(f"Extra closing tag </{tag_name}> at position {match.start()}")
            elif stack[-1][0] == tag_name:
                stack.pop()
            else:
                print(f"Mismatch: got </{tag_name}>, expected </{stack[-1][0]}> at position {match.start()}")
        else:
            # Check if it's a known self-closing HTML tag or if it has the self-closing slash
            # (In JSX, even standard HTML tags can be non-self-closing if they have children)
            stack.append((tag_name, match.start()))

    if not stack:
        print("All tags balanced")
    else:
        for tag, pos in stack:
            line_num = content[:pos].count('\n') + 1
            print(f"Unclosed tag <{tag}> at line {line_num}")

check_tags('app/codex/page.tsx')
