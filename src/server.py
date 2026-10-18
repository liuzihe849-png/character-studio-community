"""Loopback-only static editor and bounded PNG-to-MP4 export service."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlparse,parse_qs
import argparse,json,uuid,subprocess,shutil,struct,sys,threading,webbrowser,hashlib,os
from project_import import import_project, list_projects
from project_state import read as read_state,commit,Conflict,backup,definition as get_definition
from agent_service import AgentService
from studio_library import library
from creation_service import CreationService
ThreadingHTTPServer.request_queue_size=128
ROOT=Path(os.environ.get('CHARACTER_STUDIO_ROOT',str(Path(__file__).resolve().parent))).resolve();EXPORTS=ROOT/'exports';EXPORTS.mkdir(exist_ok=True);JOBS={};LOCK=threading.Lock()
AGENT=AgentService(ROOT)
CREATION=CreationService(AGENT)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def end_headers(self):
  if urlparse(self.path).path.endswith(('.js','.css','.html')) or urlparse(self.path).path=='/':self.send_header('Cache-Control','no-store')
  super().end_headers()
 def log_message(self,fmt,*args):
  if self.command!='POST':super().log_message(fmt,*args)
 def reply(self,data,status=200):
  body=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def do_GET(self):
  host=urlparse('http://'+self.headers.get('Host','')).hostname
  if host not in ['127.0.0.1','localhost','::1']:self.reply(dict(error='Local editor only'),403);return
  if urlparse(self.path).path.startswith('/api/create/'):
   try:
    endpoint=urlparse(self.path).path;query=parse_qs(urlparse(self.path).query);did=query.get('id',[''])[0]
    if endpoint=='/api/create/drafts':self.reply(dict(drafts=CREATION.list()))
    elif endpoint=='/api/create/draft':self.reply(CREATION.get(did))
    elif endpoint=='/api/create/image-config':self.reply(CREATION.image_status())
    elif endpoint=='/api/create/project':
     pid=query.get('project',[''])[0];get_definition(ROOT,pid);path=ROOT/'projects'/pid/'creation.json';self.reply(json.loads(path.read_text(encoding='utf-8')) if path.exists() else dict(stage='legacy'))
    elif endpoint=='/api/create/image':
     p=CREATION.path(did);name='generated.png' if query.get('generated')==['1'] and (p/'generated.png').exists() else 'reference.bin';body=(p/name).read_bytes();self.send_response(200);self.send_header('Content-Type','image/png' if name.endswith('.png') else (p/'reference-url.txt').read_text(encoding='utf-8')[5:].split(';')[0]);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    else:self.reply(dict(error='Unknown endpoint'),404)
   except Exception as e:self.reply(dict(error=AGENT.clean_error(e)),400)
   return
  if urlparse(self.path).path.startswith('/api/agent/'):
   try:
    endpoint=urlparse(self.path).path;query=parse_qs(urlparse(self.path).query)
    if endpoint=='/api/agent/status':self.reply(AGENT.status())
    elif endpoint=='/api/agent/history':self.reply(AGENT.conversation(query.get('project',[''])[0]))
    elif endpoint=='/api/agent/job':
     job=AGENT.jobs.get(query.get('id',[''])[0])
     if not job:raise ValueError('任务已过期，请查看本机对话记录')
     self.reply(job.snapshot(int(query.get('after',['0'])[0])))
    else:self.reply(dict(error='Unknown endpoint'),404)
   except Exception as e:self.reply(dict(error=AGENT.clean_error(e)),400)
   return
  if urlparse(self.path).path=="/api/health":self.reply(dict(app="character-studio",projectProtocol=3,workflowProtocol=1,agentProtocol=1,rootId=hashlib.sha256(str(ROOT).encode()).hexdigest()[:16]));return
  if urlparse(self.path).path=='/api/project/active':
   try:
    data=json.loads((ROOT/'active-project.json').read_text(encoding='utf-8'));get_definition(ROOT,data['project']);self.reply(data)
   except (OSError,ValueError,KeyError):self.reply(dict(error='请先打开一个项目'),404)
   return
  if urlparse(self.path).path=="/api/projects":self.reply(dict(projects=list_projects(ROOT)));return
  if urlparse(self.path).path=='/api/library':self.reply(library(ROOT));return
  if urlparse(self.path).path=='/api/project/backup':
   try:
    pid=parse_qs(urlparse(self.path).query).get('project',[''])[0];body=backup(ROOT,pid);self.send_response(200);self.send_header('Content-Type','application/zip');self.send_header('Content-Disposition','attachment; filename="'+pid+'-project.zip"');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
   except ValueError as e:self.reply(dict(error=str(e)),400)
   return
  if urlparse(self.path).path=='/api/project/state':
   try:self.reply(read_state(ROOT,parse_qs(urlparse(self.path).query).get('project',[''])[0]))
   except ValueError as e:self.reply(dict(error=str(e)),400)
   return
  path=urlparse(self.path).path
  allowed=path in ['/','/index.html','/fan-templates.json','/favicon.svg','/assets/manifest.json'] or (path.count('/')==1 and path.endswith(('.js','.css'))) or (path.startswith('/projects/') and path.endswith(('/base.png','/source.png','/mask.png','/atlas.png','/thumbnail.png'))) or (path.startswith('/exports/') and path.endswith('.mp4'))
  if not allowed:self.reply(dict(error='此文件不是编辑器资源'),403);return
  super().do_GET()
 def do_POST(self):
  try:
   host=urlparse('http://'+self.headers.get('Host','')).hostname
   if host not in ['127.0.0.1','localhost','::1']:raise ValueError('Local editor only')
   origin=self.headers.get('Origin')
   if origin and urlparse(origin).netloc!=self.headers.get('Host'):raise ValueError('Same-origin editor only')
   parsed=urlparse(self.path);query=parse_qs(parsed.query);endpoint=parsed.path
   if endpoint.startswith('/api/create/'):
    if self.headers.get('X-Studio-Token')!=AGENT.token:raise ValueError('页面连接已更新，请刷新编辑器')
    length=int(self.headers.get('Content-Length',0))
    if not 1<=length<=6_000_000:raise ValueError('创作内容过大')
    data=json.loads(self.rfile.read(length));did=data.get('id')
    if endpoint=='/api/create/start':self.reply(CREATION.create(data))
    elif endpoint=='/api/create/update':self.reply(CREATION.update(did,data))
    elif endpoint=='/api/create/analyze':self.reply(CREATION.start_analysis(did))
    elif endpoint=='/api/create/cancel':self.reply(CREATION.cancel(did))
    elif endpoint=='/api/create/compose':self.reply(CREATION.compose(did))
    elif endpoint=='/api/create/generate':self.reply(CREATION.generate(did))
    elif endpoint=='/api/create/image-config':self.reply(CREATION.image_configure(data))
    elif endpoint=='/api/create/transition':self.reply(CREATION.transition(data.get('project'),data))
    elif endpoint=='/api/create/thumbnail':
     pid=data.get('project');get_definition(ROOT,pid);image=AGENT.image(data.get('image'))
     if not image or not image.startswith('data:image/png;'):raise ValueError('缩略图需为PNG')
     raw=__import__('base64').b64decode(image.split(',',1)[1]);w,h=struct.unpack('!II',raw[16:24])
     if not 0<w<=720 or not 0<h<=1280:raise ValueError('缩略图尺寸不正确')
     (ROOT/'projects'/pid/'thumbnail.png').write_bytes(raw);self.reply(dict(ok=True))
    else:self.reply(dict(error='Unknown endpoint'),404)
    return
   if endpoint.startswith('/api/agent/'):
    if self.headers.get('X-Studio-Token')!=AGENT.token:raise ValueError('页面连接已更新，请刷新编辑器')
    length=int(self.headers.get('Content-Length',0))
    if not 1<=length<=16_000_000:raise ValueError('对话内容过大')
    data=json.loads(self.rfile.read(length))
    if endpoint=='/api/agent/config':self.reply(AGENT.configure(data));return
    if endpoint=='/api/agent/connect':
     if data.get('provider','codex')=='codex':
      with AGENT.codex_lock:self.reply(AGENT.bridge.connect())
     else:
      cfg=AGENT.config
      if cfg['provider']!='api':raise ValueError('请先保存接口设置')
      # Basic provider connectivity test; no project state or picture is sent.
      if cfg['protocol']=='responses':
       result=AGENT.http_api(cfg,dict(model=cfg['model'],input='Connection test. Reply OK.',store=False),'/responses')
      else:result=AGENT.http_api(cfg,dict(model=cfg['model'],messages=[dict(role='user',content='Connection test. Reply OK.')]),'/chat/completions')
      if result.get('error'):raise ValueError('接口测试失败，请检查模型和协议')
      self.reply(dict(connected=True))
     return
    if endpoint=='/api/agent/login':
     with AGENT.codex_lock:
      AGENT.bridge.connect();result=AGENT.bridge.request('account/login/start',dict(type='chatgpt'))
     self.reply(dict(authUrl=result.get('authUrl'),loginId=result.get('loginId')));return
    if endpoint=='/api/agent/start':self.reply(AGENT.start(data));return
    if endpoint=='/api/agent/clone':self.reply(AGENT.clone(data.get('template'),data.get('name')));return
    if endpoint=='/api/agent/undo':
     self.reply(commit(ROOT,data.get('project'),dict(baseRevision=data.get('expectedRevision'),restore=data.get('revision'),label='撤销对话修改',actor='agent')));return
    job=AGENT.jobs.get(data.get('id'))
    if not job:raise ValueError('任务已过期')
    if endpoint=='/api/agent/cancel':
     with job.lock:job.cancelled=True;job.preview_ready.set()
     self.reply(dict(ok=True));return
    if endpoint=='/api/agent/preview':
     with job.lock:
      req=job.preview_request
      if job.state!='running' or job.cancelled or not req or req['id']!=data.get('request') or req['project']!=data.get('project') or req['revision']!=data.get('revision'):raise ValueError('预览请求已失效')
      if read_state(ROOT,req['project'])['current']['revision']!=req['revision']:raise Conflict('预览期间作品发生了修改')
      job.preview_data=AGENT.image(data.get('image'));job.preview_ready.set()
     self.reply(dict(ok=True));return
    self.reply(dict(error='Unknown endpoint'),404);return
   if endpoint=='/api/project/active':
    length=int(self.headers.get('Content-Length',0))
    if not 1<=length<=256:raise ValueError('项目标识不正确')
    data=json.loads(self.rfile.read(length));get_definition(ROOT,data.get('project'))
    with LOCK:
     path=ROOT/'active-project.json';temp=path.with_suffix('.tmp');temp.write_text(json.dumps({'project':data['project']}), encoding='utf-8');temp.replace(path)
    self.reply(dict(ok=True));return
   if endpoint=='/api/project/state':
    length=int(self.headers.get('Content-Length',0))
    if not 1<=length<=196608:raise ValueError('项目参数过大')
    self.reply(commit(ROOT,query.get('project',[''])[0],json.loads(self.rfile.read(length))));return
   if endpoint=='/api/projects/import':
    length=int(self.headers.get('Content-Length',0))
    if not 1<=length<=64_000_000:raise ValueError('项目包大小需在 64MB 内')
    self.reply(import_project(self.rfile.read(length),ROOT));return
   if endpoint=='/api/start':
    size=int(self.headers.get('Content-Length',0))
    if size>65536:raise ValueError('Settings too large')
    data=json.loads(self.rfile.read(size));n=data.get('frames');fps=data.get('fps');subject=data.get('subject')
    subjects=json.loads((ROOT/'assets/manifest.json').read_text(encoding='utf-8'))['subjects']+list_projects(ROOT)
    definition=next((s for s in subjects if s['id']==subject),None)
    if not definition or type(n)!=int or not 25<=n<=720 or fps!=definition.get('fps',25):raise ValueError('Invalid export settings')
    width,height=definition.get('width',720),definition.get('height',960)
    with LOCK:
     if len(JOBS)>=3:raise ValueError('Another export is in progress')
     jobid=uuid.uuid4().hex;folder=EXPORTS/jobid;(folder/'frames').mkdir(parents=True);JOBS[jobid]=dict(root=folder,total=n,fps=fps,subject=subject,width=width,height=height,settings=data.get('settings',{}))
    self.reply(dict(id=jobid));return
   jobid=query.get('id',[''])[0]
   with LOCK:job=JOBS.get(jobid)
   if not job:raise ValueError('Unknown export')
   folder=job['root']
   if endpoint=='/api/frame':
    n=int(query.get('n',['-1'])[0]);length=int(self.headers.get('Content-Length',0))
    if not 0<=n<job['total'] or not 24<=length<=8_000_000:raise ValueError('Invalid frame')
    data=self.rfile.read(length)
    if data[:8]!=b'\x89PNG\r\n\x1a\n' or struct.unpack('!II',data[16:24])!=(job['width'],job['height']):raise ValueError('PNG dimensions do not match project')
    (folder/'frames'/f'frame_{n:05d}.png').write_bytes(data);self.reply(dict(ok=True));return
   if endpoint=='/api/finish':
    if len(list((folder/'frames').glob('frame_*.png')))!=job['total']:raise ValueError('Missing frames')
    output=folder/(job['subject']+'-edited.mp4')
    try:
     import imageio_ffmpeg
     encoder=imageio_ffmpeg.get_ffmpeg_exe()
    except (ImportError,RuntimeError):
     encoder=shutil.which('ffmpeg')
     if not encoder:raise ValueError('缺少视频编码器，请按README重新安装依赖。')
    cmd=[encoder,'-y','-framerate',str(job['fps']),'-i',str(folder/'frames/frame_%05d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(output)]
    result=subprocess.run(cmd,capture_output=True,text=True,timeout=180)
    if result.returncode or not output.exists():raise ValueError('MP4 编码失败，PNG 帧已保留')
    (folder/'settings.json').write_text(json.dumps(job['settings'],ensure_ascii=False,indent=2), encoding='utf-8');shutil.rmtree(folder/'frames')
    with LOCK:JOBS.pop(jobid,None)
    self.reply(dict(url=output.relative_to(ROOT).as_posix(),name=output.name,duration=job['total']/job['fps']));return
   if endpoint=='/api/cancel':
    with LOCK:JOBS.pop(jobid,None)
    shutil.rmtree(folder,ignore_errors=True);self.reply(dict(ok=True));return
   self.reply(dict(error='Unknown endpoint'),404)
  except Conflict as e:self.reply(dict(error=str(e)),409)
  except Exception as e:self.reply(dict(error=AGENT.clean_error(e)),400)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8895);p.add_argument('--open',action='store_true');p.add_argument('--project');args=p.parse_args()
 for port in range(args.port,args.port+10):
  try:server=ThreadingHTTPServer(('127.0.0.1',port),Handler);break
  except OSError:continue
 else:raise SystemExit('No available local port')
 url=f'http://127.0.0.1:{port}/';print('Character Studio: '+url,flush=True)
 if args.open:
  selected=args.project if args.project in [x['id'] for x in list_projects(ROOT)] else None
  webbrowser.open(url+('?project='+selected if selected else ''))
 try:server.serve_forever()
 except KeyboardInterrupt:server.server_close()
