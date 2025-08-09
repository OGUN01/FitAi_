#!/usr/bin/env uv run --python 3.12
# /// script
# dependencies = ["subprocess"]
# ///

import json
import sys
import subprocess
import os
from pathlib import Path

def post_process_edit(tool_data):
    """Auto-format and validate after edits"""
    
    if tool_data.get("name") == "Edit":
        file_path = tool_data.get("parameters", {}).get("file_path", "")
        
        if file_path and (file_path.endswith('.ts') or file_path.endswith('.tsx')):
            try:
                # Change to project directory
                project_dir = Path(file_path).parents[0]
                while project_dir.parent != project_dir:
                    if (project_dir / 'package.json').exists():
                        break
                    project_dir = project_dir.parent
                
                # Auto-format TypeScript files
                format_result = subprocess.run(
                    ['npx', 'prettier', '--write', file_path], 
                    cwd=str(project_dir),
                    check=False,
                    capture_output=True,
                    text=True
                )
                
                if format_result.returncode == 0:
                    context_msg = "✨ Auto-formatted code with Prettier"
                else:
                    context_msg = f"⚠️ Prettier formatting skipped: {format_result.stderr[:100]}"
                
                # Run TypeScript check only for critical files
                if any(critical in file_path for critical in ['/services/', '/stores/', '/ai/']):
                    ts_result = subprocess.run(
                        ['npx', 'tsc', '--noEmit'], 
                        cwd=str(project_dir),
                        capture_output=True, 
                        text=True,
                        timeout=10
                    )
                    
                    if ts_result.returncode != 0:
                        return {
                            "continue": False,
                            "stopReason": f"🔍 TypeScript errors in critical file:\n{ts_result.stderr[:500]}"
                        }
                    else:
                        context_msg += " | ✅ TypeScript validation passed"
                
                return {
                    "continue": True,
                    "addContext": context_msg
                }
                
            except subprocess.TimeoutExpired:
                return {
                    "continue": True,
                    "addContext": "⏱️ TypeScript check timed out - continuing (run `npm run type-check` manually)"
                }
            except subprocess.CalledProcessError as e:
                return {
                    "continue": True,
                    "addContext": f"⚠️ Post-processing warning: {str(e)[:100]}"
                }
            except Exception as e:
                return {
                    "continue": True,
                    "addContext": f"⚠️ Post-processing skipped: {str(e)[:100]}"
                }
    
    # Handle other tool types
    elif tool_data.get("name") == "Write":
        file_path = tool_data.get("parameters", {}).get("file_path", "")
        
        # Track new file creation
        if file_path:
            return {
                "continue": True,
                "addContext": f"📄 Created new file: {Path(file_path).name}"
            }
    
    return {
        "continue": True,
        "addContext": "🔄 Post-processing completed"
    }

if __name__ == "__main__":
    try:
        data = json.loads(sys.stdin.read())
        result = post_process_edit(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "continue": True,
            "addContext": f"Post-processing hook error: {str(e)[:100]}"
        }))