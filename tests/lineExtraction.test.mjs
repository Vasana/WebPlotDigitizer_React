import { XYAxes } from '../src/core/axes.js';
import { Calibration } from '../src/core/calibration.js';
import { detectColorPoints, averagingWindow, traceXYLine, xStepInterpolation } from '../src/core/autoDetect.js';
const W=1000,H=600; const data=new Uint8ClampedArray(W*H*4); for(let i=0;i<W*H;i++){data[i*4]=255;data[i*4+1]=255;data[i*4+2]=255;data[i*4+3]=255;}
function setPix(x,y,r,g,b){ if(x<0||y<0||x>=W||y>=H)return; const i=(Math.round(y)*W+Math.round(x))*4; data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=255;}
function drawLine(points,color,width=3){ for(let i=1;i<points.length;i++){ const [x0,y0]=points[i-1], [x1,y1]=points[i]; const n=Math.ceil(Math.hypot(x1-x0,y1-y0)*2); for(let k=0;k<=n;k++){ const t=k/n, x=x0+(x1-x0)*t, y=y0+(y1-y0)*t; for(let dy=-width;dy<=width;dy++)for(let dx=-width;dx<=width;dx++) if(dx*dx+dy*dy<=width*width) setPix(x+dx,y+dy,...color); } } }
const cal=new Calibration(2); cal.addPoint(100,500,0,''); cal.addPoint(900,500,100,''); cal.addPoint(100,500,'',0); cal.addPoint(100,100,'',100); const axes=new XYAxes(); axes.calibrate(cal,{noRotation:true});
function dataToPix(x,y){return axes.dataToPixel(x,y)}
function f(x){return 50+30*Math.sin(x/100*2*Math.PI)}
const pts=[]; for(let x=0;x<=100;x+=0.5){ const p=dataToPix(x,f(x)); pts.push([p.x,p.y]); } drawLine(pts,[220,0,0],2);
// add nearby other lines
const pts2=[]; for(let x=0;x<=100;x+=0.5){ const p=dataToPix(x,30+15*Math.cos(x/100*2*Math.PI)); pts2.push([p.x,p.y]); } drawLine(pts2,[0,0,220],2);
const imageData={width:W,height:H,data};
function rmse(raw){ const ds=raw.map(p=>axes.pixelToData(p.px,p.py)).filter(([x,y])=>x>=0&&x<=100).map(([x,y])=>({x,y,err:y-f(x)})); const e=Math.sqrt(ds.reduce((s,p)=>s+p.err*p.err,0)/ds.length); return {n:ds.length,rmse:e,mae:ds.reduce((s,p)=>s+Math.abs(p.err),0)/ds.length, max:Math.max(...ds.map(p=>Math.abs(p.err)))}; }
console.log('color thinning', rmse(detectColorPoints(imageData,[220,0,0],{tolerance:40,step:2,minClusterSize:2})));
console.log('avg window', rmse(averagingWindow(imageData,[220,0,0],{tolerance:40,windowSize:8,step:4})));
console.log('line trace', rmse(traceXYLine(imageData,[220,0,0],{tolerance:40,xStep:2,minPixels:1})));
console.log('xstep', rmse(xStepInterpolation(imageData,[220,0,0],axes,{tolerance:40,xMin:0,xMax:100,xStep:1,yScanPixels:''})));
