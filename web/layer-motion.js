'use strict';
// Deterministic six-second loops: the same phase renders the same preview/export frame.
window.LayerMotion={
 types:['none','wave','voltage','pulse','float','scan','rise','typing'],
 defaults(){return {type:'none',bpm:120,amount:.5,detail:4,duty:.3,phase:0}},
 validate(raw){if(!raw||typeof raw!=='object'||!this.types.includes(raw.type))throw Error('图层动画类型不正确');const v={type:raw.type};for(const[k,lo,hi]of [['bpm',10,240],['amount',0,1],['detail',1,12],['duty',.05,.8],['phase',0,1]]){if(typeof raw[k]!=='number'||!Number.isFinite(raw[k])||raw[k]<lo||raw[k]>hi)throw Error('图层动画参数不正确：'+k);v[k]=raw[k]}if(v.bpm%10!==0)throw Error('循环节奏使用10 BPM步进');return v},
 seed(id){let n=0;for(const ch of id)n=(n*31+ch.charCodeAt(0))>>>0;return n%8191},
 hash(x){const v=Math.sin(x*127.1+311.7)*43758.5453;return v-Math.floor(v)},
 sample(l,time){
  const a=l.motion||this.defaults(),amount=a.amount;if(a.type==='none'||amount===0)return {type:'none',amount:0,dx:0,dy:0,opacity:1,active:false,clip:1};
  const cycles=a.bpm/10,clock=((time/6*cycles+a.phase)%cycles+cycles)%cycles,beat=Math.floor(clock),p=clock-beat,seed=this.seed(l.id),frame=Math.floor(p*32),active=a.type==='voltage'&&p<a.duty&&this.hash(seed+beat*7)>.18;
  let opacity=1,dx=0,dy=0,clip=1,rotation=0;
  if(a.type==='pulse')opacity=1-amount*.7*(.5-.5*Math.cos(p*Math.PI*2));
  if(a.type==='float'){dy=Math.sin(p*Math.PI*2)*amount*14;dx=Math.sin(p*Math.PI*2+.4)*amount*3;rotation=Math.sin(p*Math.PI*2+.7)*amount*.9}
  if(a.type==='scan')clip=1-amount*(.5-.5*Math.cos(p*Math.PI*2));
  if(active){const noise=this.hash(seed+beat*17+frame*3);opacity=1-amount*(noise>.62?.8:.22);dx=(this.hash(seed+frame+beat*13)-.5)*amount*9;dy=(this.hash(seed+frame*2+beat*5)-.5)*amount*2}
  return {type:a.type,amount,detail:a.detail,duty:a.duty,p,beat,seed,frame,active,dx,dy,rotation,opacity,clip};
 },
 image(ctx,image,x,y,sample){
  if(!sample.active){ctx.drawImage(image,x,y);return}
  const n=Math.round(sample.detail*2)+4,h=image.height/n,alpha=ctx.globalAlpha;
  // Quiet intact bands alternate with short, deterministic horizontal tears.
  for(let i=0;i<n;i++){const r=this.hash(sample.seed+sample.beat*23+sample.frame*7+i*11),shift=r>.67?(r-.5)*sample.amount*36:0;const sy=i*h,sh=Math.min(h,image.height-sy);ctx.filter=shift?'brightness(1.35)':'none';ctx.drawImage(image,0,sy,image.width,sh,x+shift,y+sy,image.width,sh)}ctx.filter='none';
  ctx.globalAlpha=alpha*sample.amount*.12;ctx.drawImage(image,x-sample.amount*9,y);ctx.globalAlpha=alpha;
 },
 rowShift(sample,row){return sample.active&&this.hash(sample.seed+sample.frame*7+row*13)>.66?(this.hash(sample.seed+row+sample.frame)-.5)*sample.amount*24:0}
};
