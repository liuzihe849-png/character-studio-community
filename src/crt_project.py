"""Validation for the declarative CRT project profile. No imported code is run."""
import math,re
from poster_layers import validate_layers

def validate_crt(cfg):
 if cfg.get('renderer')!='crt-screen':raise ValueError('不支持的项目渲染器；请先适配编辑器')
 if (cfg.get('width'),cfg.get('height'))!=(720,1280):raise ValueError('CRT 项目当前要求720×1280画幅')
 if cfg.get('fps') not in [25,30] or cfg.get('loopSeconds')!=6:raise ValueError('CRT 项目要求6秒基础周期，25或30fps')
 s=cfg.get('screen')
 if not isinstance(s,dict) or s.get('space')!=[640,480]:raise ValueError('缺少640×480屏幕空间')
 quad=s.get('quad')
 if not isinstance(quad,list) or len(quad)!=4:raise ValueError('需要四个屏幕角点')
 for pt in quad:
  if not isinstance(pt,list) or len(pt)!=2 or any(type(x) not in [float,int] or not math.isfinite(x) for x in pt) or not(0<=pt[0]<=720 and 0<=pt[1]<=1280):raise ValueError('屏幕角点不正确')
 crosses=[]
 for i in range(4):
  a,b,c=quad[i],quad[(i+1)%4],quad[(i+2)%4];crosses.append((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))
 if min(crosses)<=100:raise ValueError('屏幕四角须按左上、右上、右下、左下形成凸四边形')
 caps=s.get('captions')
 if not isinstance(caps,list) or len(caps)!=2 or any(not isinstance(t,str) or len(t)>48 or not re.fullmatch(r"[A-Z0-9 .,!?':;\-]*",t) for t in caps):raise ValueError('字幕需为两行英文大写、数字或支持的标点，每行最多48字符')
 for key,lo,hi in [('pixelUnit',3,12),('barrel',0,.08),('scan',0,.45)]:
  v=s.get(key)
  if type(v) not in [int,float] or not math.isfinite(v) or not lo<=v<=hi:raise ValueError('屏幕参数不正确：'+key)
 for key in ['entries','exits']:
  values=s.get(key)
  if not isinstance(values,list) or len(values)!=3 or any(type(v) not in [int,float] or not math.isfinite(v) or not 0<=v<=5.6 for v in values):raise ValueError('字幕时间轴不正确')
 if any(s['entries'][i]+.3>=s['exits'][i] for i in range(3)):raise ValueError('字幕稳定阅读时间不足')
 result={k:s[k] for k in ['space','quad','captions','pixelUnit','barrel','scan','entries','exits']}

 if 'poster' in s:
  p=s['poster']
  if not isinstance(p,dict):raise ValueError('海报配置不正确')
  h=p.get('headline')
  if not isinstance(h,list) or len(h)!=2 or any(not isinstance(t,str) or not re.fullmatch(r"[A-Z0-9 !?.'-]{1,16}",t) for t in h):raise ValueError('海报标题需要两行英文大写，每行1至16字')
  b=p.get('bounds')
  if not isinstance(b,list) or len(b)!=4 or any(type(v) not in [int,float] or not math.isfinite(v) for v in b) or not(0<=b[0]<b[2]<=720 and 0<=b[1]<b[3]<=1280):raise ValueError('海报主体区域不正确')
  t=p.get('texture')
  if type(t) not in [int,float] or not math.isfinite(t) or not 0<=t<=1:raise ValueError('点阵强度不正确')
  result['poster']=dict(headline=h,bounds=b,texture=t)
  if 'layers' in p:result['poster']['layers']=validate_layers(p['layers'])
 return result
