#!/usr/bin/env uv run --python 3.12
# /// script
# dependencies = ["subprocess"]
# ///

import json
import sys
import subprocess
import os
from pathlib import Path
from datetime import datetime

def session_startup():
    """Load development context and perform health checks"""
    
    context_info = []
    
    try:
        # Get git status
        git_result = subprocess.run(
            ['git', 'status', '--porcelain'], 
            capture_output=True, 
            text=True,
            timeout=5
        )
        
        if git_result.returncode == 0:
            modified_files = len([line for line in git_result.stdout.strip().split('\n') if line])
            if modified_files > 0:
                context_info.append(f"📝 {modified_files} modified files in working directory")
            else:
                context_info.append("✅ Working directory clean")
        
        # Get recent commits
        git_log_result = subprocess.run(
            ['git', 'log', '--oneline', '-3'], 
            capture_output=True, 
            text=True,
            timeout=5
        )
        
        if git_log_result.returncode == 0:
            recent_commits = git_log_result.stdout.strip().split('\n')[:2]
            context_info.append(f"📋 Recent commits: {recent_commits[0][:50]}...")
        
        # Check if npm packages are installed
        if Path('node_modules').exists():
            context_info.append("📦 Node modules installed")
        else:
            context_info.append("⚠️ Node modules missing - run `npm install`")
        
        # Check for TypeScript config
        if Path('tsconfig.json').exists():
            context_info.append("🔷 TypeScript configured")
        
        # Check for environment files
        env_files = ['.env', '.env.local', 'eas.json']
        for env_file in env_files:
            if Path(env_file).exists():
                context_info.append(f"🔑 {env_file} found")
        
        # Quick health check - try to run TypeScript check
        try:
            ts_result = subprocess.run(
                ['npx', 'tsc', '--noEmit', '--skipLibCheck'], 
                capture_output=True, 
                text=True,
                timeout=15
            )
            
            if ts_result.returncode == 0:
                context_info.append("✅ TypeScript health check passed")
            else:
                error_count = ts_result.stderr.count('error TS')
                context_info.append(f"⚠️ TypeScript has {error_count} errors - check with `npm run type-check`")
        except subprocess.TimeoutExpired:
            context_info.append("⏱️ TypeScript check timed out")
        except:
            context_info.append("🔍 TypeScript check skipped")
        
        # Development environment info
        session_time = datetime.now().strftime("%H:%M")
        context_info.insert(0, f"🚀 FitAI Development Session Started - {session_time}")
        
        return {
            "continue": True,
            "addContext": "\n".join([
                "=" * 60,
                *context_info,
                "=" * 60,
                "💡 Pro Tips:",
                "• Use /reliability for comprehensive code audit",
                "• Use /fix-todos to resolve all TODO items", 
                "• Use /performance for bundle analysis",
                "• Type checking runs automatically on critical file edits",
                "=" * 60
            ])
        }
        
    except Exception as e:
        return {
            "continue": True,
            "addContext": f"🚀 FitAI session started with limited context: {str(e)[:100]}"
        }

if __name__ == "__main__":
    try:
        result = session_startup()
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            "continue": True,
            "addContext": f"Session start hook error: {str(e)}"
        }))