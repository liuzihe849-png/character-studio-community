"""A discoverable local library. No deletion or automatic project migration."""
import json
from project_import import list_projects

ALBUMS={'project-cf15f0be185d21df792e':'百合 · I’m OK','project-79993f824ede20ed696c':'马蹄莲 · Starboy','project-4896daf8cb31b756f7bb':'玫瑰 · Backlight','project-0d9f764e95fc1822402c':'鸢尾 · groupies','project-717ebee67bbb1f061de8':'波斯菊 · 100 lives'}
BUILTINS={'01-butterfly':('蝴蝶','振翅与轻摆'),'02-jellyfish':('水母','伞盖收缩与触须浮游'),'03-silk':('丝绸','曲面翻动与褶皱流动')}

def item(root,d):
 layers=d.get('layers',d.get('screen',{}).get('poster',{}).get('layers',[]));types={l['type'] for l in layers};pid=d['id']
 if pid in ALBUMS or d.get('title') in ['I’m OK','groupies']:kind='album';motion='花型开合';glyph='主体字符可调；原排版保留'
 elif pid in BUILTINS:kind='subject';motion=BUILTINS[pid][1];glyph='主体字符可调'
 elif d.get('atlas') and not d.get('renderer'):
  kind='subject';identity=' '.join(str(d.get(k,'')) for k in ['base','title','name']).lower()
  motion='伞盖收缩与触须浮游' if any(k in identity for k in ['jellyfish','pelagic','水母']) else '振翅与轻摆' if any(k in identity for k in ['butterfly','flutter','蝴蝶']) else '曲面翻动与褶皱流动' if any(k in identity for k in ['silk','丝绸']) else '花型开合'
  glyph='主体字符可调'
 elif 'characterform' in types:kind='subject';motion='参考浮雕或三维结构动画';glyph='主体与文字独立可调'
 elif 'bottle3d' in types:kind='subject';motion='瓶身三维转动与悬浮';glyph='主体字符可调'
 elif 'plant3d' in types:kind='subject';motion='花瓣舒展与枝叶轻摆';glyph='主体字符可调'
 elif 'phosphor' in types:kind='subject';motion='像素化焰消散';glyph='磷光主体字符可调'
 elif 'relief' in types:kind='subject';motion='浮雕舒展';glyph='浮雕主体字符可调'
 elif d.get('renderer')=='crt-screen':kind='screen';motion='屏幕字幕与电波';glyph='屏幕字幕可改；摄影电视保留'
 else:kind='image';motion='原图图层动画';glyph='原图层不能直接切换字符'
 keys=[k for k in ['base','source','mask','atlas','thumbnail'] if k in d];missing=[k for k in keys if not(root/d[k]).is_file()]
 revision_path=root/'projects'/pid/'revisions.json';definition_path=root/'projects'/pid/'definition.json'
 path=revision_path if revision_path.exists() else definition_path
 return dict(id=pid,name=d['name'],title=d['title'],label=ALBUMS.get(pid,d['name']),thumbnail=d.get('thumbnail'),kind=kind,motion=motion,glyph=glyph,missing=missing,available=not missing,modified=path.stat().st_mtime if path.exists() else 0,imported=bool(d.get('imported')))

def library(root):
 manifest=json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'));projects=[item(root,d) for d in list_projects(root)]
 chosen=json.loads((root/'fan-templates.json').read_text(encoding='utf-8'));by_id={x['id']:x for x in projects};ids={x['id'] for x in chosen}
 templates=[]
 for t in chosen:
  if t['id'] in by_id:
   x=by_id[t['id']];x.update(label=t['name'],number=t['number']);templates.append(x)
 saved=[x for x in projects if x['id'] not in ids]
 return dict(templates=templates,projects=sorted(saved,key=lambda x:x['modified'],reverse=True),counts=dict(saved=len(saved),albums=sum(x['kind']=='album' for x in saved),missing=sum(not x['available'] for x in saved)))
