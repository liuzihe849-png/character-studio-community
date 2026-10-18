"""Bounded offline image extraction/composition worker (Pillow + numpy)."""
import io,json,sys,uuid,warnings,hashlib
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFilter
import numpy as np
from creation_service import motion_default
Image.MAX_IMAGE_PIXELS=24_000_000
warnings.simplefilter('error',Image.DecompressionBombWarning)
p=Path(sys.argv[1]);plan=json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'));W,H=720,1080
kind=plan['subjectKind'];source=Image.new('RGBA',(W,H));generated=(p/'generated.png').exists();original=p/'generated.png' if generated else p/'reference.bin'
if original.exists():
 im=ImageOps.exif_transpose(Image.open(original)).convert('RGBA')
 if im.width<8 or im.height<8:raise ValueError('Image too small')
 x,y,w,h=([0,0,1,1] if generated else plan['region']);box=(round(x*im.width),round(y*im.height),round((x+w)*im.width),round((y+h)*im.height));crop=im.crop(box)
 a=np.array(crop).astype(float);light=np.max(a[:,:,:3],axis=2);mode='dark' if generated else plan['maskMode']
 alpha=a[:,:,3]/255
 if mode=='dark':alpha*=np.clip((light-9)/35,0,1)
 elif mode=='chroma':alpha*=np.clip((light-np.min(a[:,:,:3],axis=2)-20)/55,0,1)*np.clip((light-10)/35,0,1)
 elif mode=='light':alpha*=np.clip((248-np.min(a[:,:,:3],axis=2))/45,0,1)
 a[:,:,3]=alpha*255;crop=Image.fromarray(a.astype('uint8'))
 if plan['polygon'] and not generated:
  m=Image.new('L',crop.size);ImageDraw.Draw(m).polygon([((xx*im.width-box[0]),(yy*im.height-box[1])) for xx,yy in plan['polygon']],fill=255);a=np.array(crop);a[:,:,3]=(a[:,:,3].astype(float)*np.array(m)/255).astype('uint8');crop=Image.fromarray(a)
 bounds=crop.getbbox()
 if bounds:crop=crop.crop(bounds)
 crop=ImageOps.contain(crop,(640,960));source.alpha_composite(crop,((W-crop.width)//2,(H-crop.height)//2))
 if kind=='surface' and not source.getbbox():raise ValueError('Empty foreground; adjust region or mask')
elif kind=='surface':raise ValueError('Reference surface requires image')
source.save(p/'source.png')
bg=np.array(tuple(int(plan['background'][i:i+2],16) for i in [1,3,5]));accent=np.array(tuple(int(plan['accent'][i:i+2],16) for i in [1,3,5]));yy,xx=np.mgrid[0:H,0:W];halo=np.exp(-(((xx-W*.52)/(W*.5))**2+((yy-H*.56)/(H*.48))**2)*2)*.055
noise=np.random.default_rng(17).normal(0,.7,(H,W,1));pixels=np.clip(bg+halo[:,:,None]*accent+noise,0,255).astype('uint8');base=Image.fromarray(pixels);base.save(p/'base.png')
layers=[]
def add(id,type,name,x,y,w,h,**extra):
 l=dict(id=id,type=type,name=name,x=x,y=y,w=w,h=h,scale=1,rotation=0,opacity=1,visible=True,color='',motion=motion_default());l.update(extra);layers.append(l);return l
# An invisible source anchor preserves compatibility with old raster packages.
add('source-anchor','image','原始提取素材（备份）',0,0,1,1,sourceRect=[0,0,W,H])['visible']=False
add('subject','characterform','参考主体 · 字符浮雕' if kind=='surface' else {'flower':'花朵 · 三维花瓣结构','jellyfish':'水母 · 三维伞盖与触须','butterfly':'蝴蝶 · 三维翼面'}[kind],54,245,612,690,form=kind,formMotion='none',color=plan['accent'],sourceRect=[0,0,W,H],glyphStyle='code',glyphSize=1,glyphDensity=1)
pixel=lambda s:all(ord(c)<128 for c in s)
words=plan['title'].split();line1=plan['title'];line2=''
if len(plan['title'])>12 and len(words)>1:
 cut=max(1,len(words)//2);line1=' '.join(words[:cut]);line2=' '.join(words[cut:])
for i,line in enumerate([line1,line2]):
 if line:add('title-'+str(i+1),'title','主标题 '+str(i+1),50,75+i*108,620,120,text=line,font='pixel' if pixel(line) else 'sans',fontSize=103,color=plan['ink'],glyphStyle='code',glyphSize=1,glyphDensity=1)
sub=plan['subtitle'];fontSize=min(15,610*7/max(1,len(sub)*6))
add('subtitle','text','底部说明 · 可编辑',54,970,612,24,text=sub,font='pixel' if pixel(sub) else 'sans',fontSize=fontSize,color=plan['accent'],glyphStyle='code',glyphSize=1,glyphDensity=1)
top=plan['topline'];add('topline','text','顶部小字 · 可编辑',54,35,610,15,text=top,font='pixel' if pixel(top) else 'sans',fontSize=min(9,610*7/max(1,len(top)*6)),color=plan['accent'])
# Preview thumbnail is replaced by the actual canvas after rendering in the editor.
thumb=base.copy();cutout=ImageOps.contain(source,(500,650));thumb.paste(cutout,((720-cutout.width)//2,260),cutout);thumb.thumbnail((240,360));thumb.save(p/'thumbnail.png')
cfg=dict(format='character-studio-project',version=3,renderer='raster-poster',width=W,height=H,fps=30,loopSeconds=6,title=plan['title'],name=plan['name'],description=plan['styleNote'][:200],lower=plan['subtitle'][:200],inkColor=plan['ink'],glowColor=plan['accent'],intersection=plan['accent'],softInk=[100,180,150],base='base.png',source='source.png',thumbnail='thumbnail.png',layers=layers,copyId=p.name+'-'+hashlib.sha256(json.dumps(plan,sort_keys=True).encode()).hexdigest()[:16])
(p/'scene.json').write_text(json.dumps(cfg,ensure_ascii=False), encoding='utf-8')
