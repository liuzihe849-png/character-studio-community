#!/usr/bin/env python3
"""Start the complete editor; never read credentials from the checkout."""
import argparse,json,os,platform,runpy,shutil,sys
from pathlib import Path
REPO=Path(__file__).resolve().parent

def prepare(data):
 seed=REPO/'web';editor=data/'editor';editor.mkdir(parents=True,exist_ok=True)
 for p in seed.iterdir():
  if p.is_file():shutil.copy2(p,editor/p.name)
 shutil.copytree(seed/'assets',editor/'assets',dirs_exist_ok=True)
 for t in json.loads((seed/'fan-templates.json').read_text(encoding='utf-8')):
  target=editor/'projects'/t['id']
  if not target.exists():shutil.copytree(seed/'projects'/t['id'],target)
 return editor

def main():
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8895);p.add_argument('--no-open',action='store_true');p.add_argument('--data-dir',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args()
 if sys.version_info<(3,10):raise SystemExit('Python 3.10 or newer is required.')
 try:
  import numpy
  from PIL import Image
  import imageio_ffmpeg
 except ImportError as e:raise SystemExit('Missing dependencies. Run: python -m pip install -r requirements.txt') from e
 if a.data_dir:data=a.data_dir.expanduser().resolve()
 elif sys.platform=='win32':data=Path(os.environ.get('LOCALAPPDATA',str(Path.home()/'AppData/Local')))/'CharacterStudioCommunity'
 elif sys.platform=='darwin':data=Path.home()/'Library/Application Support/Character Studio Community'
 else:data=Path(os.environ.get('XDG_DATA_HOME',str(Path.home()/'.local/share')))/'character-studio-community'
 editor=prepare(data)
 if a.check:
  print(json.dumps(dict(python=platform.python_version(),platform=platform.system(),templates=len(json.loads((editor/'fan-templates.json').read_text(encoding='utf-8'))),encoderAvailable=Path(imageio_ffmpeg.get_ffmpeg_exe()).is_file(),codexFound=bool(shutil.which('codex') or shutil.which('codex.exe')),dataDirectory=str(data)),ensure_ascii=False,indent=2));return
 os.environ['CHARACTER_STUDIO_ROOT']=str(editor);sys.path.insert(0,str(REPO/'src'));sys.argv=['server','--port',str(a.port)]+([] if a.no_open else ['--open']);runpy.run_module('server',run_name='__main__')
if __name__=='__main__':main()
