"""Bounded JSON scene graph shared by editable projects and parameter backups."""
import math,re

def validate_motion(raw):
 if not isinstance(raw,dict) or raw.get('type') not in ['none','wave','voltage','pulse','float','scan','rise','typing']:raise ValueError('Invalid layer animation')
 result={'type':raw['type']}
 for k,lo,hi in [('bpm',10,240),('amount',0,1),('detail',1,12),('duty',.05,.8),('phase',0,1)]:
  v=raw.get(k)
  if type(v) not in [int,float] or not math.isfinite(v) or not lo<=v<=hi:raise ValueError('Invalid animation parameter: '+k)
  result[k]=v
 if result['bpm']%10:raise ValueError('Loop tempo must use 10 BPM increments')
 return result

def validate_layers(items,raster=False):
 if not isinstance(items,list) or not 1<=len(items)<=64:raise ValueError('图层数量不正确')
 ids=set();result=[];types=['text','title','rule','corners','wave','barcode']+(['image','particles','characterform','bottle3d','plant3d','relief','phosphor'] if raster else ['tv','caption'])
 for l in items:
  if not isinstance(l,dict) or not isinstance(l.get('id'),str) or not re.fullmatch('[a-z0-9-]{1,40}',l['id']) or l['id'] in ids or l.get('type') not in types:raise ValueError('图层标识不正确')
  ids.add(l['id']);r={k:l[k] for k in ['id','type']}
  for k,lo,hi in [('x',-1440,2160),('y',-2560,3840),('w',1,1440),('h',1,2560),('scale',.1,4),('rotation',-180,180),('opacity',0,1),('fontSize',1,200)]:
   if k=='fontSize' and k not in l:continue
   v=l.get(k)
   if type(v) not in [int,float] or not math.isfinite(v) or not lo<=v<=hi:raise ValueError('图层数值不正确：'+k)
   r[k]=v
  color=l.get('color')
  if type(l.get('visible'))!=bool or not isinstance(color,str) or not(color=='' or re.fullmatch('#[a-fA-F0-9]{6}',color)):raise ValueError('图层颜色或显隐不正确')
  r.update(visible=l['visible'],color=color)
  if not isinstance(l.get('name'),str) or len(l['name'])>80:raise ValueError('图层名称不正确')
  r['name']=l['name']
  if 'glyphStyle' in l:
   if l['glyphStyle'] not in ['inherit','code','ascii','dots','lines','digits']:raise ValueError('Invalid element glyph style')
   r['glyphStyle']=l['glyphStyle']
  for key,lo,hi in [('glyphSize',.65,1.9),('glyphDensity',.45,1.8)]:
   if key in l:
    if type(l[key]) not in [int,float] or not math.isfinite(l[key]) or not lo<=l[key]<=hi:raise ValueError('Invalid element glyph parameter')
    r[key]=l[key]
  if 'phosphorKind' in l:
   if l['type']!='phosphor' or l['phosphorKind'] not in ['plant','title']:raise ValueError('Invalid phosphor layer')
   r['phosphorKind']=l['phosphorKind']
  if 'growth' in l:
   b=l['growth']
   if l['type'] not in ['relief','phosphor'] or not isinstance(b,dict) or type(b.get('enabled'))!=bool or type(b.get('amount')) not in [int,float] or not math.isfinite(b['amount']) or not 0<=b['amount']<=1:raise ValueError('Invalid botanical growth')
   r['growth']={'enabled':b['enabled'],'amount':b['amount']}
  if l['type'] in ['text','title','caption']:
   text=l.get('text')
   if not isinstance(text,str) or len(text)>160 or re.search(r'[\x00-\x1f]',text):raise ValueError('图层文字不正确')
   if l['type']=='caption' and (len(text)>48 or not re.fullmatch(r"[A-Z0-9 .,!?':;\-]*",text)):raise ValueError('屏幕字幕不正确')
   if l.get('font') not in ['sans','mono','serif','pixel']:raise ValueError('字体不正确')
   if 'fontSize' not in r:raise ValueError('缺少字号')
   r.update(text=text,font=l['font'])
  if l['type']=='tv' and l['id']!='television' or l['type']=='caption' and l['id'] not in ['caption-1','caption-2']:raise ValueError('主体图层标识不正确')
  if l['type']=='bottle3d':
   b=l.get('bottle')
   if not isinstance(b,dict) or type(b.get('rotate'))!=bool or b.get('mode') not in ['sway','spin']:raise ValueError('Invalid 3D bottle settings')
   clean={'rotate':b['rotate'],'mode':b['mode']}
   for key,lo,hi in [('yaw',0,180),('pitch',0,40),('float',0,1),('contrast',.5,3)]:
    v=b.get(key)
    if type(v) not in [int,float] or not math.isfinite(v) or not lo<=v<=hi:raise ValueError('Invalid 3D parameter: '+key)
    clean[key]=v
   r['bottle']=clean
   rect=l.get('logoSourceRect')
   if not isinstance(rect,list) or len(rect)!=4 or any(type(x) not in [int,float] or not math.isfinite(x) for x in rect) or not(0<=rect[0]<720 and 0<=rect[1]<1280 and rect[2]>0 and rect[3]>0 and rect[0]+rect[2]<=720 and rect[1]+rect[3]<=1280):raise ValueError('Invalid logo region')
   r['logoSourceRect']=rect
  if l['type']=='characterform':
   options={'surface':['none','float','ripple','dissolve'],'flower':['none','grow','float','dissolve'],'jellyfish':['none','swim','float','dissolve'],'butterfly':['none','flap','float','dissolve']}
   if l.get('form') not in options or l.get('formMotion') not in options[l['form']]:raise ValueError('主体形态动画不匹配')
   r.update(form=l['form'],formMotion=l['formMotion'])
  if l['type'] in ['image','relief','phosphor','characterform']:
   rect=l.get('sourceRect')
   if not isinstance(rect,list) or len(rect)!=4 or any(type(x) not in [int,float] or not math.isfinite(x) for x in rect) or not(0<=rect[0]<720 and 0<=rect[1]<1280 and rect[2]>0 and rect[3]>0 and rect[0]+rect[2]<=720 and rect[1]+rect[3]<=1280):raise ValueError('Invalid source region')
   r['sourceRect']=rect
   if 'polygon' in l:
    poly=l['polygon']
    if not isinstance(poly,list) or not 3<=len(poly)<=40 or any(not isinstance(p,list) or len(p)!=2 or any(type(v) not in [int,float] or not math.isfinite(v) for v in p) or not(0<=p[0]<=720 and 0<=p[1]<=1280) for p in poly):raise ValueError('Invalid layer mask')
    r['polygon']=poly
  if 'motion' in l:
   r['motion']=validate_motion(l['motion'])
   if r['motion']['type']=='wave' and l['type']!='wave' or r['motion']['type']=='voltage' and l['type'] not in ['title','text','caption','image','phosphor']:raise ValueError('Animation is incompatible with this layer')
   if r['motion']['type']=='typing' and (l['type']!='text' or l.get('font')!='pixel'):raise ValueError('Typing requires pixel text')
   if (r['motion']['type']=='rise' and l['type']!='particles') or (l['type']=='particles' and r['motion']['type'] not in ['none','rise']):raise ValueError('Rise animation requires particles')
  result.append(r)
 if raster:return result
 if not {'television','caption-1','caption-2'}<=ids:raise ValueError('缺少电视或字幕图层')
 if next(l for l in result if l['id']=='television')['type']!='tv' or any(l['type']!='caption' for l in result if l['id'] in ['caption-1','caption-2']):raise ValueError('主体图层类型不正确')
 return result
