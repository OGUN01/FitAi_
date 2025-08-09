#!/usr/bin/env uv run --python 3.12
# /// script
# dependencies = ["pydantic"]
# ///

import json
import sys
import re
from pathlib import Path

def validate_tool_use(tool_data):
    """Validate tool usage for React Native best practices and security"""
    
    # Block dangerous operations
    dangerous_patterns = [
        "rm -rf",
        "DELETE FROM",
        "DROP TABLE", 
        ".env",
        "process.env.NODE_ENV = 'production'",
        "console.log.*password",
        "console.log.*secret",
        "console.log.*token"
    ]
    
    if tool_data.get("name") == "Edit":
        content = tool_data.get("parameters", {}).get("new_string", "")
        file_path = tool_data.get("parameters", {}).get("file_path", "")
        
        # Check for dangerous patterns
        for pattern in dangerous_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return {
                    "continue": False,
                    "stopReason": f"🚨 SECURITY BLOCK: Dangerous pattern detected - {pattern}"
                }
        
        # React Native style validation
        if "fontWeight:" in content and '"' in content and "THEME.fontWeight" not in content:
            return {
                "continue": False,
                "stopReason": "🎨 STYLE ERROR: Use THEME.fontWeight constants instead of string values"
            }
        
        # Check for lineHeight usage
        if re.search(r'lineHeight:\s*\d+', content):
            return {
                "continue": False,
                "stopReason": "🎨 STYLE ERROR: Avoid lineHeight in styles (causes HostFunction errors)"
            }
        
        # Check for empty catch blocks
        if re.search(r'catch\s*\([^)]*\)\s*{\s*}', content):
            return {
                "continue": False,
                "stopReason": "🐛 ERROR HANDLING: Empty catch blocks not allowed - implement proper error handling"
            }
        
        # Check for console.log in production files
        if "console.log" in content and file_path and not any(test_dir in file_path for test_dir in ['/test/', '/debug/', '.test.', '.spec.']):
            return {
                "continue": False,
                "stopReason": "📝 LOGGING ERROR: Use proper logging instead of console.log in production code"
            }
        
        # Check for module-level React Native API calls
        if re.search(r'export\s+const\s+\w+\s*=\s*.*(?:Dimensions\.get|getDeviceInfo)', content):
            return {
                "continue": False,
                "stopReason": "⚡ PERFORMANCE ERROR: No module-level React Native API calls (causes HostFunction errors)"
            }
    
    # Validate Bash commands
    elif tool_data.get("name") == "Bash":
        command = tool_data.get("parameters", {}).get("command", "")
        
        # Block potentially dangerous bash commands
        dangerous_bash = ["rm -rf /", "format c:", "del /q", "> /dev/null"]
        for dangerous in dangerous_bash:
            if dangerous in command:
                return {
                    "continue": False,
                    "stopReason": f"🚨 BASH BLOCK: Dangerous command detected - {dangerous}"
                }
    
    return {
        "continue": True,
        "addContext": "✅ Security validation passed - proceeding with operation"
    }

if __name__ == "__main__":
    try:
        data = json.loads(sys.stdin.read())
        result = validate_tool_use(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "continue": False,
            "stopReason": f"Hook validation failed: {str(e)}"
        }))