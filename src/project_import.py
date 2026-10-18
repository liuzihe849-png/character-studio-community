"""Read bounded declarative ZIP packages; never execute or extract package code."""
from pathlib import Path,PurePosixPath
import io,json,zipfile,stat,struct,hashlib,re,math,tempfile,shutil
from crt_project import validate_crt
from raster_project import validate_raster

def list_projects(root):
 result=[]
 for path in sorted((root/'projects').glob('project-*/definition.json')):
  try:result.append(json.loads(path.read_text(encoding='utf-8')))
  except (ValueError,OSError):continue
 return result

def import_project(data,root):
 try:z=zipfile.ZipFile(io.BytesIO(data))
 except zipfile.BadZipFile:raise ValueError('无法读取 ZIP 项目包')
 with z:
  infos=z.infolist()
  if len(infos)>64 or sum(x.file_size for x in infos)>96_000_000:raise ValueError('项目包内容过大')
  names=set()
  for info in infos:
   path=PurePosixPath(info.filename)
   if info.filename in names or path.is_absolute() or '..' in path.parts or '\\' in info.filename or stat.S_ISLNK(info.external_attr>>16) or info.file_size>32_000_000:raise ValueError('项目包包含不安全或过大的路径')
   names.add(info.filename)
  manifests=[n for n in names if n=='project.json' or (n.count('/')==1 and n.endswith('/project.json'))]
  if len(manifests)!=1:raise ValueError('需要一个 project.json；若下载了五套合集，请先解压合集')
  m=manifests[0];prefix=m[:-len('project.json')]
  if z.getinfo(m).file_size>65536:raise ValueError('项目说明过大')
  cfg=json.loads(z.read(m))
  if cfg.get('format')!='character-studio-project' or cfg.get('version') not in [1,2,3]:raise ValueError('不支持的项目格式或版本')
  crt=cfg['version']==2;raster=cfg['version']==3
  if raster:layers=validate_raster(cfg)
  elif crt:screen=validate_crt(cfg)
  else:
   for key,value in [('width',720),('height',960),('tileWidth',180),('tileHeight',240),('loopSeconds',6)]:
    if cfg.get(key)!=value:raise ValueError('字符场项目要求720×960、180×240运动场、6秒基础周期')
   count=cfg.get('frames');cols=cfg.get('columns')
   if type(count)!=int or not 2<=count<=150 or type(cols)!=int or not 1<=cols<=15:raise ValueError('运动场帧数或列数不正确')
  assets={}
  for key in (['base','source','thumbnail'] if raster else ['base','mask','thumbnail'] if crt else ['base','mask','atlas','thumbnail']):
   name=cfg.get(key)
   if not isinstance(name,str) or prefix+name not in names:raise ValueError('缺少素材：'+key)
   content=z.read(prefix+name)
   if len(content)<33 or content[:8]!=b'\x89PNG\r\n\x1a\n' or content[12:16]!=b'IHDR':raise ValueError('素材需要 PNG：'+key)
   w,h=struct.unpack('!II',content[16:24])
   if raster:valid=((w,h)==(cfg['width'],cfg['height']) if key=='base' else (w,h) in [(720,1080),(720,1280)] if key=='source' else 0<w<=720 and 0<h<=1280)
   elif crt:valid=(w,h)==(720,1280) if key in ['base','mask'] else 0<w<=720 and 0<h<=1280
   elif key in ['base','mask']:valid=(w,h) in [(720,960),(1440,1920)]
   elif key=='atlas':valid=(w,h)==(180*cols,240*math.ceil(count/cols))
   else:valid=0<w<=720 and 0<h<=960
   if not valid:raise ValueError('素材尺寸不正确：'+key)
   assets[key]=content
  for key in ['inkColor','glowColor','intersection']:
   if not isinstance(cfg.get(key),str) or not re.fullmatch('#[0-9a-fA-F]{6}',cfg[key]):raise ValueError('颜色格式不正确：'+key)
  soft=cfg.get('softInk')
  if not isinstance(soft,list) or len(soft)!=3 or any(type(v) not in (int,float) or not 0<=v<=255 for v in soft):raise ValueError('柔光交点颜色不正确')
  for key in ['title','name','description','lower']:
   if not isinstance(cfg.get(key),str) or len(cfg[key])>200:raise ValueError('项目文字不正确：'+key)
  creation=cfg.get('creation')
  if creation is not None:
   if not isinstance(creation,dict) or set(creation)-{'stage','staticConfirmed','visualReviewed','reviewNotes','source'} or creation.get('stage') not in ['static-review','animation','editing'] or any(k in creation and type(creation[k])!=bool for k in ['staticConfirmed','visualReviewed']) or 'reviewNotes' in creation and (not isinstance(creation['reviewNotes'],str) or len(creation['reviewNotes'])>1200) or 'source' in creation and creation['source'] not in ['generated','reference','procedural']:raise ValueError('创作阶段信息不正确')
  digest=hashlib.sha256(json.dumps(cfg,sort_keys=True,ensure_ascii=False).encode()+b''.join(assets.values())).hexdigest()[:20];pid='project-'+digest
  definition={k:cfg[k] for k in ['title','name','description','lower','width','height','loopSeconds','inkColor','glowColor','intersection','softInk']}
  if raster:definition.update(version=3,renderer='raster-poster',layers=layers,fps=cfg['fps'])
  elif crt:definition.update(version=2,renderer='crt-screen',screen=screen,fps=cfg['fps'])
  else:definition.update({k:cfg[k] for k in ['tileWidth','tileHeight','frames','columns']})
  definition.update(id=pid,imported=True)
  for key in assets:definition[key]=f'projects/{pid}/{key}.png'
  if 'editableSettings' in cfg:
   from project_state import defaults,validate
   if not isinstance(cfg['editableSettings'],dict):raise ValueError('可编辑参数不正确')
   definition['initialSettings']=validate({**defaults(definition),**cfg['editableSettings'],'version':1,'subject':pid},definition)
  parent=root/'projects';parent.mkdir(exist_ok=True);dest=parent/pid;duplicate=dest.exists()
  if not duplicate:
   temp=Path(tempfile.mkdtemp(prefix='.import-',dir=parent))
   try:
    for key,content in assets.items():(temp/(key+'.png')).write_bytes(content)
    (temp/'definition.json').write_text(json.dumps(definition,ensure_ascii=False,indent=2), encoding='utf-8')
    if creation is not None:(temp/'creation.json').write_text(json.dumps(creation,ensure_ascii=False), encoding='utf-8')
    try:temp.rename(dest)
    except FileExistsError:duplicate=True
   finally:
    if temp.exists():shutil.rmtree(temp)
  return dict(project=definition,duplicate=duplicate)
