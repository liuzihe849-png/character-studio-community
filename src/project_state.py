"""Local versioned editing state. Compare-and-swap prevents silent overwrites."""
from pathlib import Path
import json,re,math,threading,os
from datetime import datetime,timezone
from poster_layers import validate_layers
LOCK=threading.RLock()
class Conflict(ValueError):pass

def definition(root,pid):
 if not isinstance(pid,str) or not re.fullmatch(r'project-[a-f0-9]{20}',pid):raise ValueError('仅导入项目支持版本保存')
 path=root/'projects'/pid/'definition.json'
 if not path.is_file():raise ValueError('找不到项目')
 return json.loads(path.read_text(encoding='utf-8'))

def defaults(d):
 s=dict(version=1,subject=d['id'],style='code',size=1,density=1,speed=1,glow=1,ink=d['inkColor'],glowColor=d['glowColor'],reverse=False)
 if d.get('renderer')=='raster-poster':s['layers']=d['layers']
 if d.get('renderer')=='crt-screen':
  sc=d['screen'];s.update(captions=sc['captions'],crtDelay=0,crtJump=1,crtScan=sc['scan'])
  if sc.get('poster'):
   s.update(posterHeadline=sc['poster']['headline'],posterTexture=sc['poster']['texture'])
   if sc['poster'].get('layers'):s['layers']=sc['poster']['layers']
 s.update(d.get('initialSettings',{}))
 return s

def validate(raw,d):
 if not isinstance(raw,dict) or raw.get('subject')!=d['id'] or raw.get('version')!=1:raise ValueError('项目状态不正确')
 s={'version':1,'subject':d['id']}
 if raw.get('style') not in ['code','ascii','dots','lines','digits']:raise ValueError('不支持此字符样式')
 s['style']=raw['style']
 for k,lo,hi in [('size',.65,1.9),('density',.45,1.8),('speed',.25,3),('glow',0,2),('posterTexture',0,1),('crtDelay',0,1.5),('crtJump',0,2),('crtScan',0,.45)]:
  if k not in raw:continue
  v=raw[k]
  if type(v) not in [int,float] or not math.isfinite(v) or not lo<=v<=hi:raise ValueError('参数超出范围：'+k)
  s[k]=v
 for k in ['ink','glowColor']:
  if not isinstance(raw.get(k),str) or not re.fullmatch('#[a-fA-F0-9]{6}',raw[k]):raise ValueError('颜色不正确')
  s[k]=raw[k]
 if type(raw.get('reverse'))!=bool:raise ValueError('倒放参数不正确')
 s['reverse']=raw['reverse']
 for k,limit,pattern in [('captions',48,r"[A-Z0-9 .,!?':;\-]*"),('posterHeadline',16,r"[A-Z0-9 !?.'\-]{1,16}")]:
  if k in raw:
   a=raw[k]
   if not isinstance(a,list) or len(a)!=2 or any(not isinstance(t,str) or len(t)>limit or not re.fullmatch(pattern,t) for t in a):raise ValueError('文字参数不正确')
   s[k]=a
 if 'layers' in raw:s['layers']=validate_layers(raw['layers'],d.get('renderer')=='raster-poster')
 if d.get('renderer')=='raster-poster' and 'layers' not in s:raise ValueError('缺少项目图层')
 return s

def capabilities(d):
 if any(l['type']=='characterform' for l in d.get('layers',[])):
  return dict(mode='参考字符浮雕与预设三维结构',glyphEditable=True,textEditable=True,notes=['参考浮雕为2.5D；花朵、水母、蝴蝶使用预设三维结构。','主体、标题、小字独立控制，形态动画按主体匹配；不等于任意参考完整三维重建。'])
 layers=d.get('layers',d.get('screen',{}).get('poster',{}).get('layers',[]));bottle=any(l['type']=='bottle3d' for l in layers);plant=any(l['type']=='plant3d' for l in layers);relief=any(l['type']=='relief' for l in layers);phosphor=any(l['type']=='phosphor' for l in layers)
 return dict(mode='磷光字符与化焰消散' if phosphor else '磷光字符浮雕与分层海报' if relief else '三维字符曲面与分层海报' if bottle or plant else '屏幕字幕与分层海报' if d.get('renderer')=='crt-screen' else '原图分层动画',glyphEditable=phosphor or relief or bottle or plant or d.get('renderer')!='raster-poster',textEditable=any(l['type'] in ['text','title','caption'] for l in layers) or d.get('renderer')=='crt-screen',notes=['主体支持独立字符调节与化焰强度；原图标题可换字符和调动画，不能改写字形。' if phosphor else '该作品为图像驱动的2.5D字符浮雕，可调码元、疏密、光色和速度。' if relief else '植物曲面支持字符样式、疏密和连续舒展；当前为山茶花与叶片模型。' if plant else '瓶形主体支持字符样式、疏密和三维运动；新物体需先适配模型。' if bottle else '图像图层保留原字形；文字图层可修改内容。','原图标题与Logo可移动和调动画，不能直接修改其中的文字。'] if d.get('renderer')=='raster-poster' else ['字幕与原场景分别处理，保留屏幕透视与完整画幅。'])

def read(root,pid):
 d=definition(root,pid);path=root/'projects'/pid/'revisions.json'
 with LOCK:
  data=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'revisions':[dict(revision=0,label='初始设计',actor='system',time=datetime.now(timezone.utc).isoformat(),settings=defaults(d))]}
 return dict(project=pid,current=data['revisions'][-1],history=[{k:v for k,v in x.items() if k!='settings'} for x in reversed(data['revisions'])],capabilities=capabilities(d))

def commit(root,pid,raw):
 if (root/"fan-templates.json").exists() and pid in {x["id"] for x in json.loads((root/"fan-templates.json").read_text(encoding='utf-8'))}:raise ValueError("模板原件只读，请先创建自己的作品")
 with LOCK:
  current=read(root,pid);expected=raw.get('baseRevision')
  if type(expected)!=int or expected!=current['current']['revision']:raise Conflict('项目已有新版本，请先读取最新状态')
  d=definition(root,pid);path=root/'projects'/pid/'revisions.json'
  revisions=json.loads(path.read_text(encoding='utf-8'))['revisions'] if path.exists() else [current['current']]
  if raw.get('restore') is not None:
   if type(raw['restore'])!=int or raw['restore']<0:raise ValueError('历史版本编号不正确')
   old=next((x for x in revisions if x['revision']==raw['restore']),None)
   if old is None:raise ValueError('找不到历史版本')
   settings=old['settings']
  else:settings=validate(raw.get('settings'),d)
  label=raw.get('label','手动调整');actor=raw.get('actor','editor')
  if not isinstance(label,str) or not 1<=len(label)<=100 or actor not in ['editor','agent']:raise ValueError('版本说明不正确')
  if settings==current['current']['settings']:return current
  if len(revisions)>=500:raise ValueError('已达500个版本，请先备份项目')
  revisions.append(dict(revision=expected+1,label=label,actor=actor,time=datetime.now(timezone.utc).isoformat(),settings=settings))
  temp=path.with_suffix('.tmp');temp.write_text(json.dumps({'revisions':revisions},ensure_ascii=False), encoding='utf-8');os.replace(temp,path)
  return read(root,pid)


def backup(root,pid):
 import io,zipfile
 d=definition(root,pid);state=read(root,pid)['current'];cfg={k:v for k,v in d.items() if k not in ['id','imported','initialSettings']}
 meta_path=root/'projects'/pid/'creation.json'
 if meta_path.exists():
  meta=json.loads(meta_path.read_text(encoding='utf-8'));cfg['creation']={k:meta[k] for k in ['stage','staticConfirmed','visualReviewed','reviewNotes','source'] if k in meta}
 cfg.update(format='character-studio-project',version=d.get('version',1))
 cfg['editableSettings']={k:v for k,v in state['settings'].items() if k not in ['subject','version']}
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
  for k in ['base','source','mask','atlas','thumbnail']:
   if k in d:
    source=root/d[k]
    if not source.is_file() or root.resolve() not in source.resolve().parents:raise ValueError('项目素材不正确')
    cfg[k]='assets/'+k+'.png';z.write(source,cfg[k])
  z.writestr('project.json',json.dumps(cfg,ensure_ascii=False,indent=2))
 return out.getvalue()
