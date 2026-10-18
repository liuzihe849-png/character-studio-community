'use strict';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
const state={subject:'01-butterfly',style:'code',size:1,density:1,speed:1,glow:1,ink:'#fff9ee',glowColor:'#d5ad56',phase:0,playing:true,reverse:false};
let manifest,current,ready=false,loading=false,exporting=false,cancelled=false,loadSequence=0,lastTime=0,lastDraw=0,fpsTime=0,fpsFrames=0;
const makeCanvas=(w=720,h=960)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
const glyph=makeCanvas(),gx=glyph.getContext('2d'),intersection=makeCanvas(),ix=intersection.getContext('2d'),contact=makeCanvas(),cx=contact.getContext('2d');
const glowBuffer=makeCanvas(180,240),glowCtx=glowBuffer.getContext('2d'),contactBuffer=makeCanvas(180,240),contactCtx=contactBuffer.getContext('2d');
const glowData=glowCtx.createImageData(180,240),contactData=contactCtx.createImageData(180,240);
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const projectFps=()=>current?.definition.fps||25;
const isRaster=()=>current?.definition.renderer==='raster-poster';
const isLayered=()=>isRaster()||(isCRT()&&!!current.definition.screen.poster);
const isCRT=()=>current?.definition.renderer==='crt-screen';
const loopSeconds=()=>current?.definition.loopSeconds||manifest?.loopSeconds||6;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const image=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('素材未能载入：'+src));im.src=src});
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4200)}
function configuration(){const c={version:1,...state,phase:Number(state.phase.toFixed(6)),playing:false};if(!isLayered())delete c.layers;return c}
function persist(){try{localStorage.setItem('character-studio-fan-v1',JSON.stringify(configuration()))}catch{}window.ProjectSync?.changed()}
function sync(){
 window.FlowControls?.prepare();window.LayerEditor?.sync();const flatOnly=isRaster()&&!state.layers?.some(l=>['characterform','bottle3d','plant3d','relief','phosphor'].includes(l.type));for(const id of ['glyphControls','size','density','paletteControls'])$(id).hidden=flatOnly;$('size').parentElement.hidden=$('density').parentElement.hidden=flatOnly;
 const crt=isCRT();const poster=crt&&current.definition.screen.poster;$('posterControls').hidden=!poster;if(poster){$('headline1').value=state.posterHeadline[0];$('headline2').value=state.posterHeadline[1];$('posterTexture').value=state.posterTexture;$('posterTextureValue').textContent=state.posterTexture.toFixed(2)}$('crtControls').hidden=!crt;document.querySelector('[data-style="code"] b').textContent=crt?'▣ ▣ ▣':'┼ ═ ▪';document.querySelector('[data-style="code"] span').textContent=crt?'粗像素':'结构代码';
 $('density').previousElementSibling.firstChild.textContent=crt?'像素粗细 ':'字符密度 ';
 if(crt){$('caption1').value=state.captions[0];$('caption2').value=state.captions[1];for(const key of ['crtDelay','crtJump','crtScan']){$(key).value=state[key];$(key+'Value').textContent=Number(state[key]).toFixed(2)}}

 for(const id of ['size','density','speed','glow']){$(id).value=state[id];$(id+'Value').textContent=state[id].toFixed(2)+'×'}
 $('ink').value=state.ink;$('glowColor').value=state.glowColor;$('reverse').checked=state.reverse;$('phase').value=state.phase;
 document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.style===state.style));
 document.querySelectorAll('[data-subject]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.subject===state.subject));
 window.FlowControls?.sync();
 $('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'暂停动画':'播放动画');$('phaseText').textContent=(state.phase*loopSeconds()).toFixed(2)+' s';$('durationText').textContent='单轮 '+(loopSeconds()/state.speed).toFixed(2)+' s';
}
function finishSelection(definition){
 const projectUrl=new URL(location.href);projectUrl.searchParams.set("project",definition.id);history.replaceState(null,"",projectUrl);
 canvas.width=definition.width||720;canvas.height=definition.height||960;$('layerSelection').setAttribute('viewBox','0 0 '+canvas.width+' '+canvas.height);document.querySelector('.canvas-wrap').style.aspectRatio=canvas.width+'/'+canvas.height;$('specText').textContent=canvas.width+' × '+canvas.height+' · '+projectFps()+' fps';
 $('subjectTitle').replaceChildren(document.createTextNode(definition.title+' '));const sub=document.createElement('span');sub.textContent='/ '+definition.name;$('subjectTitle').append(sub);
 document.querySelector('.sidebar-note p').textContent=isRaster()?'保留确认稿的图形与字符质感；每层动画、位置和透明度分别调整。':current?.definition.screen?.poster?'机身点阵、大标题与屏幕字幕分层绘制；可调整文字、质感与动态。':isCRT()?'电视与环境保留原场景；字幕、字符样式和屏幕光效可独立调整。':'主体、原排版与字符交点保留；大小、密度、光色和速度可自由调整。';
 ready=true;loading=false;$('loading').hidden=true;$('status').textContent=isRaster()?'分层海报 · 选中元素调整独立动画':isCRT()?'电视字幕项目 · 修改文字即可实时预览':'实时重绘字符 · 排版与笔画交点保持独立';lastTime=performance.now();sync();draw(state.phase);persist();window.ProjectSync?.attach(definition.id);
}
async function selectSubject(id,{keepColors=false}={}){
 const definition=manifest.subjects.find(x=>x.id===id);if(!definition)throw Error('未知主体');
 if(id!==current?.definition.id&&!keepColors){Object.assign(state,{style:'code',size:1,density:1,speed:1,glow:1,reverse:false,phase:0});delete state.layers;delete state.selectedLayer;if(definition.initialSettings)Object.assign(state,validConfig(definition.initialSettings))}
 const seq=++loadSequence;loading=true;ready=false;$('loading').hidden=false;$('status').textContent='载入 '+definition.name+' 的运动场…';
 try{
  if(definition.renderer==='raster-poster'){
   const [base,source]=await Promise.all([image(definition.base),image(definition.source)]);if(seq!==loadSequence)return;const oldId=state.subject;current?.crt?.dispose();const raster=new RasterPoster(definition,base,source);current={definition,base,source,crt:raster};state.subject=id;if(!keepColors){state.ink=definition.inkColor;state.glowColor=definition.glowColor}if(!keepColors||oldId!==id||!state.layers){state.layers=structuredClone(definition.layers);state.selectedLayer=''}if(definition.initialSettings&&(!keepColors||oldId!==id))Object.assign(state,validConfig(definition.initialSettings));finishSelection(definition);return;
  }
  if(definition.renderer==='crt-screen'){
   const [base,mask]=await Promise.all([image(definition.base),image(definition.mask)]);if(seq!==loadSequence)return;
   const crt=new window.CRTScreen(definition,base,mask);current?.crt?.dispose();const oldId=state.subject;current={definition,base,mask,crt};state.subject=id;
   if(!keepColors){state.ink=definition.inkColor;state.glowColor=definition.glowColor}
   if(!keepColors||oldId!==id||!state.captions){state.captions=[...definition.screen.captions];state.crtDelay=0;state.crtJump=1;state.crtScan=definition.screen.scan}
   if(definition.screen.poster&&(!keepColors||oldId!==id||!state.posterHeadline)){state.posterHeadline=[...definition.screen.poster.headline];state.posterTexture=definition.screen.poster.texture}
   if(definition.screen.poster&&(!keepColors||oldId!==id||!state.layers)){state.layers=structuredClone(definition.screen.poster.layers||PosterLayers.defaults(definition,state));state.selectedLayer=''}
   finishSelection(definition);return;
  }
  const [base,mask,atlas]=await Promise.all([image(definition.base),image(definition.mask),image(definition.atlas)]);if(seq!==loadSequence)return;
  const tmp=makeCanvas(atlas.width,atlas.height),tc=tmp.getContext('2d',{willReadFrequently:true});tc.drawImage(atlas,0,0);const raw=tc.getImageData(0,0,tmp.width,tmp.height).data;
  const w=definition.tileWidth||manifest.tileWidth,h=definition.tileHeight||manifest.tileHeight,count=definition.frames||manifest.frames,frames=[];
  for(let n=0;n<count;n++){const data=new Uint8Array(w*h*3),ox=(n%(definition.columns||manifest.columns))*w,oy=Math.floor(n/(definition.columns||manifest.columns))*h;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const s=((oy+y)*tmp.width+ox+x)*4,d=(y*w+x)*3;data[d]=raw[s];data[d+1]=raw[s+1];data[d+2]=raw[s+2]}frames.push(data)}
  const maskCanvas=makeCanvas(),mx=maskCanvas.getContext('2d',{willReadFrequently:true});mx.drawImage(mask,0,0,720,960);const pixels=mx.getImageData(0,0,720,960);
  for(let k=0;k<pixels.data.length;k+=4){const alpha=pixels.data[k];pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=255;pixels.data[k+3]=alpha}mx.putImageData(pixels,0,0);
  const restore=makeCanvas(),rx=restore.getContext('2d');rx.drawImage(base,0,0,720,960);rx.globalCompositeOperation='destination-in';rx.drawImage(maskCanvas,0,0);
  current?.crt?.dispose();current={definition,base,mask:maskCanvas,restore,frames};delete state.layers;delete state.selectedLayer;state.subject=id;
  if(!keepColors){state.ink=definition.inkColor;state.glowColor=definition.glowColor}
  finishSelection(definition);
 }catch(e){if(seq===loadSequence){loading=false;$('loading').textContent='载入失败，请使用启动器打开';$('status').textContent=e.message;toast(e.message)}throw e}
}
function draw(phase,target=ctx,scale=1){
 if(!ready)return;phase=((phase%1)+1)%1;if(isCRT()||isRaster()){current.crt.render(phase,state,target,scale);if(target===ctx)window.LayerEditor?.overlay();return}const count=current.frames.length,pos=phase*count,i0=Math.floor(pos)%count,i1=(i0+1)%count,mix=pos-Math.floor(pos),a=current.frames[i0],b=current.frames[i1];
 const gc=rgb(state.glowColor),si=current.definition.softInk,gd=glowData.data,cd=contactData.data;
 for(let i=0,k=0;i<a.length;i+=3,k+=4){const soft=(a[i+1]*(1-mix)+b[i+1]*mix)/255;
  gd[k]=gc[0];gd[k+1]=gc[1];gd[k+2]=gc[2];gd[k+3]=Math.round(clamp(soft*.44*state.glow,0,1)*255);
  cd[k]=si[0];cd[k+1]=si[1];cd[k+2]=si[2];cd[k+3]=Math.round(clamp(soft*.32*state.glow,0,1)*255)}
 glowCtx.putImageData(glowData,0,0);contactCtx.putImageData(contactData,0,0);
 gx.clearRect(0,0,720,960);gx.fillStyle=state.ink;gx.strokeStyle=state.ink;
 const textMode=state.style==='ascii'||state.style==='digits',spacing=state.size/Math.sqrt(state.density),cellX=(textMode?8.8:6.1)*spacing,cellY=(textMode?10:5.5)*spacing;
 const nx=Math.round(720/cellX),ny=Math.round(960/cellY),fw=manifest.tileWidth,fh=manifest.tileHeight;
 gx.font=(10.2*spacing)+'px ui-monospace, Menlo, Consolas, monospace';gx.textAlign='center';gx.textBaseline='middle';
 for(let row=0;row<ny;row++)for(let col=0;col<nx;col++){
  const x=(col+.5)*720/nx,y=(row+.5)*960/ny,s=(Math.min(fh-1,Math.floor(y/960*fh))*fw+Math.min(fw-1,Math.floor(x/720*fw)))*3;
  const den=(a[s]*(1-mix)+b[s]*mix)/255,edge=(a[s+2]*(1-mix)+b[s+2]*mix)/255;if(den<.045)continue;
  let opacity=Math.pow(clamp((den-.04)/.72,0,1),1.05);if((row+col)%3!==0)opacity*=clamp((den-.12)/.36,0,1);opacity=clamp(opacity*Math.pow(state.density,.32),0,1);if(opacity<.015)continue;
  gx.globalAlpha=opacity;const seed=((col*73856093)^(row*19349663))>>>0,k=seed%19,unit=state.size;
  if(state.style==='dots'){gx.beginPath();gx.arc(x,y,(.65+1.35*den)*unit,0,Math.PI*2);gx.fill()}
  else if(state.style==='lines'){const w=(1.8+7.3*den)*unit;gx.fillRect(x-w/2,y-.70*unit,w,1.4*unit)}
  else if(textMode){const chars=state.style==='digits'?'01010110':'.:-=+*#%@';const index=state.style==='digits'?seed%chars.length:Math.min(chars.length-1,Math.floor(den*chars.length));gx.fillText(chars[index],x,y)}
  else {const h=(1.3+2.5*den)*unit;gx.fillRect(x-.75*unit,y-h/2,1.5*unit,h);if(k%13===0)gx.fillRect(x-1.3*unit,y-.65*unit,2.6*unit,1.3*unit);
   if(edge>.15&&(row*7+col*13)%5<2){gx.globalAlpha=clamp((edge-.08)/.65,0,1);const w=(6+10*edge)*unit;gx.fillRect(x-w/2,y-.9*unit,w,1.8*unit);if(k%3===0){gx.lineWidth=unit;gx.strokeRect(x-2.4*unit,y-1.5*unit,4.8*unit,3*unit)}}}
 }
 gx.globalAlpha=1;
 // Restore original native type beneath the weak light contact, then recolour
 // only the glyph/type intersection. Counters and drafting are not in the mask.
 target.save();target.setTransform(scale,0,0,scale,0,0);target.globalAlpha=1;target.globalCompositeOperation='source-over';target.drawImage(current.base,0,0,720,960);
 target.globalCompositeOperation='screen';target.drawImage(glowBuffer,0,0,720,960);target.globalCompositeOperation='source-over';target.drawImage(current.restore,0,0);
 cx.clearRect(0,0,720,960);cx.globalCompositeOperation='source-over';cx.drawImage(contactBuffer,0,0,720,960);cx.globalCompositeOperation='destination-in';cx.drawImage(current.mask,0,0);cx.globalCompositeOperation='source-over';target.drawImage(contact,0,0);
 target.drawImage(glyph,0,0);ix.clearRect(0,0,720,960);ix.globalCompositeOperation='source-over';ix.drawImage(glyph,0,0);ix.globalCompositeOperation='destination-in';ix.drawImage(current.mask,0,0);ix.globalCompositeOperation='source-in';ix.fillStyle=current.definition.intersection;ix.fillRect(0,0,720,960);ix.globalCompositeOperation='source-over';target.drawImage(intersection,0,0);target.restore();
}
function tick(time){if(!lastTime)lastTime=time;const dt=Math.min((time-lastTime)/1000,.1);lastTime=time;
 if(ready&&!exporting&&state.playing){state.phase=(state.phase+(state.reverse?-1:1)*dt*state.speed/loopSeconds()+1)%1;if(time-lastDraw>31){draw(state.phase);$('phase').value=state.phase;$('phaseText').textContent=(state.phase*loopSeconds()).toFixed(2)+' s';lastDraw=time;fpsFrames++}}
 if(time-fpsTime>1000){$('fps').textContent=state.playing&&ready?Math.round(fpsFrames*1000/(time-fpsTime))+' FPS':'已暂停';fpsFrames=0;fpsTime=time}requestAnimationFrame(tick)
}
function toggle(){if(exporting)return;state.playing=!state.playing;sync();persist()}
function refresh(){sync();if(ready&&!exporting)draw(state.phase);persist()}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function validConfig(raw){if(!raw||raw.version!==1)throw Error('不支持的参数文件');const clean={};if(raw.subject&&!manifest.subjects.some(s=>s.id===raw.subject))throw Error('请先导入此参数对应的海报项目包');if(raw.subject)clean.subject=raw.subject;if(['code','ascii','dots','lines','digits'].includes(raw.style))clean.style=raw.style;
 for(const [key,min,max] of [['size',.65,1.9],['density',.45,1.8],['speed',.25,3],['glow',0,2],['phase',0,1]])if(Number.isFinite(raw[key]))clean[key]=clamp(raw[key],min,max);
 for(const key of ['ink','glowColor'])if(/^#[0-9a-f]{6}$/i.test(raw[key]))clean[key]=raw[key];if(typeof raw.reverse==='boolean')clean.reverse=raw.reverse;
 if(raw.captions!==undefined){if(!Array.isArray(raw.captions)||raw.captions.length!==2||raw.captions.some(t=>typeof t!=='string'||t.length>48||!/^[A-Z0-9 .,!?':;\-]*$/.test(t)))throw Error('字幕格式不正确');clean.captions=raw.captions}
 if(raw.layers!==undefined)clean.layers=PosterLayers.validate(raw.layers,manifest.subjects.find(s=>s.id===(raw.subject||state.subject))?.renderer==='raster-poster');if(typeof raw.selectedLayer==='string')clean.selectedLayer=raw.selectedLayer;
 if(Array.isArray(raw.posterHeadline)&&raw.posterHeadline.length===2&&raw.posterHeadline.every(x=>typeof x==='string'&&/^[A-Z0-9 !?.'-]{1,16}$/.test(x)))clean.posterHeadline=raw.posterHeadline;
 for(const [k,lo,hi]of [['posterTexture',0,1],['crtDelay',0,1.5],['crtJump',0,2],['crtScan',0,.45]])if(Number.isFinite(raw[k]))clean[k]=clamp(raw[k],lo,hi);return clean}
async function exportVideo(){
 if(!ready||exporting||window.fanExportPreparing)return;
 window.fanExportPreparing=true;
 try{while(ProjectSync.sending)await new Promise(r=>setTimeout(r,30));await ProjectSync.save();if(ProjectSync.dirty||ProjectSync.conflict){toast('请先完成当前作品保存或处理版本冲突，再导出');return}}
 catch(e){toast('导出前保存失败：'+e.message);return}
 finally{window.fanExportPreparing=false}
 if(location.protocol==='file:'){toast('导出 MP4 请先双击“启动编辑器.command”，使用本地服务打开。');return}
 const wasPlaying=state.playing,startPhase=state.phase,settings=configuration(),fps=projectFps(),frames=Math.round(loopSeconds()*fps/state.speed);exporting=true;cancelled=false;state.playing=false;$('controls').disabled=true;$('phase').disabled=true;$('reverse').disabled=true;document.querySelectorAll('.actions button,#creationStage button,#creationStage input,#creationStage select').forEach(b=>b.disabled=true);$('exportProgress').hidden=false;sync();let id;
 try{const resp=await fetch('api/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({frames,fps,subject:state.subject,settings})});const job=await resp.json();if(!resp.ok)throw Error(job.error||'导出服务未启动');id=job.id;
  for(let n=0;n<frames;n++){if(cancelled)throw Error('已取消导出');const phase=(startPhase+(state.reverse?-1:1)*n/frames+1)%1;draw(phase);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   const sent=await fetch('api/frame?id='+id+'&n='+n,{method:'POST',body:blob});if(!sent.ok)throw Error('视频帧保存失败');$('progress').value=(n+1)/frames*90;$('exportLabel').textContent='绘制视频帧 '+(n+1)+' / '+frames;if(n%3===0)await new Promise(requestAnimationFrame)}
  if(cancelled)throw Error('已取消导出');$('exportLabel').textContent='正在编码 MP4…';const response=await fetch('api/finish?id='+id,{method:'POST'});const result=await response.json();if(!response.ok)throw Error(result.error||'编码失败');if(cancelled)throw Error('已取消下载，已编码文件保存在 exports 文件夹');$('progress').value=100;
  const anchor=document.createElement('a');anchor.href=result.url;anchor.download=result.name;anchor.click();$('status').textContent='已导出 '+result.duration.toFixed(2)+' 秒 MP4，保存在 exports 文件夹';toast('MP4 已导出 · '+result.duration.toFixed(2)+' 秒 · '+fps+' fps');
 }catch(e){toast(e.message);if(id)fetch('api/cancel?id='+id,{method:'POST'}).catch(()=>{})}
 finally{exporting=false;state.phase=startPhase;state.playing=wasPlaying;$('controls').disabled=false;$('phase').disabled=false;$('reverse').disabled=false;document.querySelectorAll('.actions button,#creationStage button,#creationStage input,#creationStage select').forEach(b=>b.disabled=false);$('exportProgress').hidden=true;lastTime=performance.now();sync();draw(state.phase)}
}
function renderSubjects(){
 $('subjects').replaceChildren();
 for(const s of manifest.subjects){const b=document.createElement('button');b.className='subject';b.dataset.subject=s.id;b.setAttribute('aria-pressed',String(s.id===state.subject));
  const im=document.createElement('img');im.alt='';im.src=s.thumbnail;const label=document.createElement('span'),title=document.createElement('strong'),desc=document.createElement('small'),tick=document.createElement('span');
  title.textContent=s.name+' / '+s.title;desc.textContent=(s.imported?'已导入 · ':'')+s.description;label.append(title,desc);tick.className='tick';tick.textContent='✓';b.append(im,label,tick);
  b.addEventListener('click',()=>{if(exporting||$('controls').disabled)return;state.phase=0;selectSubject(s.id).catch(console.error)});$('subjects').append(b)
 }
}
async function boot(){
 LayerEditor.init();ProjectSync.init();
 try{manifest=await (await fetch('assets/manifest.json')).json();
  const catalog=await (await fetch('api/projects')).json();manifest.subjects.push(...catalog.projects);renderSubjects();
  $('importProject').addEventListener('click',()=>$('projectFile').click());
  $('projectFile').addEventListener('change',async event=>{
   const files=Array.from(event.target.files);if(!files.length)return;
   try{await AgentPanel.flush()}catch(e){toast('打开前保存失败：'+e.message);event.target.value='';return}
   document.querySelectorAll('.actions button,#creationStage button,#creationStage input,#creationStage select').forEach(b=>b.disabled=true);$('controls').disabled=true;state.playing=false;let imported=0;
   try{for(const file of files){$('status').textContent='正在导入 '+file.name+'…';if(file.size>64000000)throw Error('项目包超过 64MB');
    const resp=await fetch('api/projects/import',{method:'POST',headers:{'Content-Type':'application/zip'},body:file});const result=await resp.json();if(!resp.ok)throw Error(result.error||'导入失败');
    if(!manifest.subjects.some(s=>s.id===result.project.id))manifest.subjects.push(result.project);renderSubjects();state.phase=0;await selectSubject(result.project.id);imported++;
   }toast('已导入 '+imported+' 个海报项目，可切换字符与运动参数');$('status').textContent='已导入 '+imported+' 个项目 · 素材保存在本机 projects 文件夹';
   }catch(e){toast('导入失败：'+e.message);$('status').textContent='已导入 '+imported+' 个；'+e.message}
   finally{event.target.value='';$('controls').disabled=false;document.querySelectorAll('.actions button,#creationStage button,#creationStage input,#creationStage select').forEach(b=>b.disabled=false);sync()}
  });
  try{const saved=JSON.parse(localStorage.getItem('character-studio-fan-v1'));if(saved)Object.assign(state,validConfig(saved))}catch{}
  document.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{if(window.FlowControls)FlowControls.change('style',b.dataset.style);else{state.style=b.dataset.style;refresh()}}));
  for(const key of ['size','density','speed','glow'])$(key).addEventListener('input',()=>{if(['size','density'].includes(key)&&window.FlowControls)FlowControls.change(key,Number($(key).value));else{state[key]=Number($(key).value);refresh()}});
  for(const key of ['ink','glowColor'])$(key).addEventListener('input',()=>{state[key]=$(key).value;refresh()});
  $('play').addEventListener('click',toggle);$('reverse').addEventListener('change',()=>{state.reverse=$('reverse').checked;refresh()});$('phase').addEventListener('input',()=>{state.phase=Number($('phase').value);state.playing=false;$('phaseText').textContent=(state.phase*loopSeconds()).toFixed(2)+' s';refresh()});
  for(const key of ['caption1','caption2'])$(key).addEventListener('input',()=>{
   const index=key==='caption1'?0:1,value=$(key).value.toUpperCase();if(value.length>48||!/^[A-Z0-9 .,!?':;\-]*$/.test(value)){toast('像素字库支持英文、数字和常用标点');$(key).value=state.captions[index];return}state.captions[index]=value;if(state.layers){const l=state.layers.find(l=>l.id==='caption-'+(index+1));if(l)l.text=value}refresh()
  });
  for(const key of ['headline1','headline2'])$(key).addEventListener('input',()=>{const i=key==='headline1'?0:1,t=$(key).value.toUpperCase();if(!/^[A-Z0-9 !?.'-]{1,16}$/.test(t)){toast('标题支持1至16位英文、数字和标点');return}state.posterHeadline[i]=t;if(state.layers){const l=state.layers.find(l=>l.id==='headline-'+(i+1));if(l)l.text=t}refresh()});
  $('posterTexture').addEventListener('input',()=>{state.posterTexture=Number($('posterTexture').value);refresh()});
  for(const key of ['crtDelay','crtJump','crtScan'])$(key).addEventListener('input',()=>{if(['size','density'].includes(key)&&window.FlowControls)FlowControls.change(key,Number($(key).value));else{state[key]=Number($(key).value);refresh()}});
  $('reset').addEventListener('click',()=>{Object.assign(state,{style:'code',size:1,density:1,speed:1,glow:1,phase:0,reverse:false,ink:current.definition.inkColor,glowColor:current.definition.glowColor});if(isCRT())Object.assign(state,{captions:[...current.definition.screen.captions],crtDelay:0,crtJump:1,crtScan:current.definition.screen.scan});if(isRaster())Object.assign(state,{layers:structuredClone(current.definition.layers),selectedLayer:''});if(current.definition.screen?.poster)Object.assign(state,{posterHeadline:[...current.definition.screen.poster.headline],posterTexture:current.definition.screen.poster.texture,layers:structuredClone(current.definition.screen.poster.layers||PosterLayers.defaults(current.definition,{captions:current.definition.screen.captions,posterHeadline:current.definition.screen.poster.headline})),selectedLayer:''});refresh()});
  $('saveConfig').addEventListener('click',()=>download(new Blob([JSON.stringify(configuration(),null,2)],{type:'application/json'}),state.subject+'-settings.json'));
  $('loadConfig').addEventListener('click',()=>$('configFile').click());$('configFile').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{const cfg=validConfig(JSON.parse(await file.text()));Object.assign(state,cfg,{playing:false});await selectSubject(state.subject,{keepColors:true});refresh();toast('参数已载入')}catch(e){toast('载入失败：'+e.message)}finally{event.target.value=''}});
  $('exportPng').addEventListener('click',()=>{if(!ready)return;const factor=(isCRT()||isRaster())?1.5:2,c=makeCanvas(canvas.width*factor,canvas.height*factor);draw(state.phase,c.getContext('2d'),factor);c.toBlob(blob=>{download(blob,state.subject+'-'+state.style+'.png');toast('已导出 '+c.width+' × '+c.height+' PNG')})});
  $('exportVideo').addEventListener('click',exportVideo);$('cancelExport').addEventListener('click',()=>{cancelled=true;$('exportLabel').textContent='正在取消…'});
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','BUTTON','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();toggle()}});
  const requested=new URLSearchParams(location.search).get('project');let preserveSaved=!!localStorage.getItem('character-studio-fan-v1');
  if(requested&&manifest.subjects.some(s=>s.id===requested)){state.playing=true;preserveSaved=preserveSaved&&state.subject===requested;state.subject=requested;if(!preserveSaved){Object.assign(state,{phase:.5,playing:true,style:'code',size:1,density:1,speed:1,glow:1});delete state.captions}}
  if(manifest.subjects.length){if(!manifest.subjects.some(s=>s.id===state.subject))state.subject=manifest.subjects[0].id;await selectSubject(state.subject,{keepColors:preserveSaved});const initialPhase=new URLSearchParams(location.search).get('phase');if(initialPhase!==null&&Number.isFinite(Number(initialPhase))&&Number(initialPhase)>=0&&Number(initialPhase)<=1){state.phase=Number(initialPhase);draw(state.phase)}sync()}else{$('loading').textContent='等待作品：在对话中发送参考与要求，生成后会自动打开。也可导入已有项目包。';$('status').textContent='暂无项目'}requestAnimationFrame(tick);
  window.characterStudio={state,configuration,selectSubject,render:()=>draw(state.phase),get ready(){return ready},exportVideo};
 }catch(e){console.error(e);$('status').textContent='启动失败：'+e.message;toast('请使用本地启动器打开编辑器。')}
}
boot();
