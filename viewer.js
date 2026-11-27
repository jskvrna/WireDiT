// All geometry, surface samples and camera images share one world coordinate system.
(() => {
  const root = document.querySelector('#reconstruction');
  const canvas = root.querySelector('.recon-stage canvas');
  const ctx = canvas.getContext('2d');
  const cs = document.documentElement.lang.startsWith('cs');
  const add = (a,b) => a.map((v,i) => v+b[i]);
  const sub = (a,b) => a.map((v,i) => v-b[i]);
  const mul = (a,s) => a.map(v => v*s);
  const dot = (a,b) => a.reduce((sum,v,i) => sum+v*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => mul(a,1/Math.hypot(...a));
  const up = [0,1,0], target = [0,1.8,0];
  const faces = [], edges = [], points = [];
  const face = (vertices,color) => faces.push({vertices,color});
  function box(x,y,z,w,h,d,color) {
    const a=[x,y,z], b=[x+w,y,z], c=[x+w,y,z+d], e=[x,y,z+d];
    const top=p=>add(p,[0,h,0]);
    [a,b,c,e].forEach((p,i,all)=>{
      const q=all[(i+1)%4]; face([p,q,top(q),top(p)],color);
    });
    face([a,b,c,e].map(top),color);
  }
  box(-3,0,-2,6,2.5,4,'#ddd1b7');
  // A hipped roof, with four eaves, four hips and a ridge.
  const roof=[[-3.3,2.5,-2.3],[3.3,2.5,-2.3],[3.3,2.5,2.3],[-3.3,2.5,2.3],[-1.45,4.15,0],[1.45,4.15,0]];
  for(const ids of [[0,1,5,4],[1,2,5],[2,3,4,5],[3,0,4]]) face(ids.map(i=>roof[i]),'#a6513c');
  for(const [a,b] of [[0,1],[1,2],[2,3],[3,0],[0,4],[3,4],[1,5],[2,5],[4,5]]) edges.push([roof[a],roof[b]]);
  for(const z of [-2.04,2.01]) for(const x of [-2.45,-.55,1.4]) {
    box(x,.8,z,1.05,1.1,.03,'#f6eee1');
    for(const dx of [.08,.55]) box(x+dx,.89,z+(z>0?.035:-.035),.41,.9,.026,'#516d78');
  }
  for(const x of [-3.03,3.01]) for(const z of [-1.45,.65]) box(x,.82,z,.025,1.07,.82,'#58737b');
  let seed=12875;
  function random(){seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;}
  for(const {vertices,color} of faces) for(let i=1;i<vertices.length-1;i++){
    const a=vertices[0], b=sub(vertices[i],a), c=sub(vertices[i+1],a);
    const count=Math.ceil(Math.hypot(...cross(b,c))*15);
    for(let n=0;n<count;n++){
      const u=Math.sqrt(random()),v=random();
      points.push([add(a,add(mul(b,u*(1-v)),mul(c,u*v))),color]);
    }
  }
  const cameras=[[7,1.65,6],[-6,1.75,7],[-7,1.6,-5],[6,1.8,-7]].map((eye,index)=>{
    const forward=unit(sub(target,eye)), right=unit(cross(forward,up)), vertical=cross(right,forward);
    const photo=document.createElement('canvas'); photo.width=420;photo.height=200;
    const g=photo.getContext('2d'), focal=340;
    const sky=g.createLinearGradient(0,0,0,200);
    sky.addColorStop(0,'#9dbcd1');sky.addColorStop(.53,'#e1e9e6');sky.addColorStop(.54,'#929e72');sky.addColorStop(1,'#a9a189');
    g.fillStyle=sky;g.fillRect(0,0,420,200);
    const depth=p=>dot(sub(p,eye),forward);
    const project=p=>{const v=sub(p,eye);return [210+focal*dot(v,right)/depth(p),100-focal*dot(v,vertical)/depth(p)];};
    const ordered=faces.slice().sort((a,b)=>averageDepth(b)-averageDepth(a));
    function averageDepth(f){return f.vertices.reduce((s,p)=>s+depth(p),0)/f.vertices.length;}
    for(const {vertices,color} of ordered){
      path(g,vertices.map(project));g.fillStyle=color;g.fill();
      const normal=unit(cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0])));
      g.fillStyle='rgba(42,38,45,'+(.13+.13*dot(normal,unit([1,1,.4])))+')';g.fill();
    }
    const button=document.createElement('button');button.type='button';
    button.setAttribute('aria-label',(cs?'Zvýraznit kameru ':'Highlight camera ')+(index+1));
    const label=document.createElement('span');label.textContent=String(index+1).padStart(2,'0');
    button.append(photo,label);root.querySelector('.recon-photos').append(button);
    button.onclick=()=>{selected=index;draw();};
    const distance=2.2, center=add(eye,mul(forward,distance));
    const corners=[[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>add(center,add(mul(right,x*210/focal*distance),mul(vertical,y*100/focal*distance))));
    return {eye,corners,photo,button};
  });
  function path(g,coords){g.beginPath();coords.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();}
  let selected=0,yaw,pitch,zoom,panX,panY;
  function reset(){yaw=.68;pitch=.48;zoom=1;panX=panY=0;draw();}
  function draw(){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    const ratio=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
    const right=[Math.cos(yaw),0,-Math.sin(yaw)],back=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
    const vertical=cross(back,right),scale=Math.min(w/21,h/12)*zoom;
    const project=p=>{const v=sub(p,target);return [w/2+panX+dot(v,right)*scale,h/2+panY-dot(v,vertical)*scale];};
    function line(a,b,color,width){ctx.beginPath();ctx.moveTo(...project(a));ctx.lineTo(...project(b));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    for(let n=-10;n<=10;n+=2){line([n,0,-10],[n,0,10],'#e2e7ed',.65);line([-10,0,n],[10,0,n],'#e2e7ed',.65);}
    function camera(cam){
      const active=cam===cameras[selected],color=active?'#117c78':'#82969e';
      const [a,b,,d]=cam.corners.map(project);
      ctx.save();ctx.transform((b[0]-a[0])/420,(b[1]-a[1])/420,(d[0]-a[0])/200,(d[1]-a[1])/200,...a);
      ctx.drawImage(cam.photo,0,0);ctx.restore();
      cam.corners.forEach((p,i)=>{line(cam.eye,p,color,active?1.6:1);line(p,cam.corners[(i+1)%4],color,active?1.6:1);});
    }
    const ordered=cameras.slice().sort((a,b)=>dot(sub(a.eye,b.eye),back));
    const front=c=>dot(sub(c.eye,target),back)>0;
    ordered.filter(c=>!front(c)).forEach(camera);
    for(const [p,color] of points){const [x,y]=project(p);ctx.fillStyle=color==='#ddd1b7'?'#a7a197':color;ctx.fillRect(x,y,1.15,1.15);}
    edges.forEach(([a,b])=>line(a,b,'#304fce',2.6));
    for(const v of roof){ctx.beginPath();ctx.arc(...project(v),2.8,0,Math.PI*2);ctx.fillStyle='#253fae';ctx.fill();}
    ordered.filter(front).forEach(camera);
    cameras.forEach((c,i)=>c.button.setAttribute('aria-pressed',String(i===selected)));
  }
  const pointers=new Map();
  const limit=z=>Math.min(9,Math.max(.35,z));
  canvas.onpointerdown=e=>{if(e.button>2)return;canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);};
  canvas.onpointermove=e=>{
    if(!pointers.has(e.pointerId))return;
    const old=pointers.get(e.pointerId),now=[e.clientX,e.clientY],dx=now[0]-old[0],dy=now[1]-old[1];
    pointers.set(e.pointerId,now);
    if(pointers.size===2){
      const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];
      zoom=limit(zoom*Math.hypot(...sub(now,other))/Math.max(1,Math.hypot(...sub(old,other))));
      panX+=dx/2;panY+=dy/2;
    }else if(e.shiftKey||e.buttons===2||e.buttons===4){panX+=dx;panY+=dy;}
    else {yaw-=dx*.009;pitch+=dy*.009;}
    draw();
  };
  canvas.onlostpointercapture=canvas.onpointercancel=canvas.onpointerup=e=>pointers.delete(e.pointerId);
  canvas.oncontextmenu=e=>e.preventDefault();
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=limit(zoom*Math.exp(-e.deltaY*(e.deltaMode===1?.035:.0015)));draw();},{passive:false});
  canvas.onkeydown=e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;
    e.preventDefault();
    const x=Number(e.key==='ArrowRight')-Number(e.key==='ArrowLeft'),y=Number(e.key==='ArrowDown')-Number(e.key==='ArrowUp');
    if(e.shiftKey){panX+=18*x;panY+=18*y;}else{yaw+=.12*x;pitch+=.12*y;}
    if(e.key==='Home')reset();else if(!x&&!y)zoom=limit(zoom*(e.key==='-'?.85:1.18));
    draw();
  };
  root.querySelector('.recon-reset').onclick=reset;reset();new ResizeObserver(draw).observe(canvas);
})();
