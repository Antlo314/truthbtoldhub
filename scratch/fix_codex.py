
with open('app/codex/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the first main closure and the following repetition
start_del = -1
end_del = -1
for i, line in enumerate(lines):
    if i > 800 and '</main>' in line:
        if start_del == -1:
            start_del = i + 1 # Start deleting after the first </main>
        else:
            # Found another </main>, keep track
            end_del = i

# Surgical deletion: We want to keep everything up to the first </main> at line ~898
# and then skip the repeated header/main/etc and resume at the modals
# The first set of modals starts around 900 in the duplicated block, 
# but we want to skip that whole block and keep the ones at the very end.

# Actually, let's just find the last occurrence of the modals and keep only that.
# Or better: let's find the FIRST </main> and the LAST set of modals.

new_lines = lines[:898] # Keep up to the first main closure
# Add the closing tag for the main and the ternary if they were in the first 898 lines
# Actually let's just find where the first main ends.

with open('app/codex/page.tsx', 'w', encoding='utf-8') as f:
    # First 898 lines seem to be the correct first pass
    f.writelines(lines[:898])
    # Then we skip the repetition and jump to the modals
    # The last set of modals starts around 1095 in the CURRENT file
    f.writelines(lines[1094:])
