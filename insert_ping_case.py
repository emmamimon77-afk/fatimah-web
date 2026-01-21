#!/usr/bin/env python3
import sys

with open('server.js', 'r') as f:
    lines = f.readlines()

# Find the line with "case 'chat':"
for i, line in enumerate(lines):
    if "case 'chat':" in line:
        # Insert ping case before this line
        ping_case = [
            '                case \'ping\':\n',
            '                    // Keep-alive response\n',
            '                    ws.send(JSON.stringify({\n',
            '                        type: \'pong\',\n',
            '                        time: new Date().toISOString()\n',
            '                    }));\n',
            '                    break;\n',
            '\n'
        ]
        lines[i:i] = ping_case
        break

with open('server.js', 'w') as f:
    f.writelines(lines)

print("✅ Added ping case!")
