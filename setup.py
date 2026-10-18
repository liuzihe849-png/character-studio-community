#!/usr/bin/env python3
"""Local dependency setup, intentionally separate from packaging metadata."""
import argparse,os,subprocess,sys,venv
from pathlib import Path
root=Path(__file__).resolve().parent
if sys.version_info<(3,10):raise SystemExit('Install Python 3.10+ first.')
p=argparse.ArgumentParser();p.add_argument('--start',action='store_true');a=p.parse_args()
env=root/'.venv';exe=env/('Scripts/python.exe' if os.name=='nt' else 'bin/python')
if not exe.exists():venv.EnvBuilder(with_pip=True).create(env)
subprocess.run([str(exe),'-m','pip','install','-r',str(root/'requirements.txt')],cwd=root,check=True)
subprocess.run([str(exe),str(root/'start.py'),'--check'],cwd=root,check=True)
if a.start:raise SystemExit(subprocess.call([str(exe),str(root/'start.py')],cwd=root))
print('Ready. Start: '+str(exe)+' start.py')
