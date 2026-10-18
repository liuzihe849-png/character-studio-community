'use strict';
// Typed local renderer: package data controls text/geometry; packages contain no executable code.
window.CRTGlyphs={A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',G:'01111/10000/10000/10111/10001/10001/01111',H:'10001/10001/10001/11111/10001/10001/10001',I:'11111/00100/00100/00100/00100/00100/11111',J:'00111/00010/00010/00010/10010/10010/01100',K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/10101/10011/10001/10001/10001',O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',W:'10001/10001/10001/10101/10101/10101/01010',X:'10001/10001/01010/00100/01010/10001/10001',Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111','0':'01110/10001/10011/10101/11001/10001/01110','1':'00100/01100/00100/00100/00100/00100/01110','2':'01110/10001/00001/00010/00100/01000/11111','3':'11110/00001/00001/01110/00001/00001/11110','4':'00010/00110/01010/10010/11111/00010/00010','5':'11111/10000/10000/11110/00001/00001/11110','6':'01110/10000/10000/11110/10001/10001/01110','7':'11111/00001/00010/00100/01000/01000/01000','8':'01110/10001/10001/01110/10001/10001/01110','9':'01110/10001/10001/01111/00001/00001/01110','?':'01110/10001/00001/00010/00100/00000/00100',',':'00000/00000/00000/00000/00100/00100/01000','.':'00000/00000/00000/00000/00000/00100/00100','!':'00100/00100/00100/00100/00100/00000/00100',':':'00000/00100/00100/00000/00100/00100/00000',';':'00000/00100/00100/00000/00100/00100/01000',"'":'00100/00100/00000/00000/00000/00000/00000','-':'00000/00000/00000/11111/00000/00000/00000',' ':'00000/00000/00000/00000/00000/00000/00000'};
window.CRTScreen=class {
 constructor(definition,base,mask){
  this.d=definition;this.c=document.createElement('canvas');this.c.width=definition.width;this.c.height=definition.height;
  this.gl=this.c.getContext('webgl',{preserveDrawingBuffer:true,alpha:false,antialias:false});if(!this.gl)throw Error('此浏览器未启用 WebGL，无法编辑屏幕项目');const gl=this.gl;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const vs=shader(gl.VERTEX_SHADER,'attribute vec2 a;varying vec2 uv;void main(){uv=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}');
  const fs=shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D scene,mask,core,glow;uniform mat3 inv;uniform vec2 size;uniform vec3 ink,lightColor;uniform float gain,time,barrel,scan,posterMode,textureStrength,captionColorMode;uniform vec4 subjectBounds;
  vec3 linear(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
  vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
  float bayer2(vec2 p){p=mod(p,2.);return mod(2.*p.x+3.*p.y,4.);}
  float hash(vec2 p){return (4.*bayer2(p)+bayer2(floor(p/2.))+.5)/16.;}
  vec3 posterScene(vec2 uv){
   vec2 px=uv*size;float cell=2.6;vec2 grid=floor(px/cell);vec2 center=(grid+.5)*cell/size;
   vec3 src=texture2D(scene,center).rgb;float l=dot(src,vec3(.2126,.7152,.0722));
   float taper=clamp((px.y-subjectBounds.y)/(subjectBounds.w-subjectBounds.y),0.,1.);float object=step(subjectBounds.x+8.*taper,px.x)*step(px.x,subjectBounds.z-10.*taper)*step(subjectBounds.y,px.y)*step(px.y,subjectBounds.w);
   float screenMask=texture2D(mask,center).r;
   float edge=abs(l-dot(texture2D(scene,center+vec2(2./size.x,0.)).rgb,vec3(.2126,.7152,.0722)))+abs(l-dot(texture2D(scene,center+vec2(0.,2./size.y)).rgb,vec3(.2126,.7152,.0722)));
   float tone=clamp(pow(l,.55)*1.45+edge*2.2,0.,1.);tone*=object;
   float threshold=hash(grid);float occupied=smoothstep(threshold-.045,threshold+.045,tone)*step(.002,tone);
   float dotShape=1.-smoothstep(.32,.49,length(fract(px/cell)-.5));
   float v=mix(tone*.39,occupied*dotShape*.58+tone*.075,textureStrength);
   float vignette=1.-.25*pow(length((uv-.5)*vec2(.8,1.)),2.);
   v=mix(v,pow(l,.7)*.23*(.94+.06*cos(px.y*3.14159)),screenMask);return vec3(.001,.003,.002)+lightColor*v*vignette;
  }
  void main(){vec3 p=inv*vec3(uv*size,1.);vec2 q=p.xy/p.z/vec2(640.,480.);float inside=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);vec2 n=q*2.-1.;q=(n*(1.+barrel*dot(n,n))+1.)*.5;
  float m=texture2D(mask,uv).r*inside;float signal=texture2D(core,q).a*m;float raster=1.-.018*(.5+.5*cos(uv.y*size.y*3.14159265))*m;
  float phosphor=1.-scan*(.5+.5*cos(q.y*480.*3.14159265*1.55+.08*sin(time*6.2831853/6.)));
  vec3 b=mix(linear(texture2D(scene,uv).rgb),linear(posterScene(uv)),posterMode)*raster;vec3 emit=signal*.73*phosphor*mix(ink,texture2D(core,q).rgb,captionColorMode)+texture2D(glow,q).a*m*lightColor*gain;
  float roll=exp(-pow((uv.y-(.55+.3*sin(time*6.2831853/6.)))/.025,2.))*.0007*m;
  gl_FragColor=vec4(clamp(srgb(b+emit+roll*vec3(.1,1.,.2)),0.,1.),1.);}`);
  this.layout=document.createElement("canvas");this.layout.width=720;this.layout.height=1280;this.lc=this.layout.getContext("2d");
  this.p=gl.createProgram();gl.attachShader(this.p,vs);gl.attachShader(this.p,fs);gl.linkProgram(this.p);if(!gl.getProgramParameter(this.p,gl.LINK_STATUS))throw Error('屏幕渲染器初始化失败');gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(this.p);
  const buffer=gl.createBuffer();this.buffer=buffer;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.p,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  this.textures=[];const texture=(source,name,index)=>{const t=gl.createTexture();this.textures.push(t);gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.uniform1i(gl.getUniformLocation(this.p,name),index)};
  this.plane=document.createElement('canvas');this.plane.width=640;this.plane.height=480;this.pc=this.plane.getContext('2d');this.blur=this.plane.cloneNode();this.bc=this.blur.getContext('2d');this.trail=this.plane.cloneNode();this.tc=this.trail.getContext('2d');
  texture(base,'scene',0);texture(mask,'mask',1);texture(this.plane,'core',2);texture(this.blur,'glow',3);
  // Solve destination pixels -> screen-space homography, keeping all four calibrated corners.
  let rows=[],source=[[0,0],[639,0],[639,479],[0,479]];definition.screen.quad.forEach(([x,y],i)=>{let[u,v]=source[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u]);rows.push([0,0,0,x,y,1,-v*x,-v*y,v])});
  for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(rows[j][i])>Math.abs(rows[pivot][i]))pivot=j;[rows[i],rows[pivot]]=[rows[pivot],rows[i]];let q=rows[i][i];if(Math.abs(q)<1e-9)throw Error('屏幕角点不能退化');for(let k=i;k<9;k++)rows[i][k]/=q;for(let j=0;j<8;j++)if(j!==i){q=rows[j][i];for(let k=i;k<9;k++)rows[j][k]-=q*rows[i][k]}}
  let h=rows.map(r=>r[8]);this.h=h;gl.uniformMatrix3fv(gl.getUniformLocation(this.p,'inv'),false,new Float32Array([h[0],h[3],h[6],h[1],h[4],h[7],h[2],h[5],1]));gl.uniform2f(gl.getUniformLocation(this.p,'size'),this.c.width,this.c.height);
 }
 toScreen(x,y){const h=this.h,k=h[6]*x+h[7]*y+1;return [(h[0]*x+h[1]*y+h[2])/k,(h[3]*x+h[4]*y+h[5])/k]}
 fromScreen(u,v){const h=this.h,a=h[0]-u*h[6],b=h[1]-u*h[7],c=h[3]-v*h[6],d=h[4]-v*h[7],e=u-h[2],f=v-h[5],det=a*d-b*c;return [(e*d-b*f)/det,(a*f-e*c)/det]}
 captionUnit(state,l){return Math.max(1,Math.min(l.fontSize*state.size,552/Math.max(1,l.text.length*6-1)))}
 layerCaptions(t,state,ctx){
  const cfg=this.d.screen;
  for(const [index,id]of ['caption-1','caption-2'].entries()){
   const l=state.layers.find(x=>x.id===id);if(!l?.visible)continue;
   const appearance=PosterLayers.elementState(l,state);
   const text=l.text,unit=this.captionUnit(appearance,l),width=s=>Math.max(0,(s.length*6-1)*unit),split=index===1&&text.match(/^(\S+\s+\S+)\s+(.*)$/),left=-width(text)/2;
   const chunks=split?[[split[1],left,1],[split[2],left+(split[1].length+1)*6*unit,2]]:[[text,left,index]];
   ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.rotation*Math.PI/180);ctx.scale(l.scale,l.scale);const motion=LayerMotion.sample(l,t);ctx.translate(motion.dx,motion.dy);ctx.globalAlpha*=l.opacity*motion.opacity;if(motion.clip<1){ctx.beginPath();ctx.rect(-width(text)/2-5,-8,(width(text)+10)*motion.clip,unit*8+16);ctx.clip()}ctx.fillStyle=l.color||state.ink;
   for(const [txt,x0,j]of chunks){const age=t-cfg.entries[j]-(state.crtDelay||0),exit=cfg.exits[j];if(age<0||t>=exit+.24)continue;let step=Math.floor((age+1e-7)*15),dy=step<4?[24,-7,4,0][step]*(state.crtJump??1):0,dx=step<4?[-3,2,-1,0][step]:0;if(t>=exit){dy=20+(t-exit)*125;dx=(t-exit)*-22}
    for(let i=0;i<txt.length;i++){const rows=(window.CRTGlyphs[txt[i]]||window.CRTGlyphs[' ']).split('/');rows.forEach((row,r)=>{for(let c=0;c<5;c++)if(row[c]==='1'){let xx=x0+dx+(i*6+c)*unit+LayerMotion.rowShift(motion,r),yy=dy+r*unit,stroke=unit*(.85+.15*appearance.density)+1.2;
     if(appearance.style==='dots'){ctx.beginPath();ctx.arc(xx+unit/2,yy+unit/2,stroke*.49,0,Math.PI*2);ctx.fill()}else if(appearance.style==='lines')ctx.fillRect(xx,yy+unit*.25,stroke,stroke*.5);else if(['ascii','digits'].includes(appearance.style)){ctx.font=unit*1.45+'px monospace';ctx.fillText(appearance.style==='ascii'?'#':(i+r+c)%2?'1':'0',xx,yy+unit)}else ctx.fillRect(xx-.6,yy-.6,stroke,stroke)
    }})}
   }ctx.restore();
  }
 }
 captions(t,state,ctx){
  if(this.d.screen.poster&&state.layers)return this.layerCaptions(t,state,ctx);
  const cfg=this.d.screen,lines=state.captions||cfg.captions;let unit=Math.min(cfg.pixelUnit*state.size,552/(Math.max(...lines.map(x=>x.length))*6-1));unit=Math.max(1.6,unit);const width=t=>Math.max(0,(t.length*6-1)*unit),split=lines[1].match(/^(\S+\s+\S+)\s+(.*)$/);let chunks=[[lines[0],(640-width(lines[0]))/2,188,0]];
  if(split){let x=(640-width(lines[1]))/2;chunks.push([split[1],x,258,1],[split[2],x+(split[1].length+1)*6*unit,258,2])}else chunks.push([lines[1],(640-width(lines[1]))/2,258,1]);ctx.fillStyle='#fff';
  for(const[text,px,py,j]of chunks){let age=t-cfg.entries[j]-(state.crtDelay||0),exit=cfg.exits[j];if(age<0||t>=exit+.24)continue;let step=Math.floor((age+1e-7)*30/2),dy=step<4?[24,-7,4,0][step]*(state.crtJump??1):0,dx=step<4?[-3,2,-1,0][step]:0;if(t>=exit){dy=20+(t-exit)*125;dx=(t-exit)*-22}let x=px+dx,y=py+dy;
   for(let i=0;i<text.length;i++){let rows=window.CRTGlyphs[text[i]].split('/');rows.forEach((row,r)=>{for(let c=0;c<5;c++)if(row[c]==='1'){let xx=x+(i*6+c)*unit,yy=y+r*unit,stroke=unit*(.85+.15*state.density)+1.2;
    if(state.style==='dots'){ctx.beginPath();ctx.arc(xx+unit/2,yy+unit/2,stroke*.49,0,Math.PI*2);ctx.fill()}else if(state.style==='lines'){ctx.fillRect(xx,yy+unit*.25,stroke,stroke*.5)}else if(state.style==='digits'){ctx.font=unit*1.45+'px monospace';ctx.fillText((i+r+c)%2?'1':'0',xx,yy+unit)}else if(state.style==='ascii'){ctx.font=unit*1.5+'px monospace';ctx.fillText('#',xx,yy+unit)}else ctx.fillRect(xx-.6,yy-.6,stroke,stroke)
   }})}
   if(age<.10){const strip=ctx.getImageData(0,Math.round(y+18),640,5);ctx.clearRect(0,Math.round(y+18),640,5);ctx.putImageData(strip,6,Math.round(y+18))}
  }
 }
 posterLayout(state){
  const cfg=this.d.screen.poster;if(!cfg)return null;
  const text=state.posterHeadline||cfg.headline,key=JSON.stringify([text,state.ink,state.glow]);if(this.layoutKey===key)return this.layout;this.layoutKey=key;
  const c=this.lc;c.clearRect(0,0,720,1280);const color=state.ink;
  const micro=(txt,x,y,alpha=.7)=>{c.globalAlpha=alpha;c.fillStyle=color;c.font='10px monospace';c.fillText(txt,x,y)};
  const line=(x,y,x2,y2,a=.3)=>{c.globalAlpha=a;c.strokeStyle=color;c.lineWidth=.6;c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke()};
  micro('C / 01',44,44);micro('EMOTIONAL FREQUENCY',263,44);micro('ANALOG ARCHIVE',585,44);line(44,57,676,57,.45);
  const title=document.createElement('canvas');title.width=720;title.height=330;const tc=title.getContext('2d');
  tc.fillStyle=color;tc.textBaseline='top';tc.font='900 124px Arial Black, Helvetica, Arial, sans-serif';
  for(let i=0;i<2;i++){tc.save();tc.translate(42,77+i*107);tc.scale(634/Math.max(1,tc.measureText(text[i]).width),1);tc.fillText(text[i],0,0);tc.restore()}
  // Discrete phosphor cells are cut into the title, leaving a solid, readable core.
  tc.globalCompositeOperation='destination-out';tc.globalAlpha=.3;for(let x=0;x<720;x+=3)tc.fillRect(x,0,.65,330);for(let y=0;y<330;y+=3)tc.fillRect(0,y,720,.55);
  c.globalAlpha=1;for(const [r,a]of [[15,.10],[5,.17],[1.4,.3]]){c.filter='blur('+r+'px)';c.globalAlpha=a*state.glow;c.drawImage(title,0,0)}c.filter='none';c.globalAlpha=1;c.drawImage(title,0,0);
  micro('ANALOG SIGNALS, HUMAN FEELINGS.',46,326,.76);micro('1996 / ON AIR',590,326,.76);
  line(44,350,676,350,.3);micro('RECEIVING / PLEASE STAY',44,373,.56);
  for(const[x,y,dx,dy]of [[44,394,24,24],[676,394,-24,24],[44,943,24,-24],[676,943,-24,-24]]){line(x,y,x+dx,y,.65);line(x,y,x,y+dy,.65)}
  c.save();c.translate(24,773);c.rotate(-Math.PI/2);micro('CRT-01 / PHOSPHOR STUDY',0,0,.52);c.restore();c.save();c.translate(701,486);c.rotate(Math.PI/2);micro('NO NETWORK. STILL CONNECTED.',0,0,.52);c.restore();
  line(44,980,676,980,.45);micro('SIGNAL',44,1002,.75);micro('FREQUENCY / 60 HZ',281,1002,.75);micro('MEMORY / 06 SEC',581,1002,.75);
  c.strokeStyle=color;c.globalAlpha=.7;c.lineWidth=1;c.beginPath();for(let x=44;x<=242;x++){let yy=1040+Math.sin((x-44)*.125)*Math.exp(-Math.pow((x-144)/55,2))*18;x===44?c.moveTo(x,yy):c.lineTo(x,yy)}c.stroke();line(280,1021,280,1061,.32);
  micro('SOME THINGS',304,1036,.8);micro('STILL GET THROUGH.',304,1053,.8);micro('[ 001 / 001 ]',591,1045,.6);
  c.globalAlpha=.78;c.fillStyle=color;c.font='bold 37px Helvetica, Arial, sans-serif';c.fillText('A SIGNAL FROM',44,1131);c.fillText('SOMEWHERE INSIDE.',44,1172);
  line(44,1201,676,1201,.45);micro('CHARACTER STUDY / STILL FEELING',44,1226,.6);micro('VOL. 01',628,1226,.6);
  for(let i=0;i<54;i++){c.globalAlpha=.6;c.fillRect(534+i*2.6,1113, i%3===0?1.5:.7,58)}
  c.globalAlpha=1;return this.layout;
 }
 render(phase,state,target,scale){
  let t=phase*this.d.loopSeconds;this.pc.clearRect(0,0,640,480);
  for(const[offset,alpha]of [[4/30,.025],[2/30,.08],[1/30,.20]]){this.tc.clearRect(0,0,640,480);this.captions(t-offset,state,this.tc);this.pc.globalAlpha=alpha;this.pc.drawImage(this.trail,0,0)}this.pc.globalAlpha=1;this.captions(t,state,this.pc);
  this.bc.clearRect(0,0,640,480);this.bc.globalCompositeOperation='lighter';for(const[radius,gain]of [[1.2,.30],[5.5,.21],[15,.10]]){this.bc.filter='blur('+radius+'px)';this.bc.globalAlpha=gain;this.bc.drawImage(this.plane,0,0)}this.bc.filter='none';this.bc.globalAlpha=1;this.bc.globalCompositeOperation='source-over';
  const gl=this.gl;gl.useProgram(this.p);for(const[index,source]of [[2,this.plane],[3,this.blur]]){gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,this.textures[index]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source)}
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);for(const[name,value]of [['gain',state.glow],['time',t],['barrel',this.d.screen.barrel],['scan',state.crtScan??this.d.screen.scan]])gl.uniform1f(gl.getUniformLocation(this.p,name),value);gl.uniform1f(gl.getUniformLocation(this.p,'captionColorMode'),this.d.screen.poster&&state.layers?1:0);gl.uniform1f(gl.getUniformLocation(this.p,'posterMode'),this.d.screen.poster?1:0);gl.uniform1f(gl.getUniformLocation(this.p,'textureStrength'),state.posterTexture??this.d.screen.poster?.texture??.8);gl.uniform4fv(gl.getUniformLocation(this.p,'subjectBounds'),this.d.screen.poster?.bounds||[0,0,720,1280]);gl.uniform3fv(gl.getUniformLocation(this.p,'ink'),rgb(state.ink));gl.uniform3fv(gl.getUniformLocation(this.p,'lightColor'),rgb(this.d.screen.poster&&state.layers?.find(l=>l.id==='television')?.color||state.glowColor));gl.drawArrays(gl.TRIANGLES,0,6);
  target.save();target.setTransform(scale,0,0,scale,0,0);target.globalCompositeOperation='source-over';if(this.d.screen.poster&&state.layers){target.fillStyle='#000';target.fillRect(0,0,720,1280);for(const l of state.layers)window.PosterLayers.paint(target,l,state,this,t)}else{target.drawImage(this.c,0,0);const layout=this.posterLayout(state);if(layout)target.drawImage(layout,0,0)}target.restore();
 }
 dispose(){for(const t of this.textures)this.gl.deleteTexture(t);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.p);this.gl.getExtension('WEBGL_lose_context')?.loseContext()}
};
