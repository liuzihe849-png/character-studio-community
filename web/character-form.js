'use strict';
// Reference depth is a 2.5D relief; native forms are analytic 3D surfaces, never inferred hidden geometry.
window.CharacterForm=class{
 constructor(source,rect,form){this.form=form;this.c=document.createElement('canvas');this.c.width=600;this.c.height=720;this.raw=this.c.cloneNode();this.a=this.raw.getContext('2d');this.ctx=this.c.getContext('2d');this.cache=new Map();this.samples=[];
  if(form==='surface'){const s=document.createElement('canvas');s.width=180;s.height=240;const x=s.getContext('2d',{willReadFrequently:true});x.drawImage(source,...rect,0,0,180,240);const d=x.getImageData(0,0,180,240).data;for(let y=0;y<240;y++)for(let u=0;u<180;u++){const i=(y*180+u)*4,alpha=d[i+3]/255;if(alpha<.09)continue;const lum=(d[i]*.22+d[i+1]*.65+d[i+2]*.13)/255;this.samples.push({x:(u-90)/80,y:(y-120)/88,z:lum*.25,lum:Math.max(.18,lum),alpha,seed:LayerMotion.hash(u+y*181)})}}
 }
 points(t,mode){const p=t/6*Math.PI*2,move=mode!=='none',out=[],push=(x,y,z,lum,seed)=>out.push({x,y,z,lum,alpha:1,seed});
  if(this.form==='surface')return this.samples;
  if(this.form==='butterfly'){
   const flap=mode==='flap'?Math.sin(p*2)*1.12:.35;
   for(let side of [-1,1])for(let ring of [0,1])for(let u=.025;u<1;u+=.025)for(let v=-1;v<=1;v+=.055){const width=Math.pow(Math.sin(Math.PI*u),.68)*(ring?.56:.82),xx=.07+u*(ring?.90:1.08),yy=(ring?.28:-.50)+(ring?.65:.86)*v*width+(ring?.24:-.20)*u,zz=Math.sin(u*Math.PI)*.09+v*v*.04;const x=side*(xx*Math.cos(flap)-zz*Math.sin(flap)),z=xx*Math.sin(flap)+zz*Math.cos(flap);push(x,yy,z,.28+.6*Math.abs(Math.cos(v*12+u*7))+.15*Math.pow(Math.abs(v),4),LayerMotion.hash(u*971+v*31+ring*7))}
   for(let y=-.53;y<.64;y+=.016)for(let v=0;v<6.28;v+=.5)push(.045*Math.cos(v),y,.045*Math.sin(v)+.1,.8,y);
   for(let side of [-1,1])for(let u=0;u<1;u+=.02)push(side*(.02+u*.14),-.48-u*.27,.07,.9,u);
  }else if(this.form==='jellyfish'){
   const contraction=mode==='swim'?.86+.14*Math.cos(p):1;
   for(let u=.025;u<1;u+=.025)for(let a=0;a<6.283;a+=.065){const theta=u*Math.PI*.53,r=Math.sin(theta)*.85*contraction,z=Math.cos(a)*r,x=Math.sin(a)*r,y=-.55-Math.cos(theta)*.55;push(x,y,z,.22+.6*Math.pow(Math.max(0,Math.cos(a-.6)),2)+.14*Math.cos(u*25),u+a)}
   for(let k=0;k<20;k++)for(let u=0;u<1;u+=.01){const a=k/20*Math.PI*2,r=.12+(k%5)*.12,x=Math.sin(a)*r+Math.sin(u*9+k+(move?p:0))*.06*u,y=-.45+u*(1.6+(k%3)*.12),z=Math.cos(a)*r+Math.cos(u*7+k+(move?p:0))*.06;push(x,y,z,.38+.25*Math.sin(k),u+k)}
  }else{
   const open=mode==='grow'?.18+.82*(.5-.5*Math.cos(p)):.92;
   for(let ring=0;ring<3;ring++)for(let k=0;k<8-ring;k++)for(let u=.025;u<1;u+=.025)for(let v=-1;v<=1;v+=.08){const a=k/(8-ring)*Math.PI*2+ring*.4,len=1-ring*.23,r=(.06+u*len)*open,w=Math.pow(Math.sin(u*Math.PI),.6)*.30*len*v,x=Math.sin(a)*r+Math.cos(a)*w,y=-.22+Math.cos(a)*r-Math.sin(a)*w,z=.12*ring+.30*u*u+(1-open)*u*.8-.15*v*v;push(x,y,z,.30+.45*(1-v*v)+.2*u,u+k*8+ring)}
   for(let u=0;u<1;u+=.012)push(.06*Math.sin(u*2),.1+u*1.3,-.2,.55,u);
   for(let side of [-1,1])for(let u=.03;u<1;u+=.03)for(let v=-1;v<=1;v+=.12)push(side*(u*.62),.82-u*.25+Math.sin(u*Math.PI)*.18*v,-.18+u*.10,.45+.35*(1-v*v),u+v);
  }
  return out;
 }
 glyph(style,level,w,h,ink){const key=[style,level,w,h,ink].join('|');if(this.cache.has(key))return this.cache.get(key);const c=document.createElement('canvas');c.width=Math.ceil(w+3);c.height=Math.ceil(h+3);const a=c.getContext('2d');a.fillStyle=ink;a.globalAlpha=.18+.82*level/15;if(style==='dots'){a.beginPath();a.arc(w/2,h/2,Math.max(.7,w*.32),0,Math.PI*2);a.fill()}else if(style==='lines')a.fillRect(0,h*.4,w*.85,Math.max(1,h*.16));else if(style==='ascii'||style==='digits'){a.font=h+'px monospace';a.textBaseline='top';a.fillText(style==='digits'?String(level%2):' .:+*#@'[Math.min(6,Math.floor(level/2.5))],0,0)}else{a.fillRect(w*.22,0,Math.max(1,w*.52),h*.75);if(level>9)a.fillRect(0,h*.3,w,h*.12)}this.cache.set(key,c);if(this.cache.size>700)this.cache.delete(this.cache.keys().next().value);return c}
 render(time,state,mode){const p=time/6*Math.PI*2,still=mode==='none',yaw=still?.09:Math.sin(p)*.24,pitch=still?0:Math.sin(p)*.06,cy=Math.cos(yaw),sy=Math.sin(yaw),a=this.a;a.clearRect(0,0,600,720);const step=Math.max(3,5*state.size/Math.sqrt(state.density)),depth=new Map(),fade=mode==='dissolve'?Math.max(0,Math.sin(Math.PI*(time/6%1))):0;
  for(const point of this.points(time,mode)){const q=point,seed=LayerMotion.hash(q.seed*999);if(seed>Math.min(1,state.density))continue;if(mode==='dissolve'&&fade>seed)continue;let x=q.x,y=q.y,z=q.z;if(mode==='ripple')z+=Math.sin(y*7+p)*.10;if(mode==='dissolve'){y-=fade*fade*(.8+seed);x+=Math.sin(seed*53+p)*fade*.18}const rx=x*cy+z*sy,rz=z*cy-x*sy,yy=y*Math.cos(pitch)-rz*Math.sin(pitch),persp=1+rz*.10,px=300+rx*205*persp,py=350+yy*205*persp+(still?0:Math.sin(p)*8);const ix=Math.round(px/step),iy=Math.round(py/step),key=ix+':'+iy,light=Math.min(1,q.lum*(.80+.20*persp)+.13*Math.max(0,rz));if(!depth.has(key)||depth.get(key).z<rz)depth.set(key,{x:ix*step,y:iy*step,z:rz,light,alpha:q.alpha})}
  for(const q of depth.values()){a.globalAlpha=q.alpha;const sprite=this.glyph(state.style,Math.max(1,Math.min(15,Math.round(q.light*15))),step*.8,step*1.35,state.ink);a.drawImage(sprite,q.x,q.y)}a.globalAlpha=1;this.ctx.clearRect(0,0,600,720);if(state.glow>0){this.ctx.globalAlpha=.30*state.glow;this.ctx.filter='blur(5px)';this.ctx.drawImage(this.raw,0,0)}this.ctx.filter='none';this.ctx.globalAlpha=1;this.ctx.drawImage(this.raw,0,0);return this.c}
 dispose(){this.cache.clear()}
};
