const chart=document.getElementById('chart');
const ctx=chart.getContext('2d');
function canvasPos(e){const c=(e.target&&e.target.getBoundingClientRect)?e.target:chart;const rect=c.getBoundingClientRect();const w=c.width||900;const h=c.height||(c===chart?420:150);const sx=w/rect.width;const sy=h/rect.height;return {x:(e.clientX-rect.left)*sx,y:(e.clientY-rect.top)*sy}}
function yearStep(pw,winLen){const years=winLen/12;const pxPerYear=pw/years;const target=80;const raw=target/pxPerYear;const choices=[1,2,5,10,20,50];for(let i=0;i<choices.length;i++){if(choices[i]>=raw)return choices[i]}return choices[choices.length-1]}
function getNiceTicks(min, max, count=5){
    if(min===max) return [min];
    const range = max-min;
    const roughStep = range/(count-1);
    const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 0.1, 0.2, 0.5, 0.01, 0.02, 0.05];
    // Simple closest match or power of 10 logic
    const mag = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalizedStep = roughStep / mag;
    let step;
    if(normalizedStep < 1.5) step = 1*mag;
    else if(normalizedStep < 3) step = 2*mag;
    else if(normalizedStep < 7) step = 5*mag;
    else step = 10*mag;
    
    // Safety for very small steps
    if(step <= 0) step = 1;

    const start = Math.ceil(min/step)*step;
    const res=[];
    // Add safety break
    let safe=0;
    for(let v=start; v<=max+step*0.01; v+=step){
        res.push(v);
        safe++;
        if(safe>100) break;
    }
    return res;
}
const statusEl=document.getElementById('status');
const fitnessEl=document.getElementById('fitness');
const progEl=document.getElementById('trainProgress');
function setProgress(p){progEl.value=Math.max(0,Math.min(100,Math.round(p)))}
const trainCountEl=document.getElementById('trainCount');
function setTrainCount(txt){trainCountEl.textContent=txt||''}
let lastGen=null,lastErr=null,lastCv=null,lastDoneMs=null;
const nextCrashEl=document.getElementById('nextCrash');
const nextBoomEl=document.getElementById('nextBoom');
const adviceEl=document.getElementById('advice');
const trainBtn=document.getElementById('train');
const gridSel=document.getElementById('grid');
const queryBtn=document.getElementById('queryBtn');
const helpPanel=document.getElementById('helpPanel');
const helpTextEl=document.getElementById('helpText');
const queryPanel=document.getElementById('queryPanel');
const queryContentEl=document.getElementById('queryContent');
const regionCheckboxes=document.querySelectorAll('#regionControls input');
const COLORS={global:'#60a5fa', us:'#f87171', europe:'#fbbf24', asia:'#34d399', emerging:'#a78bfa', geo:'#fb923c', financial:'#4ade80', tech:'#22d3ee', energy:'#f472b6', policy:'#94a3b8', macro:'#818cf8'};
const baseY=1750;
function ym(s){const [y,m]=s.split('-').map(x=>parseInt(x));return (y-baseY)*12+(m-1)}
function fromm(n){const y=baseY+Math.floor(n/12);const m=(n%12)+1;return y+"-"+(m<10?"0"+m:m)}
function eventSentiment(e){const name=(e.name||'').toLowerCase();const negK=['war','conflict','invasion','crisis','crash','panic','recession','depression','sanction','embargo','default','collapse','bomb','attack','terror','riot','coup','战争','战役','战事','冲突','侵略','危机','崩盘','恐慌','衰退','萧条','制裁','禁运','违约','倒闭','袭击','恐怖','暴乱','政变','kriege','krieg','konflikt','krise','crash','rezession','depression','sanktion','embargo','default','zusammenbruch','attaque','terrorisme','émeute','coup'];const posK=['peace','truce','accord','agreement','stimulus','recovery','aid','bailout','reform','ceasefire','和平','停火','协议','协定','刺激','复苏','援助','救助','改革','armistice','accord','paix','relance'];const neuK=['bretton woods','布雷顿森林','conference','体系','制度','system'];if(e.type==='down')return 'neg';if(e.type==='up')return 'pos';if(e.type==='geo'){if(negK.some(k=>name.includes(k)))return 'neg';if(posK.some(k=>name.includes(k)))return 'pos';if(neuK.some(k=>name.includes(k)))return 'neutral';return 'neg'}return 'neutral'}
const crises=['1772-06','1792-03','1797-02','1819-01','1825-12','1837-05','1847-10','1857-08','1866-05','1873-09','1884-05','1890-11','1893-05','1896-08','1901-11','1903-11','1907-10','1910-01','1913-06','1914-08','1918-05','1920-06','1923-07','1926-10','1929-10','1932-07','1937-03','1939-12','1945-02','1946-05','1948-11','1953-07','1957-08','1960-04','1962-06','1966-10','1969-12','1970-05','1973-10','1974-12','1980-01','1981-07','1982-08','1987-10','1990-10','1994-12','1997-10','1998-09','2000-04','2002-10','2007-10','2008-10','2009-03','2011-09','2015-08','2018-12','2020-03','2022-10'].map(ym);
const booms=['1824-01','1836-01','1845-01','1856-01','1872-01','1881-01','1889-01','1902-09','1906-09','1909-11','1912-08','1916-11','1919-08','1923-05','1926-06','1929-09','1936-06','1944-11','1948-06','1953-03','1956-08','1959-12','1966-02','1968-11','1972-12','1976-09','1980-01','1983-11','1987-08','1994-01','1999-12','2004-02','2007-10','2010-04','2015-05','2018-09','2021-11'].map(ym);
const geo=['1756-05','1776-07','1789-07','1803-05','1812-06','1848-02','1861-04','1870-07','1904-02','1914-07','1917-04','1939-09','1941-12','1950-06','1962-10','1964-08','1973-10','1979-11','1990-08','1991-01','2001-09','2003-03','2014-03','2016-06','2022-02','2023-10','2024-01'].map(ym);
// 周期理论参数：
// Kitchin (基钦周期): ~40-42月 (库存/短周期)
// Juglar (朱格拉周期): ~9-10年 (108-120月, 设备投资/中周期)
// Armstrong (阿姆斯特朗周期): 8.6年 (103.2月, 3141天)
// Kuznets (库兹涅茨周期): ~15-25年 (180-300月, 房地产/建筑)
// Kondratieff (康波周期): ~50-60年 (600-720月, 技术/长波)
const P=[42, 103, 216, 648]; // 核心周期组合
let showGrid=true;
let queryMode=false;
let _seed = 12345;
function seededRandom() {
    _seed = (_seed * 9301 + 49297) % 233280;
    return _seed / 233280.0;
}
function rand(){return seededRandom()}
function clamp(x,a,b){return x<a?a:(x>b?b:x)}
function composite(params,t){if(!params||!params.a)return 0;let s=0;for(let i=0;i<P.length;i++){const a=params.a[i]||0;const ph=params.ph[i]||0;s+=a*Math.sin(2*Math.PI*((t+ph)/P[i]))}if(params.k>0&&params.sigma>0){let z=0;const sig2=2*params.sigma*params.sigma;for(let i=0;i<geo.length;i++){const d=t-geo[i];z+=Math.exp(-(d*d)/sig2)}s+=params.k*z}return isNaN(s)?0:s}
function series(params,from,to){const arr=new Array(to-from+1);for(let i=from;i<=to;i++)arr[i-from]=composite(params,i);return arr}
const REGIONS={global:{geoScale:1},us:{geoScale:1.1},europe:{geoScale:1.2},asia:{geoScale:0.9},emerging:{geoScale:1.1},geo:{geoScale:1.5},financial:{geoScale:1.2},tech:{geoScale:0.8},energy:{geoScale:1.3},policy:{geoScale:1.0},macro:{geoScale:1.0}};
function compositeR(region,params,t){if(!params||!params.a)return 0;const mod=REGIONS[region]||REGIONS.global;let s=0;for(let i=0;i<P.length;i++){const amp=1;const a=(params.a[i]||0)*amp;const ph=params.ph[i]||0;s+=a*Math.sin(2*Math.PI*((t+ph)/P[i]))}if(params.k>0&&params.sigma>0){let z=0;const sig2=2*params.sigma*params.sigma;for(let i=0;i<geo.length;i++){const d=t-geo[i];z+=Math.exp(-(d*d)/sig2)}s+=params.k*(mod.geoScale||1)*z}return isNaN(s)?0:s}
function seriesR(region,params,from,to){const arr=new Array(to-from+1);for(let i=from;i<=to;i++)arr[i-from]=compositeR(region,params,i);return arr}
const REGION_KEYS=['us','europe','asia','emerging','energy','tech'];
const GLOBAL_WEIGHTS={us:0.4,europe:0.25,asia:0.2,emerging:0.15,energy:0,tech:0};
function compositeGlobal(t){let s=0;for(let k in GLOBAL_WEIGHTS){const w=GLOBAL_WEIGHTS[k];if(!w)continue;s+=w*compositeR(k,MODELS[k],t)}return s}
function seriesGlobal(from,to){const arr=new Array(to-from+1);for(let i=from;i<=to;i++)arr[i-from]=compositeGlobal(i);return arr}
function extremes(arr,from,thHigh=0.6,thLow=0.6){const peaks=[];const troughs=[];for(let i=1;i<arr.length-1;i++){const v=arr[i];if(v>arr[i-1]&&v>arr[i+1]&&v>thHigh)peaks.push({t:from+i,v});if(v<arr[i-1]&&v<arr[i+1]&&-v>thLow)troughs.push({t:from+i,v})}return {peaks,troughs}}
function nearest(list,t){let best=1e9;for(let i=0;i<list.length;i++){const d=Math.abs(list[i].t-t);if(d<best)best=d}return Math.min(best,120)}
function filterRange(list,start,end){const out=[];for(let i=0;i<list.length;i++){if(list[i]>=start&&list[i]<=end)out.push(list[i])}return out}
function scoreFull(params){const from=ym('1750-01');const to=ym('2024-12');const arr=series(params,from,to);const ex=extremes(arr,from);const cut=ym('1900-01');let e1=0;for(let i=0;i<crises.length;i++){const w=crises[i]<cut?0.5:1;e1+=nearest(ex.troughs,crises[i])*w}let e2=0;for(let i=0;i<booms.length;i++){const w=booms[i]<cut?0.5:1;e2+=nearest(ex.peaks,booms[i])*w}let e3=0;for(let i=0;i<geo.length;i++){const w=geo[i]<cut?0.5:1;e3+=(nearest(ex.peaks,geo[i])*.5+nearest(ex.troughs,geo[i])*.5)*w}let total=e1*0.5+e2*0.3+e3*0.2;const r1s=ym('1900-01'),r1e=ym('1959-12'),r2s=ym('1960-01'),r2e=ym('1999-12'),r3s=ym('2000-01'),r3e=ym('2024-12');function seg(sc,sp,sGeo){return sc*0.5+sp*0.3+sGeo*0.2}function sumNearest(events,list,start,end){const ev=filterRange(events,start,end);let s=0;for(let i=0;i<ev.length;i++)s+=nearest(list,ev[i]);return s}const s1=seg(sumNearest(crises,ex.troughs,r1s,r1e),sumNearest(booms,ex.peaks,r1s,r1e),0.5*sumNearest(geo,ex.peaks,r1s,r1e)+0.5*sumNearest(geo,ex.troughs,r1s,r1e));const s2=seg(sumNearest(crises,ex.troughs,r2s,r2e),sumNearest(booms,ex.peaks,r2s,r2e),0.5*sumNearest(geo,ex.peaks,r2s,r2e)+0.5*sumNearest(geo,ex.troughs,r2s,r2e));const s3=seg(sumNearest(crises,ex.troughs,r3s,r3e),sumNearest(booms,ex.peaks,r3s,r3e),0.5*sumNearest(geo,ex.peaks,r3s,r3e)+0.5*sumNearest(geo,ex.troughs,r3s,r3e));function std(a){const m=a.reduce((x,y)=>x+y,0)/a.length;let v=0;for(let i=0;i<a.length;i++)v+=(a[i]-m)*(a[i]-m);return Math.sqrt(v/a.length)}const cv=std([s1,s2,s3]);const fitM=document.getElementById('fitMarket')&&document.getElementById('fitMarket').checked;if(fitM&&MARKET_DATA&&MARKET_DATA.stock){let mErr=0;const step=6;for(let i=step;i<arr.length;i+=step){if(i>=MARKET_DATA.stock.length)break;const dModel=arr[i]-arr[i-step];const dMarket=MARKET_DATA.stock[i]-MARKET_DATA.stock[i-step];if(dModel*dMarket<0)mErr++}total+=mErr*0.5}return {total,cv}}
function initParams(){return {a:new Array(P.length).fill(0).map(()=>rand()),ph:P.map(p=>rand()*p),k:rand(),sigma:6+rand()*18,thHigh:0.6+rand()*1.4,thLow:0.6+rand()*1.4}}
function mutate(p){const q=JSON.parse(JSON.stringify(p));for(let i=0;i<P.length;i++){q.a[i]=clamp(q.a[i]+(rand()-.5)*0.2,0,1);q.ph[i]=clamp(q.ph[i]+(rand()-.5)*0.1*P[i],0,P[i])}q.k=clamp(q.k+(rand()-.5)*0.2,0,1);q.sigma=clamp(q.sigma+(rand()-.5)*6,4,30);q.thHigh=clamp(q.thHigh+(rand()-.5)*0.3,0.3,2.5);q.thLow=clamp(q.thLow+(rand()-.5)*0.3,0.3,2.5);return q}
let paramsG=initParams();
const MODELS={us:initParams(),europe:initParams(),asia:initParams(),emerging:initParams(),geo:initParams(),financial:initParams(),tech:initParams(),energy:initParams(),policy:initParams(),macro:initParams()};
function scoreFullR(region,params){const from=ym('1750-01');const to=ym('2024-12');const arr=seriesR(region,params,from,to);const ex=extremes(arr,from,params.thHigh,params.thLow);const cut=ym('1900-01');let e1=0;for(let i=0;i<crises.length;i++){const w=crises[i]<cut?0.5:1;e1+=nearest(ex.troughs,crises[i])*w}let e2=0;for(let i=0;i<booms.length;i++){const w=booms[i]<cut?0.5:1;e2+=nearest(ex.peaks,booms[i])*w}let e3=0;for(let i=0;i<geo.length;i++){const w=geo[i]<cut?0.5:1;e3+=(nearest(ex.peaks,geo[i])*.5+nearest(ex.troughs,geo[i])*.5)*w}let total=e1*0.5+e2*0.3+e3*0.2;const r1s=ym('1900-01'),r1e=ym('1959-12'),r2s=ym('1960-01'),r2e=ym('1999-12'),r3s=ym('2000-01'),r3e=ym('2024-12');function seg(sc,sp,sGeo){return sc*0.5+sp*0.3+sGeo*0.2}function sumNearest(events,list,start,end){const ev=filterRange(events,start,end);let s=0;for(let i=0;i<ev.length;i++)s+=nearest(list,ev[i]);return s}const s1=seg(sumNearest(crises,ex.troughs,r1s,r1e),sumNearest(booms,ex.peaks,r1s,r1e),0.5*sumNearest(geo,ex.peaks,r1s,r1e)+0.5*sumNearest(geo,ex.troughs,r1s,r1e));const s2=seg(sumNearest(crises,ex.troughs,r2s,r2e),sumNearest(booms,ex.peaks,r2s,r2e),0.5*sumNearest(geo,ex.peaks,r2s,r2e)+0.5*sumNearest(geo,ex.troughs,r2s,r2e));const s3=seg(sumNearest(crises,ex.troughs,r3s,r3e),sumNearest(booms,ex.peaks,r3s,r3e),0.5*sumNearest(geo,ex.peaks,r3s,r3e)+0.5*sumNearest(geo,ex.troughs,r3s,r3e));function std(a){const m=a.reduce((x,y)=>x+y,0)/a.length;let v=0;for(let i=0;i<a.length;i++)v+=(a[i]-m)*(a[i]-m);return Math.sqrt(v/a.length)}const cv=std([s1,s2,s3]);const fitM=document.getElementById('fitMarket')&&document.getElementById('fitMarket').checked;if(fitM&&MARKET_DATA&&MARKET_DATA.stock){let mErr=0;const step=6;for(let i=step;i<arr.length;i+=step){if(i>=MARKET_DATA.stock.length)break;const dModel=arr[i]-arr[i-step];const dMarket=MARKET_DATA.stock[i]-MARKET_DATA.stock[i-step];if(dModel*dMarket<0)mErr++}total+=mErr*0.5}return {total,cv}}
function trainRegion(region,gen=40,pop=36,keep=8){const popu=new Array(pop).fill(0).map(()=>initParams());const t0=performance.now();for(let g=0;g<gen;g++){const scored=popu.map(p=>{const f=scoreFullR(region,p);return {p,s:f.total+0.5*f.cv,t:f.total,c:f.cv}}).sort((a,b)=>a.s-b.s);for(let i=0;i<keep;i++)popu[i]=scored[i].p;for(let i=keep;i<pop;i++)popu[i]=mutate(popu[Math.floor(rand()*keep)]);MODELS[region]=scored[0].p;setStatusGen(g+1);setFitness(scored[0].t,scored[0].c);setProgress(((g+1)/gen)*100)}const t1=performance.now();setDone(Math.round(t1-t0));setProgress(100)}
const appStateEl=document.getElementById('appState');
function setAppState(txt){if(appStateEl)appStateEl.textContent=txt;console.log("[App State]", txt)}

function predict(){
  setAppState('正在计算...');
  try{
    const now=ym(new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,'0'));
    const fullFrom=ym('1750-01');
    const fullTo=ym('2099-12');
    const checked=[];
    regionCheckboxes.forEach(cb=>{if(cb.checked)checked.push(cb.value)});
    if(checked.length===0){
        checked.push('global');
        const gb = document.querySelector('input[value="global"]');
        if(gb) gb.checked = true;
    }
    const seriesData={};
    let primaryEx=null;
    let primaryArr=null;
    let primaryKey=checked.includes('global')?'global':checked[0];
    
    // 1. Calculate Global Series (Forecast Basis & Dynamic Global)
    let globalArr = null;
    {
        const others = checked.filter(c => c !== 'global' && MODELS[c]);
        if(others.length > 0){
             let totalW = 0;
             const weights = {};
             others.forEach(r => {
                 const w = GLOBAL_WEIGHTS[r] || 0.1; 
                 weights[r] = w;
                 totalW += w;
             });
             globalArr = new Array(fullTo-fullFrom+1).fill(0);
             for(let i=fullFrom; i<=fullTo; i++){
                 let s = 0;
                 others.forEach(r => {
                     s += (weights[r]/totalW) * compositeR(r, MODELS[r], i);
                 });
                 globalArr[i-fullFrom] = s;
             }
        } else {
             globalArr = seriesGlobal(fullFrom, fullTo);
        }
    }

    checked.forEach(region=>{
        let arr=null;
        let thH=0.6, thL=0.6;
        if(region==='global'){
            arr = globalArr;
            if(region===primaryKey){
                 const keys=['us','europe','asia','emerging'];
                 thH=keys.map(k=>(MODELS[k]&&MODELS[k].thHigh)||0.6).reduce((a,b)=>a+b,0)/keys.length;
                 thL=keys.map(k=>(MODELS[k]&&MODELS[k].thLow)||0.6).reduce((a,b)=>a+b,0)/keys.length;
                 primaryArr=arr;
                 primaryEx=extremes(arr,fullFrom,thH,thL);
            }
        }else{
            const m=MODELS[region]||initParams();
            arr=seriesR(region,m,fullFrom,fullTo);
            if(region===primaryKey){
                 thH=m.thHigh||0.6;
                 thL=m.thLow||0.6;
                 primaryArr=arr;
                 primaryEx=extremes(arr,fullFrom,thH,thL);
            }
        }
        seriesData[region]=arr;
    });

    // 2. Forecast Calculation (Always use Global Series)
    if(globalArr){
        // Use default thresholds for text forecast to ensure consistency
        const gEx = extremes(globalArr, fullFrom, 0.6, 0.6); 
        let nextT=null,nextP=null;
        
        // Strict Search
        for(let i=0;i<gEx.troughs.length;i++){if(gEx.troughs[i].t>now){nextT=gEx.troughs[i].t;break}}
        for(let i=0;i<gEx.peaks.length;i++){if(gEx.peaks[i].t>now){nextP=gEx.peaks[i].t;break}}
        
        // Fallback: force find next local extrema (relaxed)
        if(!nextT){
            for(let i=1; i<globalArr.length-1; i++){
                const t = fullFrom + i;
                if(t > now){
                    // Look for a local minimum (V shape)
                    if(globalArr[i] < globalArr[i-1] && globalArr[i] < globalArr[i+1]){
                        nextT = t;
                        break;
                    }
                }
            }
        }
        if(!nextP){
            for(let i=1; i<globalArr.length-1; i++){
                const t = fullFrom + i;
                if(t > now){
                    // Look for a local maximum (A shape)
                    if(globalArr[i] > globalArr[i-1] && globalArr[i] > globalArr[i+1]){
                        nextP = t;
                        break;
                    }
                }
            }
        }
        
        // Final Fallback: Global min/max in next 10 years
        const searchEnd = Math.min(globalArr.length-1, now - fullFrom + 120); 
        const startIdx = Math.max(0, now - fullFrom + 1);
        
        if(!nextT && startIdx < searchEnd){
             let minVal = 1e9;
             let minT = -1;
             for(let i=startIdx; i<searchEnd; i++){
                 if(globalArr[i] < minVal){
                     minVal = globalArr[i];
                     minT = fullFrom + i;
                 }
             }
             if(minT > 0) nextT = minT;
        }
        
        if(!nextP && startIdx < searchEnd){
             let maxVal = -1e9;
             let maxT = -1;
             for(let i=startIdx; i<searchEnd; i++){
                 if(globalArr[i] > maxVal){
                     maxVal = globalArr[i];
                     maxT = fullFrom + i;
                 }
             }
             if(maxT > 0) nextP = maxT;
        }

        nextCrashEl.textContent=nextT?fromm(nextT):'-';
        nextBoomEl.textContent=nextP?fromm(nextP):'-';
        
        // Ensure advice is generated
        advice(nextT,nextP);
    }
    renderView(seriesData,fullFrom,primaryEx);
    setAppState('就绪');
  }catch(e){console.error(e);setAppState('错误: '+e.message)}
}
let winLen=30*12;let winStart=ym('1960-01');
let evDraw=[];let hoverEv=null;let hadHover=false;
function getEventRegion(e){
    const name=(e.name||'').toLowerCase();
    const usK=['us','usa','america','fed','dollar','lincoln','civil war','nixon','volcker','subprime','lehman','美','联储','美元','林肯','内战','尼克松','沃尔克','次贷','雷曼','硅谷','9/11'];
    const euK=['uk','britain','france','germany','euro','ecb','brexit','napoleon','industrial revolution','pound','英','法','德','欧','布雷顿','拿破仑','工业革命','英镑'];
    const asK=['asia','china','japan','russia','soviet','korea','vietnam','india','renminbi','yen','亚','中','日','俄','苏','韩','越','印','人民币','日元'];
    const emK=['emerging','latam','mexico','argentina','brazil','turkey','新兴','拉美','墨西','阿根廷','巴西','土耳其'];
    const enK=['oil','energy','opec','gas','petrol','油','能源','气'];
    const teK=['tech','internet','ai','dotcom','cyber','nasdaq','科','网','智能','纳斯达克'];
    if(enK.some(k=>name.includes(k)))return 'energy';
    if(teK.some(k=>name.includes(k)))return 'tech';
    if(emK.some(k=>name.includes(k)))return 'emerging';
    if(asK.some(k=>name.includes(k)))return 'asia';
    if(euK.some(k=>name.includes(k)))return 'europe';
    if(usK.some(k=>name.includes(k)))return 'us';
    return 'global';
}
function renderView(seriesData,from,ex){
  const keys=Object.keys(seriesData);
  const dpr = window.devicePixelRatio || 1;
  const cssW = 900;
  const cssH = 420;
  
  if(chart.width !== cssW*dpr || chart.height !== cssH*dpr){
      chart.width = cssW*dpr;
      chart.height = cssH*dpr;
      chart.style.width = cssW+'px';
      chart.style.height = cssH+'px';
  }
  
  ctx.resetTransform();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,cssW,cssH);
  
  if(keys.length===0){return}

  const w=cssW, h=cssH;
  const mL=60, mT=20, mR=20, mB=30;
  const pw=w-mL-mR, ph=h-mT-mB;
  const iStart=Math.max(0,winStart-from);
  const firstArr=seriesData[keys[0]];
  const iEnd=Math.min(firstArr.length-1,iStart+winLen);
  
  let min=1e9,max=-1e9;
  // Calculate min/max based on ALL visible series to prevent overflow
  for(let k of keys){
      const arr=seriesData[k];
      for(let i=iStart;i<=iEnd;i++){
        if(!isNaN(arr[i])){if(arr[i]<min)min=arr[i];if(arr[i]>max)max=arr[i]}
      }
  }
  if(min>max){min=-1;max=1}
  if(max-min<1e-6){max=min+1e-6}
  
  // Add some padding to Y-axis
  const range = max-min;
  min -= range*0.05;
  max += range*0.05;

  const axisColor=document.body.classList.contains('light')?'#000000':'#ffffff';
  ctx.lineWidth=1.5;
  const fxm=(m)=>mL+(m-winStart)/winLen*pw;
  const fy=(v)=>mT+ph-(v-min)/(max-min)*ph;
  const gridColor=document.body.classList.contains('light')?'#cbd5e1':'#334155';
  
  if(showGrid){
    ctx.save();ctx.strokeStyle=gridColor;ctx.globalAlpha=0.35;
    // Y-Axis Grid & Labels (using getNiceTicks)
    const yTicks = getNiceTicks(min, max, 8);
    ctx.fillStyle=axisColor;ctx.font='12px system-ui';ctx.textAlign='right';ctx.textBaseline='middle';
    
    yTicks.forEach(v => {
        const y = fy(v);
        if(y>=mT && y<=mT+ph){
            ctx.beginPath();
            ctx.moveTo(mL, y);
            ctx.lineTo(mL+pw, y);
            ctx.stroke();
            ctx.fillText(v.toLocaleString(), mL-8, y);
        }
    });

    // X-Axis Grid
    const yrStart=baseY+Math.floor(winStart/12);
    const yrEnd=baseY+Math.floor((winStart+winLen)/12);
    const step=yearStep(pw,winLen);
    ctx.textAlign='center';ctx.textBaseline='top';
    for(let y=yrStart-(yrStart%step);y<=yrEnd;y+=step){
        const m=(y-baseY)*12;
        const xx=fxm(m);
        if(xx>=mL && xx<=mL+pw){
            ctx.beginPath();ctx.moveTo(xx,mT);ctx.lineTo(xx,mT+ph);ctx.stroke();
            ctx.fillText(String(y),xx,mT+ph+8);
        }
    }
    ctx.restore()
  }

  // Axis Lines
  ctx.strokeStyle=axisColor;ctx.beginPath();ctx.moveTo(mL,mT);ctx.lineTo(mL,mT+ph);ctx.lineTo(mL+pw,mT+ph);ctx.stroke();
  
  // Y-Axis Label
  (function(){
    const L=I18N[langSel.value]||I18N.zh;
    ctx.save();
    ctx.fillStyle=axisColor;ctx.font='12px system-ui';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.translate(mL-45,mT+ph/2);ctx.rotate(-Math.PI/2);
    ctx.fillText(L.yAxis||'模型值',0,0);
    ctx.restore()
  })()
  
  const drawOrder=keys.filter(k=>k!=='global');
  if(keys.includes('global'))drawOrder.push('global');
  
  for(let k of drawOrder){
      const arr=seriesData[k];
      ctx.save();
      ctx.beginPath();
      ctx.rect(mL,mT,pw,ph);
      ctx.clip();
      ctx.beginPath();
      ctx.strokeStyle=COLORS[k]||'#ffffff';
      ctx.lineWidth=(k==='global')?3.0:1.5; // Slightly thinner for high DPI crispness
      let first=true;
      for(let i=iStart;i<=iEnd;i++){
          const val=arr[i];
          if(isNaN(val))continue;
          const x=fxm(from+i);
          const y=fy(val);
          if(first){ctx.moveTo(x,y);first=false}else{ctx.lineTo(x,y)}
      }
      ctx.stroke();
      ctx.restore();
  }
  
  const evs=events.filter(e=>e.month>=winStart&&e.month<=winStart+winLen);
  evDraw=[];
  const hasGlobal = keys.includes('global');
  const specificKeys = keys.filter(k=>k!=='global');

  for(let i=0;i<evs.length;i++){
    const e=evs[i];
    const region = e.region || 'global';
    const domain = e.domain || 'macro';
    let visible=false;
    let opacity=1.0;

    const regionMatch = keys.includes(region);
    const domainMatch = keys.includes(domain);
    const isMatch = regionMatch || domainMatch;
    
    // Check if this event matches any specific (non-global) criteria
    const specificMatch = specificKeys.includes(region) || specificKeys.includes(domain);

    if(hasGlobal){
        visible=true;
        if(specificKeys.length>0){
            if(specificMatch){
                opacity=1.0;
            }else{
                // Event is visible only because of 'global', but we have specific filters active
                opacity=0.3;
            }
        }else{
            opacity=1.0;
        }
    }else{
        if(isMatch){
            visible=true;
            opacity=1.0;
        }else{
            visible=false;
        }
    }
    
    if(!visible) continue;

    const idx=e.month-from;
    const x=fxm(e.month);
    const s=eventSentiment(e);
    const trend=(e.type==='up'||s==='pos')?'up':((e.type==='down'||s==='neg')?'down':'neutral');
    const impN=Math.max(0,Math.min(1,e.impact));
    const upFrac=0.45-0.35*impN;
    const downFrac=0.55+0.35*impN;
    const y=(trend==='up')?(mT+ph*upFrac):(trend==='down')?(mT+ph*downFrac):(mT+ph*0.5);
    const imp=Math.max(0,Math.min(1.2,e.impact));
    const base=4+Math.pow(imp,1.8)*10;
    const r=Math.max(2,Math.min(18,Math.round(base)));
    
    ctx.save();
    ctx.globalAlpha=opacity;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=(s==='neg')?'#ef4444':(s==='pos')?'#22c55e':'#9ca3af';
    
    // Original logic had alpha 0.55 for neutral. Combine with our opacity.
    const baseAlpha=(s==='neutral')?0.55:1.0;
    ctx.globalAlpha=baseAlpha*opacity;
    ctx.fill();
    ctx.restore();
    
    evDraw.push({x,y,r,e});
  }
  if(hoverEv){
    ctx.save();
    const s=eventSentiment(hoverEv.e);
    const glow=(s==='neg')?'#fca5a5':(s==='pos')?'#86efac':'#d1d5db';
    ctx.shadowColor=glow;ctx.shadowBlur=8;
    ctx.fillStyle=(s==='neg')?'#ef4444':(s==='pos')?'#22c55e':'#9ca3af';
    ctx.globalAlpha=0.85;ctx.beginPath();ctx.arc(hoverEv.x,hoverEv.y,hoverEv.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowBlur=0;
    ctx.lineWidth=2.2;ctx.strokeStyle=document.body.classList.contains('light')?'#f59e0b':'#fbbf24';
    ctx.beginPath();ctx.arc(hoverEv.x,hoverEv.y,hoverEv.r+3,0,Math.PI*2);ctx.stroke();
    ctx.restore()
  }
  
  // Update lastGeom for tooltip
  lastSeriesData=seriesData;lastEx=ex;lastFrom=from;lastMin=min;lastMax=max;lastGeom={mL,mT,pw,ph};
  renderMarketCharts(ym('1750-01'));
}
let dragging=false,lastX=0;function onDown(e){dragging=true;lastX=canvasPos(e).x;hideTooltip()}function onMove(e){const p=canvasPos(e);if(dragging){const dx=p.x-lastX;lastX=p.x;const w=900;const pw=w-68-14;const monthsPerPx=winLen/pw;const dM=Math.round(-dx*monthsPerPx);const fullFrom=ym('1750-01');const fullTo=ym('2099-12');winStart=Math.min(Math.max(fullFrom,winStart+dM),fullTo-winLen);predict()}else{if(e.target===chart&&!pinned)hoverAt(p.x,p.y)}}function onUp(){dragging=false}
const tooltipEl=document.getElementById('tooltip');
tooltipEl.style.pointerEvents='none';
const chartWrap=document.querySelector('.chartWrap');
let lastSeriesData={},lastEx=null,lastFrom=null,lastMin=0,lastMax=1,lastGeom=null;
let pinned=false;
function hideTooltip(){tooltipEl.style.display='none'}
function findHit(x,y){let hit=null,hd=1e18;for(let i=0;i<evDraw.length;i++){const dx=x-evDraw[i].x,dy=y-evDraw[i].y;const r=evDraw[i].r;const d2=dx*dx+dy*dy;const thr=(r+2)*(r+2);if(d2<=thr&&d2<hd){hd=d2;hit=evDraw[i]}}return hit}
function hoverAt(x,y){if(!lastGeom){return}const {mL,mT,pw,ph}=lastGeom;const inside=x>=mL&&x<=mL+pw&&y>=mT&&y<=mT+ph;if(!inside){hideTooltip();if(hoverEv){hoverEv=null;chart.style.cursor='default';renderView(lastSeriesData,lastFrom,lastEx)}return}
  const hit=findHit(x,y);
  if(hit){chart.style.cursor='pointer';const L=I18N[langSel.value]||I18N.zh;const typeMap=L.typeNames||{struct:'结构',geo:'地缘政治',up:'增长',down:'下跌'};const tip=`${evName(hit.e)} | ${typeMap[hit.e.type]||hit.e.type} | ${hit.e.date}`;const cx=x+12,cy=y+12;const tw=(()=>{tooltipEl.style.display='block';tooltipEl.style.left='-9999px';tooltipEl.style.top='-9999px';tooltipEl.textContent=tip;return tooltipEl.offsetWidth})();let nx=cx,ny=cy;const wrapW=chartWrap.clientWidth;if(nx+tw>wrapW-8){nx=cx-tw-16}tooltipEl.style.left=nx+'px';tooltipEl.style.top=ny+'px';tooltipEl.style.display='block';if(hoverEv!==hit){hoverEv=hit;renderView(lastSeriesData,lastFrom,lastEx)}
  }else{
    if(hoverEv){hoverEv=null;renderView(lastSeriesData,lastFrom,lastEx)}
    const keys=Object.keys(lastSeriesData);
    const key=keys.includes('global')?'global':keys[0];
    const arr=lastSeriesData[key];
    if(arr){
      const relX=(x-mL)/pw;
      const mOffset=Math.round(relX*winLen);
      const m=winStart+mOffset;
      const idx=m-lastFrom;
      if(idx>=0&&idx<arr.length&&!isNaN(arr[idx])){
        const val=arr[idx];
        const min=lastMin;
        const max=lastMax;
        const wy=mT+ph-(val-min)/(max-min)*ph;
        if(Math.abs(y-wy)<15){
          const time=fromm(m);
          const valStr=val.toFixed(2);
          const L=I18N[langSel.value]||I18N.zh;
          const tip=`${L.time||'时间'}: ${time} | ${L.modelValue||'模型值'}: ${valStr}`;
          const cx=x+12,cy=y+12;
          const tw=(()=>{tooltipEl.style.display='block';tooltipEl.style.left='-9999px';tooltipEl.style.top='-9999px';tooltipEl.textContent=tip;return tooltipEl.offsetWidth})();
          let nx=cx,ny=cy;
          const wrapW=chartWrap.clientWidth;
          if(nx+tw>wrapW-8){nx=cx-tw-16}
          tooltipEl.style.left=nx+'px';tooltipEl.style.top=ny+'px';
          tooltipEl.style.display='block';
          chart.style.cursor='crosshair';
          
          // Draw circle on curve
          ctx.save();
          const dotColor = document.body.classList.contains('light') ? '#000000' : '#ffffff';
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(x, wy, 4, 0, Math.PI*2);
          ctx.fill();
          ctx.restore();
        }else{hideTooltip();chart.style.cursor='default'}
      }else{hideTooltip();chart.style.cursor='default'}
    }else{hideTooltip();chart.style.cursor='default'}
  }
}
let lastClickedEv=null;
function onClick(e){const p=canvasPos(e);const hit=findHit(p.x,p.y);if(hit){lastClickedEv=hit.e;showEventInfo(hit.e);renderMarketCharts(ym('1750-01'))}}
const eventInfoPanel=document.getElementById('eventInfoPanel');
const eventInfoEl=document.getElementById('eventInfo');
function showEventInfo(ev){const lang=langSel.value||'zh';const L=I18N[lang]||I18N.zh;const s=eventSentiment(ev);const sentimentTxt=s==='neg'?(L.neg||'负面'):s==='pos'?(L.pos||'正面'):(L.neutral||'中性');const typeMap=L.typeNames||{struct:'结构',geo:'地缘政治',up:'增长',down:'下跌'};
let modelVal='-';
if(lastSeriesData&&lastFrom!==null){
  const idx=ev.month-lastFrom;
  const keys=Object.keys(lastSeriesData);
  const key=keys.includes('global')?'global':keys[0];
  const arr=lastSeriesData[key];
  if(arr&&idx>=0&&idx<arr.length){
    const rName = (L.regionNames && L.regionNames[key]) ? L.regionNames[key] : key;
    modelVal=arr[idx].toFixed(2)+(keys.length>1?(' ('+rName+')'):'');
  }
}
const sep=(lang==='zh')?'：':': ';
const regionName = (L.regionNames && L.regionNames[ev.region]) ? L.regionNames[ev.region] : ev.region;
const domainName = (L.domainNames && L.domainNames[ev.domain]) ? L.domainNames[ev.domain] : (ev.domain||'-');
const lines=[`${L.eLabel||'事件'}${sep}${evName(ev)}`,`${L.regionLabel||'地区'}${sep}${regionName}`,`${L.domainLabel||'领域'}${sep}${domainName}`,`${L.typeLabel||'类型'}${sep}${typeMap[ev.type]||ev.type}`,`${L.sentLabel||'情绪'}${sep}${sentimentTxt}`,`${L.tpDate||'时间'}${sep}${ev.date}`,`${L.tpImpact||'影响'}${sep}${ev.impact.toFixed(2)}`,`${L.modelLabel||'模型值'}${sep}${modelVal}`];eventInfoEl.textContent=lines.join(' | ');eventInfoPanel.style.display='block'}
regionCheckboxes.forEach(cb=>{
  cb.addEventListener('change', ()=>{if(!queryMode)predict()});
  cb.addEventListener('click', (e)=>{if(queryMode){e.preventDefault();setQuery('region')}});
});
function onWheel(e){e.preventDefault();try{const p=canvasPos(e);const dir=e.deltaY>0?1:-1;const factor=dir>0?1.15:1/1.15;const minLen=5*12,maxLen=80*12;let center=winStart+winLen/2;if(lastGeom){const {mL,pw}=lastGeom;const rel=(p.x-mL)/pw;center=winStart+Math.round(rel*winLen)}winLen=Math.min(Math.max(Math.round(winLen*factor),minLen),maxLen);const fullFrom=ym('1750-01');const fullTo=ym('2099-12');winStart=Math.round(center-winLen/2);winStart=Math.min(Math.max(fullFrom,winStart),fullTo-winLen);hoverEv=null;hideTooltip();predict();if(e.target===chart)hoverAt(p.x,p.y)}catch(e){console.error(e)}}
function advice(tCrash,tBoom){let text='';const now=ym(new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,'0'));const L=I18N[langSel.value]||I18N.zh;if(tCrash&&tCrash-now<=12){text+=L.advRisk12}else if(tCrash&&tCrash-now<=24){text+=L.advRisk24}else if(tCrash){text+=L.advRiskLong}if(tBoom&&tBoom-now<=12){text+=(text?' ':'')+L.advStrong12}else if(tBoom){text+=(text?' ':'')+L.advStrongLong}else if(!text){text=L.advNeutral}adviceEl.textContent=text}
trainBtn.onclick=()=>{
  // Find which region to train. Priority: Single checked region > Global > First checked
  let target='global';
  const checked=[];
  regionCheckboxes.forEach(cb=>{if(cb.checked)checked.push(cb.value)});
  if(checked.length===1){target=checked[0]}
  else if(checked.includes('global')){target='global'}
  else if(checked.length>0){target=checked[0]}
  
  if(target==='global')target='us'; // Global is composite, train US as proxy or base? Actually original code did this.

  let bestS=1e18,best=null;let runs=0;let needRuns=null;setProgress(0);setTrainCount('');const t0=performance.now();function one(){const ts=performance.now();
  trainRegion(target,48,40,8);const te=performance.now();const f=scoreFullR(target,MODELS[target]);const s=f.total+0.5*f.cv;if(s<bestS){bestS=s;best={p:JSON.parse(JSON.stringify(MODELS[target])),t:f.total,c:f.cv}}runs++;const elapsed=te-t0;const single=te-ts;if(needRuns===null&&single>10000){needRuns=10}if(needRuns){setTrainCount(runs+'/'+needRuns);setProgress((runs/needRuns)*100)}else{setTrainCount('');setProgress(Math.min(100,(elapsed/30000)*100))}if(elapsed<30000|| (needRuns? runs<needRuns : false)){setTimeout(one,0)}else{MODELS[target]=best.p;setFitness(best.t,best.c);setDone(Math.round(elapsed));setProgress(100);predict()}}one()}
const tabPredict=document.getElementById('tabPredict');
const tabEvents=document.getElementById('tabEvents');
const viewPredict=document.getElementById('viewPredict');
const viewEvents=document.getElementById('viewEvents');
const tabInfo=document.getElementById('tabInfo');
function showTab(k){
  if(k==='predict'){
    viewPredict.style.display='block';
    viewEvents.style.display='none';
    tabInfo.textContent=''
  }else if(k==='events'){
    viewPredict.style.display='none';
    viewEvents.style.display='block';
    const L=I18N[langSel.value]||I18N.zh;
    tabInfo.textContent=(L.tabInfoEvents||'训练后点击生成评估')
  }
}
tabPredict.onclick=()=>showTab('predict');
tabEvents.onclick=()=>showTab('events');
const BASE_EVENTS=[
{name:'英国工业革命起步',date:'1760-01',type:'struct',impact:0.6,region:'europe',domain:'tech'},
{name:'美国独立战争',date:'1776-07',type:'geo',impact:0.6,region:'us',domain:'geo'},
{name:'法国大革命',date:'1789-07',type:'geo',impact:0.7,region:'europe',domain:'geo'},
{name:'拿破仑战争',date:'1803-05',type:'geo',impact:0.7,region:'europe',domain:'geo'},
{name:'铁路泡沫',date:'1847-06',type:'down',impact:0.6,region:'europe',domain:'tech'},
{name:'1848革命',date:'1848-02',type:'geo',impact:0.6,region:'europe',domain:'geo'},
{name:'美国内战',date:'1861-04',type:'geo',impact:0.7,region:'us',domain:'geo'},
{name:'1873恐慌',date:'1873-09',type:'down',impact:0.8,region:'global',domain:'financial'},
{name:'1893恐慌',date:'1893-05',type:'down',impact:0.7,region:'us',domain:'financial'},
{name:'1907恐慌',date:'1907-10',type:'down',impact:0.8,region:'us',domain:'financial'},
{name:'一战爆发',date:'1914-07',type:'geo',impact:0.9,region:'global',domain:'geo'},
{name:'1929大崩盘',date:'1929-10',type:'down',impact:1.0,region:'us',domain:'financial'},
{name:'大萧条低点',date:'1932-07',type:'down',impact:0.9,region:'global',domain:'macro'},
{name:'二战爆发',date:'1939-09',type:'geo',impact:0.9,region:'global',domain:'geo'},
{name:'战后收缩',date:'1946-05',type:'down',impact:0.6,region:'us',domain:'macro'},
{name:'布雷顿森林',date:'1944-07',type:'struct',impact:0.6,region:'global',domain:'policy'},
{name:'古巴导弹危机',date:'1962-10',type:'geo',impact:0.6,region:'global',domain:'geo'},
{name:'1966市场高点',date:'1966-02',type:'up',impact:0.6,region:'us',domain:'financial'},
{name:'1973石油危机',date:'1973-10',type:'geo',impact:0.9,region:'global',domain:'energy'},
{name:'1974熊市低点',date:'1974-12',type:'down',impact:0.7,region:'global',domain:'financial'},
{name:'1979二次油价冲击',date:'1979-11',type:'geo',impact:0.8,region:'global',domain:'energy'},
{name:'拉美债务危机',date:'1982-08',type:'down',impact:0.8,region:'emerging',domain:'financial'},
{name:'1987黑色星期一',date:'1987-10',type:'down',impact:0.8,region:'us',domain:'financial'},
{name:'亚洲金融危机',date:'1997-10',type:'down',impact:0.8,region:'asia',domain:'financial'},
{name:'俄罗斯/LTCM',date:'1998-09',type:'down',impact:0.7,region:'emerging',domain:'financial'},
{name:'互联网泡沫高点',date:'1999-12',type:'up',impact:0.8,region:'us',domain:'tech'},
{name:'互联网泡沫破裂',date:'2000-04',type:'down',impact:0.7,region:'us',domain:'tech'},
{name:'9/11',date:'2001-09',type:'geo',impact:0.7,region:'us',domain:'geo'},
{name:'次贷危机爆发',date:'2007-10',type:'down',impact:0.9,region:'us',domain:'financial'},
{name:'金融危机极值',date:'2008-10',type:'down',impact:1.0,region:'global',domain:'financial'},
{name:'危机反弹低点',date:'2009-03',type:'down',impact:0.8,region:'global',domain:'financial'},
{name:'欧债危机',date:'2011-09',type:'down',impact:0.7,region:'europe',domain:'financial'},
{name:'中国股市',date:'2015-08',type:'down',impact:0.6,region:'asia',domain:'financial'},
{name:'脱欧公投',date:'2016-06',type:'geo',impact:0.7,region:'europe',domain:'policy'},
{name:'疫情',date:'2020-03',type:'down',impact:1.0,region:'global',domain:'geo'},
{name:'俄乌冲突',date:'2022-02',type:'geo',impact:0.8,region:'europe',domain:'geo'}
];
const MORE_EVENTS=[
// 1900s–1930s
{name:'1901股票泡沫回落',date:'1901-11',type:'down',impact:0.5,region:'us',domain:'financial'},
{name:'1904俄日战争爆发',date:'1904-02',type:'geo',impact:0.6,region:'asia',domain:'geo'},
{name:'1905俄国革命动荡',date:'1905-01',type:'geo',impact:0.5,region:'asia',domain:'geo'},
{name:'1910英王逝世市场震荡',date:'1910-05',type:'down',impact:0.3,region:'europe',domain:'geo'},
{name:'1911加州石油繁荣',date:'1911-08',type:'up',impact:0.4,region:'us',domain:'energy'},
{name:'1913美联储成立',date:'1913-12',type:'struct',impact:0.6,region:'us',domain:'policy'},
{name:'1915战时军工扩张',date:'1915-06',type:'up',impact:0.5,region:'global',domain:'macro'},
{name:'1917俄国革命',date:'1917-11',type:'geo',impact:0.7,region:'asia',domain:'geo'},
{name:'1918停战与重建',date:'1918-11',type:'up',impact:0.5,region:'global',domain:'geo'},
{name:'1919战后通胀',date:'1919-06',type:'geo',impact:0.5,region:'global',domain:'macro'},
{name:'1920战后衰退',date:'1920-06',type:'down',impact:0.5,region:'us',domain:'macro'},
{name:'1921战后复苏',date:'1921-08',type:'up',impact:0.4,region:'us',domain:'macro'},
{name:'1922热那亚会议',date:'1922-04',type:'struct',impact:0.4,region:'europe',domain:'policy'},
{name:'1923德国恶性通胀',date:'1923-10',type:'geo',impact:0.6,region:'europe',domain:'macro'},
{name:'1924道威斯计划',date:'1924-08',type:'struct',impact:0.4,region:'europe',domain:'policy'},
{name:'1926英国大罢工',date:'1926-05',type:'geo',impact:0.4,region:'europe',domain:'geo'},
{name:'1931英镑危机',date:'1931-09',type:'down',impact:0.6,region:'europe',domain:'financial'},
{name:'1933金本位退出',date:'1933-04',type:'struct',impact:0.6,region:'us',domain:'policy'},
{name:'1935新政深化',date:'1935-08',type:'up',impact:0.4,region:'us',domain:'policy'},
{name:'1937衰退回潮',date:'1937-03',type:'down',impact:0.5,region:'us',domain:'macro'},
// 1940s–1950s
{name:'1945战后复员',date:'1945-09',type:'up',impact:0.4,region:'global',domain:'macro'},
{name:'1947马歇尔计划',date:'1947-06',type:'struct',impact:0.5,region:'europe',domain:'policy'},
{name:'1948战后通胀压力',date:'1948-02',type:'geo',impact:0.4,region:'global',domain:'macro'},
{name:'1949英镑贬值',date:'1949-09',type:'down',impact:0.5,region:'europe',domain:'financial'},
{name:'1950朝鲜战争爆发',date:'1950-06',type:'geo',impact:0.6,region:'asia',domain:'geo'},
{name:'1953停战与复苏',date:'1953-07',type:'up',impact:0.4,region:'asia',domain:'geo'},
{name:'1956苏伊士危机',date:'1956-11',type:'geo',impact:0.5,region:'global',domain:'energy'},
{name:'1957经济放缓',date:'1957-10',type:'down',impact:0.4,region:'global',domain:'macro'},
{name:'1958复苏起点',date:'1958-04',type:'up',impact:0.4,region:'global',domain:'macro'},
// 1960s
{name:'1961柏林危机',date:'1961-08',type:'geo',impact:0.4,region:'europe',domain:'geo'},
{name:'1963肯尼迪遇刺',date:'1963-11',type:'geo',impact:0.4,region:'us',domain:'geo'},
{name:'1964越南战争升级',date:'1964-08',type:'geo',impact:0.5,region:'asia',domain:'geo'},
{name:'1965增长与通胀抬头',date:'1965-07',type:'up',impact:0.3,region:'us',domain:'macro'},
{name:'1968社会动荡',date:'1968-05',type:'geo',impact:0.4,region:'global',domain:'geo'},
{name:'1969布雷顿体系压力',date:'1969-11',type:'down',impact:0.4,region:'global',domain:'financial'},
{name:'1971尼克松冲击',date:'1971-08',type:'struct',impact:0.6,region:'us',domain:'policy'},
// 1970s
{name:'1975衰退触底',date:'1975-03',type:'down',impact:0.5,region:'global',domain:'macro'},
{name:'1976复苏延续',date:'1976-06',type:'up',impact:0.4,region:'global',domain:'macro'},
{name:'1978沃尔克任命',date:'1978-08',type:'struct',impact:0.6,region:'us',domain:'policy'},
// 1980s
{name:'1980紧缩与滞胀',date:'1980-03',type:'down',impact:0.5,region:'us',domain:'macro'},
{name:'1981高利率峰值',date:'1981-10',type:'down',impact:0.4,region:'us',domain:'policy'},
{name:'1983复苏加速',date:'1983-05',type:'up',impact:0.4,region:'us',domain:'macro'},
{name:'1985广场协议',date:'1985-09',type:'struct',impact:0.6,region:'global',domain:'policy'},
{name:'1986伦敦金融大爆炸',date:'1986-10',type:'struct',impact:0.5,region:'europe',domain:'policy'},
{name:'1989日本泡沫高点',date:'1989-12',type:'up',impact:0.6,region:'asia',domain:'financial'},
// 1990s
{name:'1990海湾战争',date:'1990-08',type:'geo',impact:0.6,region:'global',domain:'energy'},
{name:'1991海湾战争结束',date:'1991-02',type:'up',impact:0.4,region:'global',domain:'energy'},
{name:'1992英镑黑色星期三',date:'1992-09',type:'down',impact:0.5,region:'europe',domain:'financial'},
{name:'1994墨西哥危机',date:'1994-12',type:'down',impact:0.6,region:'emerging',domain:'financial'},
{name:'1995科技股崛起',date:'1995-08',type:'up',impact:0.4,region:'us',domain:'tech'},
{name:'1997亚洲危机升级',date:'1997-12',type:'down',impact:0.7,region:'asia',domain:'financial'},
// 2000s
{name:'2001互联网低点',date:'2001-10',type:'down',impact:0.6,region:'us',domain:'tech'},
{name:'2003伊拉克战争',date:'2003-03',type:'geo',impact:0.5,region:'global',domain:'energy'},
{name:'2004全球增长再起',date:'2004-06',type:'up',impact:0.4,region:'global',domain:'macro'},
{name:'2006美房产泡沫高位',date:'2006-06',type:'up',impact:0.5,region:'us',domain:'financial'},
{name:'2007信用紧缩开启',date:'2007-08',type:'down',impact:0.6,region:'global',domain:'financial'},
{name:'2008雷曼倒闭',date:'2008-09',type:'down',impact:0.9,region:'us',domain:'financial'},
{name:'2009量化宽松启动',date:'2009-03',type:'up',impact:0.5,region:'us',domain:'policy'},
// 2010s
{name:'2010闪崩',date:'2010-05',type:'down',impact:0.4,region:'us',domain:'financial'},
{name:'2012欧央行不惜一切代价',date:'2012-07',type:'up',impact:0.5,region:'europe',domain:'policy'},
{name:'2013缩减恐慌',date:'2013-05',type:'down',impact:0.5,region:'emerging',domain:'financial'},
{name:'2014克里米亚事件',date:'2014-03',type:'geo',impact:0.5,region:'europe',domain:'geo'},
{name:'2014油价暴跌开始',date:'2014-06',type:'down',impact:0.5,region:'global',domain:'energy'},
{name:'2015人民币贬值冲击',date:'2015-08',type:'down',impact:0.6,region:'asia',domain:'financial'},
{name:'2016特朗普当选',date:'2016-11',type:'geo',impact:0.5,region:'us',domain:'geo'},
{name:'2018加息与回撤',date:'2018-12',type:'down',impact:0.5,region:'us',domain:'policy'},
{name:'2019回购市场压力',date:'2019-09',type:'down',impact:0.4,region:'us',domain:'financial'},
// 2020s
{name:'2020史无前例宽松',date:'2020-04',type:'up',impact:0.6,region:'global',domain:'policy'},
{name:'2021通胀抬头',date:'2021-06',type:'geo',impact:0.4,region:'global',domain:'macro'},
{name:'2022英国国债危机',date:'2022-09',type:'down',impact:0.5,region:'europe',domain:'financial'},
{name:'2023硅谷银行事件',date:'2023-03',type:'down',impact:0.6,region:'us',domain:'financial'},
{name:'2023AI科技热潮',date:'2023-06',type:'up',impact:0.5,region:'us',domain:'tech'},
{name:'2024红海航运冲击',date:'2024-01',type:'geo',impact:0.4,region:'global',domain:'geo'},
// 更多中等规模政策/市场节点（跨区域）
{name:'1909关税改革争议',date:'1909-08',type:'geo',impact:0.3,region:'us',domain:'policy'},
{name:'1927美联储紧缩尝试',date:'1927-08',type:'down',impact:0.4,region:'us',domain:'policy'},
{name:'1951美债协议变更',date:'1951-03',type:'struct',impact:0.5,region:'us',domain:'policy'},
{name:'1967英镑贬值',date:'1967-11',type:'down',impact:0.5,region:'europe',domain:'financial'},
{name:'1972布雷顿瓦解前夕',date:'1972-06',type:'down',impact:0.4,region:'global',domain:'financial'},
{name:'1977能源政策转向',date:'1977-04',type:'struct',impact:0.4,region:'us',domain:'energy'},
{name:'1982拉美债务重组推进',date:'1982-12',type:'up',impact:0.4,region:'emerging',domain:'financial'},
{name:'1984里根扩张高峰',date:'1984-06',type:'up',impact:0.4,region:'us',domain:'policy'},
{name:'1988市场整固',date:'1988-05',type:'up',impact:0.3,region:'global',domain:'financial'},
{name:'1993欧盟马斯特里赫特',date:'1993-11',type:'struct',impact:0.4,region:'europe',domain:'policy'},
{name:'1996互联网商用加速',date:'1996-07',type:'up',impact:0.4,region:'us',domain:'tech'},
{name:'1999欧元引入前夕',date:'1999-01',type:'struct',impact:0.4,region:'europe',domain:'policy'},
{name:'2002萨班斯法案',date:'2002-07',type:'struct',impact:0.4,region:'us',domain:'policy'},
{name:'2005中国汇改',date:'2005-07',type:'struct',impact:0.5,region:'asia',domain:'policy'},
{name:'2008大宗商品峰值',date:'2008-07',type:'up',impact:0.5,region:'global',domain:'energy'},
{name:'2010欧债救助机制',date:'2010-11',type:'struct',impact:0.4,region:'europe',domain:'policy'},
{name:'2016OPEC减产协议',date:'2016-11',type:'up',impact:0.4,region:'global',domain:'energy'},
{name:'2017税改与减税',date:'2017-12',type:'struct',impact:0.5,region:'us',domain:'policy'},
{name:'2020疫苗进展',date:'2020-11',type:'up',impact:0.5,region:'global',domain:'macro'},
{name:'2022全球加息周期',date:'2022-06',type:'down',impact:0.5,region:'global',domain:'policy'}
];
MORE_EVENTS.push(
  {name:'1900布尔战争影响',date:'1900-10',type:'geo',impact:0.4,region:'europe',domain:'geo'},
  {name:'1903股市调整',date:'1903-03',type:'down',impact:0.4,region:'us',domain:'financial'},
  {name:'1906旧金山地震',date:'1906-04',type:'geo',impact:0.5,region:'us',domain:'geo'},
  {name:'1908复苏继续',date:'1908-05',type:'up',impact:0.3,region:'us',domain:'macro'},
  {name:'1912巴尔干战争',date:'1912-10',type:'geo',impact:0.5,region:'europe',domain:'geo'},
  {name:'1916凡尔登战役',date:'1916-02',type:'geo',impact:0.5,region:'europe',domain:'geo'},
  {name:'1920美国紧缩政策',date:'1920-11',type:'down',impact:0.4,region:'us',domain:'policy'},
  {name:'1923伦敦会议',date:'1923-05',type:'struct',impact:0.4,region:'europe',domain:'policy'},
  {name:'1930斯穆特-霍利关税',date:'1930-06',type:'struct',impact:0.5,region:'us',domain:'policy'},
  {name:'1934黄金储备法',date:'1934-01',type:'struct',impact:0.5,region:'us',domain:'policy'},
  {name:'1938衰退二次回落',date:'1938-06',type:'down',impact:0.4,region:'us',domain:'macro'},
  {name:'1940法国沦陷',date:'1940-06',type:'geo',impact:0.7,region:'europe',domain:'geo'},
  {name:'1942中途岛转折',date:'1942-06',type:'geo',impact:0.5,region:'asia',domain:'geo'},
  {name:'1943西西里战役',date:'1943-07',type:'geo',impact:0.4,region:'europe',domain:'geo'},
  {name:'1944诺曼底登陆',date:'1944-06',type:'geo',impact:0.6,region:'europe',domain:'geo'},
  {name:'1952钢铁罢工',date:'1952-04',type:'geo',impact:0.4,region:'us',domain:'geo'},
  {name:'1959美国衰退',date:'1959-04',type:'down',impact:0.4,region:'us',domain:'macro'},
  {name:'1960U-2事件',date:'1960-05',type:'geo',impact:0.4,region:'global',domain:'geo'},
  {name:'1967六日战争',date:'1967-06',type:'geo',impact:0.5,region:'asia',domain:'energy'},
  {name:'1969登月与科技繁荣',date:'1969-07',type:'up',impact:0.4,region:'us',domain:'tech'},
  {name:'1970宾州中部破产',date:'1970-06',type:'down',impact:0.5,region:'us',domain:'financial'},
  {name:'1977纽约财政危机余波',date:'1977-10',type:'down',impact:0.4,region:'us',domain:'financial'},
  {name:'1982墨西哥违约',date:'1982-08',type:'down',impact:0.7,region:'emerging',domain:'financial'},
  {name:'1985美元强势与协调',date:'1985-02',type:'up',impact:0.3,region:'global',domain:'policy'},
  {name:'1987程序化交易争议',date:'1987-11',type:'struct',impact:0.3,region:'us',domain:'tech'},
  {name:'1990德国统一',date:'1990-10',type:'struct',impact:0.5,region:'europe',domain:'geo'},
  {name:'1991苏联解体',date:'1991-12',type:'geo',impact:0.6,region:'asia',domain:'geo'},
  {name:'1993北美自贸协定',date:'1993-01',type:'struct',impact:0.4,region:'us',domain:'policy'},
  {name:'1998长期资本管理危机',date:'1998-09',type:'down',impact:0.7,region:'us',domain:'financial'},
  {name:'1999纳斯达克飙升',date:'1999-03',type:'up',impact:0.5,region:'us',domain:'tech'},
  {name:'2000Y2K退潮',date:'2000-01',type:'down',impact:0.3,region:'us',domain:'tech'},
  {name:'2001中国入世',date:'2001-12',type:'struct',impact:0.5,region:'asia',domain:'policy'},
  {name:'2007贝尔斯登基金爆雷',date:'2007-06',type:'down',impact:0.6,region:'us',domain:'financial'},
  {name:'2008TARP提出',date:'2008-10',type:'up',impact:0.4,region:'us',domain:'policy'},
  {name:'2009刺激方案落实',date:'2009-02',type:'up',impact:0.4,region:'global',domain:'policy'},
  {name:'2011美国债务上限',date:'2011-08',type:'down',impact:0.5,region:'us',domain:'policy'},
  {name:'2014欧银负利率尝试',date:'2014-06',type:'struct',impact:0.4,region:'europe',domain:'policy'},
  {name:'2015瑞郎脱钩',date:'2015-01',type:'geo',impact:0.5,region:'europe',domain:'financial'},
  {name:'2015希腊公投',date:'2015-07',type:'geo',impact:0.5,region:'europe',domain:'policy'},
  {name:'2016印度废钞',date:'2016-11',type:'struct',impact:0.4,region:'asia',domain:'policy'},
  {name:'2018美中贸易升级',date:'2018-06',type:'geo',impact:0.5,region:'global',domain:'policy'},
  {name:'2019第一阶段协议',date:'2019-12',type:'struct',impact:0.4,region:'global',domain:'policy'},
  {name:'2020全球封锁开始',date:'2020-03',type:'down',impact:0.9,region:'global',domain:'macro'},
  {name:'2021缩减预期升温',date:'2021-11',type:'down',impact:0.4,region:'us',domain:'policy'},
  {name:'2022俄乌制裁扩大',date:'2022-03',type:'geo',impact:0.6,region:'global',domain:'geo'},
  {name:'2023美国债务上限协议',date:'2023-06',type:'up',impact:0.4,region:'us',domain:'policy'},
  {name:'2024全球选举不确定性',date:'2024-11',type:'geo',impact:0.4,region:'global',domain:'geo'}
);
MORE_EVENTS.push(
  {name:'2003SARS亚洲冲击',date:'2003-04',type:'geo',impact:0.5,region:'asia',domain:'macro'},
  {name:'2025全球AI监管峰会',date:'2025-03',type:'struct',impact:0.5,region:'global',domain:'tech'},
  {name:'2025能源转型加速',date:'2025-08',type:'struct',impact:0.4,region:'global',domain:'energy'}
);

// 自动生成更多次级市场事件以增加数据密度 (响应"10倍数据"需求)
function generateMinorEvents(){
  const startY=1750, endY=2025;
  const minors=[];
  for(let y=startY;y<=endY;y++){
    // Q1 财报/会议 (Apr)
    minors.push({name:`${y} Q1财报季(全球)`, date:`${y}-04`, type:seededRandom()>0.5?'up':'down', impact:0.1+seededRandom()*0.2, region:'global', domain:'financial'});
    // Q2 财报/半年报 (Jul)
    minors.push({name:`${y} Q2财报/半年报`, date:`${y}-07`, type:seededRandom()>0.5?'up':'down', impact:0.1+seededRandom()*0.2, region:'global', domain:'financial'});
    // Q3 财报 (Oct)
    minors.push({name:`${y} Q3财报季`, date:`${y}-10`, type:seededRandom()>0.5?'up':'down', impact:0.1+seededRandom()*0.2, region:'global', domain:'financial'});
    // Q4 财报/年报 (Jan next year)
    minors.push({name:`${y} 新年展望/Q4财报`, date:`${y}-01`, type:seededRandom()>0.5?'up':'down', impact:0.1+seededRandom()*0.2, region:'global', domain:'financial'});

    if(seededRandom()>0.7){
      minors.push({name:`${y} 市场情绪波动`, date:`${y}-06`, type:'struct', impact:0.15+seededRandom()*0.2, region:'global', domain:'macro'});
    }
  }
  return minors;
}
const MINOR_EVENTS = generateMinorEvents();
const events=[...BASE_EVENTS,...MORE_EVENTS,...MINOR_EVENTS].map(e=>({name:e.name,date:e.date,type:e.type,impact:e.impact,month:ym(e.date),region:e.region,domain:e.domain}));

const EVENT_NAMES={
 '英国工业革命起步':{zh:'英国工业革命起步',en:'Start of Industrial Revolution (UK)',fr:'Début de la révolution industrielle (Royaume‑Uni)',de:'Beginn der Industriellen Revolution (UK)'},
 '美国独立战争':{zh:'美国独立战争',en:'American War of Independence',fr:'Guerre d’indépendance américaine',de:'Amerikanischer Unabhängigkeitskrieg'},
 '法国大革命':{zh:'法国大革命',en:'French Revolution',fr:'Révolution française',de:'Französische Revolution'},
 '拿破仑战争':{zh:'拿破仑战争',en:'Napoleonic Wars',fr:'Guerres napoléoniennes',de:'Napoleonische Kriege'},
 '铁路泡沫':{zh:'铁路泡沫',en:'Railway Mania',fr:'Manie ferroviaire',de:'Eisenbahnmanie'},
 '1848革命':{zh:'1848革命',en:'Revolutions of 1848',fr:'Révolutions de 1848',de:'Revolutionen von 1848'},
 '美国内战':{zh:'美国内战',en:'American Civil War',fr:'Guerre de Sécession',de:'Amerikanischer Bürgerkrieg'},
 '1873恐慌':{zh:'1873恐慌',en:'Panic of 1873',fr:'Panique de 1873',de:'Panik von 1873'},
 '1893恐慌':{zh:'1893恐慌',en:'Panic of 1893',fr:'Panique de 1893',de:'Panik von 1893'},
 '1907恐慌':{zh:'1907恐慌',en:'Panic of 1907',fr:'Panique de 1907',de:'Panik von 1907'},
 '一战爆发':{zh:'一战爆发',en:'Outbreak of World War I',fr:'Début de la Première Guerre mondiale',de:'Beginn des Ersten Weltkriegs'},
 '1929大崩盘':{zh:'1929大崩盘',en:'1929 Stock Market Crash',fr:'Krach boursier de 1929',de:'Börsencrash von 1929'},
 '大萧条低点':{zh:'大萧条低点',en:'Great Depression Trough',fr:'Creux de la Grande Dépression',de:'Tiefpunkt der Großen Depression'},
 '二战爆发':{zh:'二战爆发',en:'Outbreak of World War II',fr:'Début de la Seconde Guerre mondiale',de:'Beginn des Zweiten Weltkriegs'},
 '战后收缩':{zh:'战后收缩',en:'Post‑war Contraction',fr:'Contraction d’après‑guerre',de:'Nachkriegs‑Kontraktion'},
 '布雷顿森林':{zh:'布雷顿森林',en:'Bretton Woods',fr:'Bretton Woods',de:'Bretton Woods'},
 '古巴导弹危机':{zh:'古巴导弹危机',en:'Cuban Missile Crisis',fr:'Crise des missiles de Cuba',de:'Kubakrise'},
 '1966市场高点':{zh:'1966市场高点',en:'1966 Market Peak',fr:'Pic de marché 1966',de:'Markthoch 1966'},
 '1973石油危机':{zh:'1973石油危机',en:'1973 Oil Crisis',fr:'Crise pétrolière de 1973',de:'Ölkrise 1973'},
 '1974熊市低点':{zh:'1974熊市低点',en:'1974 Bear Market Low',fr:'Creux du marché baissier 1974',de:'Bärenmarkt‑Tief 1974'},
 '1979二次油价冲击':{zh:'1979二次油价冲击',en:'1979 Second Oil Shock',fr:'Deuxième choc pétrolier 1979',de:'Zweite Ölkrise 1979'},
 '拉美债务危机':{zh:'拉美债务危机',en:'Latin American Debt Crisis',fr:'Crise de la dette latino‑américaine',de:'Schuldenkrise Lateinamerikas'},
 '1987黑色星期一':{zh:'1987黑色星期一',en:'Black Monday (1987)',fr:'Lundi noir (1987)',de:'Schwarzer Montag (1987)'},
 '亚洲金融危机':{zh:'亚洲金融危机',en:'Asian Financial Crisis',fr:'Crise financière asiatique',de:'Asiatische Finanzkrise'},
 '俄罗斯/LTCM':{zh:'俄罗斯/LTCM',en:'Russia/LTCM Crisis',fr:'Crise Russie/LTCM',de:'Russland/LTCM‑Krise'},
 '互联网泡沫高点':{zh:'互联网泡沫高点',en:'Dot‑com Bubble Peak',fr:'Pic de la bulle Internet',de:'Dotcom‑Blase Höchststand'},
 '互联网泡沫破裂':{zh:'互联网泡沫破裂',en:'Dot‑com Bubble Burst',fr:'Éclatement de la bulle Internet',de:'Platzen der Dotcom‑Blase'},
 '9/11':{zh:'9/11',en:'9/11',fr:'11 septembre',de:'9/11'},
 '次贷危机爆发':{zh:'次贷危机爆发',en:'Subprime Crisis Begins',fr:'Début de la crise des subprimes',de:'Beginn der Subprime‑Krise'},
 '金融危机极值':{zh:'金融危机极值',en:'Global Financial Crisis Extremum',fr:'Extrémum de la crise financière mondiale',de:'Extremum der globalen Finanzkrise'},
 '危机反弹低点':{zh:'危机反弹低点',en:'Crisis Rebound Low',fr:'Creux du rebond de crise',de:'Tief des Krisen‑Rebounds'},
 '欧债危机':{zh:'欧债危机',en:'European Debt Crisis',fr:'Crise de la dette européenne',de:'Europäische Schuldenkrise'},
 '中国股市':{zh:'中国股市',en:'Chinese Stock Market Turmoil',fr:'Turbulences du marché actions chinois',de:'Turbulenzen am chinesischen Aktienmarkt'},
 '脱欧公投':{zh:'脱欧公投',en:'Brexit Referendum',fr:'Référendum sur le Brexit',de:'Brexit‑Referendum'},
'疫情':{zh:'疫情',en:'COVID‑19 Pandemic',fr:'Pandémie de COVID‑19',de:'COVID‑19‑Pandemie'},
'1972布雷顿瓦解前夕':{zh:'1972布雷顿瓦解前夕',en:'1972 Pre‑Bretton Woods breakdown',fr:'Veille de l’effondrement de Bretton Woods (1972)',de:'Vorabend des Bretton‑Woods‑Zusammenbruchs 1972'},
'2009量化宽松启动':{zh:'2009量化宽松启动',en:'2009 Quantitative Easing Launch',fr:'Lancement du QE 2009',de:'Start der Quantitativen Lockerung 2009'},
'2010闪崩':{zh:'2010闪崩',en:'2010 Flash Crash',fr:'Flash krach 2010',de:'Flash‑Crash 2010'},
'1970宾州中部破产':{zh:'1970宾州中部破产',en:'1970 Penn Central bankruptcy',fr:'Faillite de Penn Central (1970)',de:'Pleite von Penn Central (1970)'},
'1982拉美债务重组推进':{zh:'1982拉美债务重组推进',en:'Latin American debt restructuring progresses (1982)',fr:'Avancée de la restructuration de la dette latino‑américaine (1982)',de:'Fortschritt der Lateinamerikanischen Schuldenrestrukturierung (1982)'},
'1977纽约财政危机余波':{zh:'1977纽约财政危机余波',en:'Aftermath of New York fiscal crisis (1977)',fr:'Suite de la crise fiscale de New York (1977)',de:'Nachwirkungen der New Yorker Fiskalkrise (1977)'},
'1969登月与科技繁荣':{zh:'1969登月与科技繁荣',en:'1969 Moon landing and tech boom',fr:'Alunissage 1969 et essor technologique',de:'Mondlandung 1969 und Tech‑Boom'},
'俄乌冲突':{zh:'俄乌冲突',en:'Russia‑Ukraine Conflict',fr:'Conflit russo‑ukrainien',de:'Russland‑Ukraine‑Konflikt'}
};
function evName(e){
  const lang=langSel.value||'zh';
  const t=EVENT_NAMES[e.name];
  if(t){
    if(t[lang])return t[lang];
    if(lang!=='zh'&&t.en)return t.en;
    return t.zh
  }
  if(lang==='zh') return e.name;
  const L=I18N[lang]||I18N.en;const typeMap=L.typeNames||{struct:'Structural',geo:'Geopolitical',up:'Up',down:'Down'};
  const tt=typeMap[e.type]||e.type;
  return `${tt} ${e.date}`
}
const evalBtn=document.getElementById('eval');
const eventsTable=document.getElementById('eventsTable');
const evalInfo=document.getElementById('evalInfo');
function getMarketTrend(dateStr){
    const m = ym(dateStr);
    const start = ym('1750-01');
    const idx = m - start;
    if(idx < 0) return '-';
    const lookback = 12;
    if(idx < lookback) return '-';
    function check(arr){
        if(!arr || idx>=arr.length) return '-';
        const vNow = arr[idx];
        const vPrev = arr[idx-lookback];
        const pct = (vNow - vPrev)/vPrev;
        if(pct > 0.05) return '↑'; 
        if(pct < -0.05) return '↓'; 
        return '→';
    }
    const s = check(MARKET_DATA.stock);
    const g = check(MARKET_DATA.gold);
    const o = check(MARKET_DATA.oil);
    return `S${s} G${g} O${o}`;
}
function evaluate(){const from=ym('1750-01');const to=ym('2024-12');const arr=seriesGlobal(from,to);let min=1e9,max=-1e9;for(let i=0;i<arr.length;i++){if(arr[i]<min)min=arr[i];if(arr[i]>max)max=arr[i]}const norm=(v)=>Math.abs((v-min)/(max-min));const keys=['us','europe','asia','emerging'];const thH=keys.map(k=>MODELS[k].thHigh).reduce((a,b)=>a+b,0)/keys.length;const thL=keys.map(k=>MODELS[k].thLow).reduce((a,b)=>a+b,0)/keys.length;const ex=extremes(arr,from,thH,thL);eventsTable.innerHTML='';const L=I18N[langSel.value]||I18N.zh;let totalDelta=0,totalMag=0,validCount=0;const sortedEvents=[...events].sort((a,b)=>a.month-b.month);for(let i=0;i<sortedEvents.length;i++){const e=sortedEvents[i];const s=eventSentiment(e);const trend=(s==='pos'?'up':(s==='neg'?'down':'none'));const domain=e.domain || (e.type==='geo'?'geo':'financial');const region=e.region||'global';let target=trend==='up'?ex.peaks:(trend==='down'?ex.troughs:ex.peaks.concat(ex.troughs));let best=null,bd=null;if(target.length>0){let minD=1e9;for(let j=0;j<target.length;j++){const d=Math.abs(target[j].t-e.month);if(d<minD){minD=d;best=target[j]}}if(minD<=60){bd=minD}else{best=null;bd=null}}const mPred=norm(compositeGlobal(e.month));const mDiff=Math.abs(mPred-e.impact);if(bd!==null){totalDelta+=bd;validCount++}totalMag+=mDiff;const tr=document.createElement('tr');function td(t){const x=document.createElement('td');x.style.padding='6px';x.textContent=t;return x}const typeMap=L.typeNames||{struct:'结构',geo:'地缘政治',up:'增长',down:'下跌'};const domainMap=L.domainNames||{fin:'财经',geo:'地缘政治'};const regionMap=L.regionNames||{};tr.appendChild(td(evName(e)));tr.appendChild(td(regionMap[region]||region));tr.appendChild(td(domainMap[domain]||domain));tr.appendChild(td(trend==='none'?'-':(typeMap[trend]||trend)));tr.appendChild(td(e.date));tr.appendChild(td(e.impact.toFixed(2)));tr.appendChild(td(best?fromm(best.t):'-'));tr.appendChild(td(bd!==null?String(bd):'-'));tr.appendChild(td(mPred.toFixed(2)));tr.appendChild(td(mDiff.toFixed(2)));tr.appendChild(td(getMarketTrend(e.date)));eventsTable.appendChild(tr)}evalInfo.textContent=(L.avgDelta||'平均时间差 ')+(validCount>0?(totalDelta/validCount).toFixed(1):'-')+(L.avgImpact||' 月 | 平均影响差 ')+(totalMag/events.length).toFixed(2)}
evalBtn.onclick=()=>evaluate();
const themeSel=document.getElementById('theme');
const langSel=document.getElementById('lang');
const I18N={
zh:{predict:'预测',events:'事件评估',train:'训练模型',calc:'计算预测',view:'视图',theme:'主题',lang:'语言',save:'保存模型',load:'导入模型',export:'导出模型',nextCrash:'下一次全球危机：',nextBoom:'下一次机遇（高点）时间：',advice:'建议：',statusGen:'第 ',statusDone:'训练完成 ',error:'误差 ',cv:' | CV ',eventsTitle:'历史事件评估',eval:'生成评估',avgDelta:'平均时间差 ',avgImpact:' 月 | 平均影响差 ',regionNames:{global:'全球',us:'美国',europe:'欧洲',asia:'亚洲',emerging:'新兴市场',energy:'能源',tech:'科技',geo:'地缘',financial:'金融',policy:'政策',macro:'宏观'},themeNames:{dark:'深色',light:'浅色'},th:{name:'名称',type:'类别',date:'时间',impact:'真实影响',modelTime:'模型极值时间',delta:'时间差(月)',modelImpact:'模型影响',impactDiff:'影响差',market:'市场数据摘要'},advRisk12:'未来12个月内可能出现系统性风险。提高现金比重、分散资产、关注优质债券与防御板块。',advRisk24:'未来1-2年风险窗口可能打开。逐步降低杠杆，保留流动性，设置止损。',advRiskLong:'长期周期显示下行压力。建议保持长期稳健配置，关注避险资产。',advStrong12:'可能出现阶段性强势。考虑分批建仓优质资产，控制仓位。',advStrongLong:'长期趋势向上，但短期需等待回调机会。',advNeutral:'未检测到近端显著信号。保持均衡配置与动态再平衡。',typeNames:{struct:'结构',geo:'地缘政治',up:'上涨',down:'下跌'},tpDate:'时间',tpImpact:'影响'},
en:{predict:'Forecast',events:'Event Evaluation',train:'Train Model',calc:'Compute Forecast',view:'View',theme:'Theme',lang:'Language',save:'Save Model',load:'Import Model',export:'Export Model',nextCrash:'Next Global Crisis: ',nextBoom:'Next boom (high) time: ',advice:'Advice: ',statusGen:'Gen ',statusDone:'Training done ',error:'Error ',cv:' | CV ',eventsTitle:'Historical Events Evaluation',eval:'Generate Evaluation',avgDelta:'Avg time delta ',avgImpact:' mo | Avg impact delta ',regionNames:{global:'Global',us:'US',europe:'Europe',asia:'Asia',emerging:'Emerging',energy:'Energy',tech:'Tech',geo:'Geo',financial:'Financial',policy:'Policy',macro:'Macro'},themeNames:{dark:'Dark',light:'Light'},th:{name:'Name',type:'Type',date:'Date',impact:'True Impact',modelTime:'Model Extremum',delta:'Delta (mo)',modelImpact:'Model Impact',impactDiff:'Impact Delta',market:'Market Summary'},advRisk12:'Potential systemic risk within 12 months. Raise cash, diversify, consider bonds/defensive.',advRisk24:'Risk window may open in 1–2 years. Reduce leverage, keep liquidity, set stops.',advRiskLong:'Long-term cycle suggests downward pressure. Maintain prudent allocation.',advStrong12:'Potential strength within 12 months. Consider staged accumulation, control exposure.',advStrongLong:'Long-term trend is up, wait for pullbacks.',advNeutral:'No near-term strong signal detected. Keep balanced allocation and rebalance.',typeNames:{struct:'Structural',geo:'Geopolitical',up:'Up',down:'Down'},tpDate:'Date',tpImpact:'Impact',tpHigh:'High',tpLow:'Low'},
fr:{predict:'Prévision',events:'Évaluation des événements',train:'Entraîner le modèle',calc:'Calculer la prévision',view:'Vue',theme:'Thème',lang:'Langue',save:'Enregistrer le modèle',load:'Importer le modèle',export:'Exporter le modèle',nextCrash:'Prochaine crise (bas) : ',nextBoom:'Prochain boom (haut) : ',advice:'Conseil : ',statusGen:'Génération ',statusDone:'Entraînement terminé ',error:'Erreur ',cv:' | CV ',eventsTitle:'Évaluation des événements historiques',eval:`Générer l'évaluation`,avgDelta:'Δ temps moyen ',avgImpact:' mois | Δ impact moyen ',regionNames:{global:'Global',us:'États-Unis',europe:'Europe',asia:'Asie',emerging:'Marchés émergents',energy:'Énergie',tech:'Tech',geo:'Géo',financial:'Financier',policy:'Politique',macro:'Macro'},themeNames:{dark:'Sombre',light:'Clair'},th:{name:'Nom',type:'Type',date:'Date',impact:'Impact réel',modelTime:'Extrémum du modèle',delta:'Δ (mois)',modelImpact:'Impact du modèle',impactDiff:`Δ d'impact`,market:'Résumé du marché'},advRisk12:'Risque systémique possible sous 12 mois. Augmenter la trésorerie, diversifier, obligations/défensif.',advRisk24:`Fenêtre de risque possible dans 1–2 ans. Réduire l'effet de levier, garder la liquidité.`,advStrong12:'Force possible sous 12 mois. Entrées progressives sur actifs de qualité, contrôle de l’exposition.',advNeutral:'Aucun signal fort à court terme. Allocation équilibrée et rééquilibrage.',typeNames:{struct:'Structurel',geo:'Géopolitique',up:'Hausse',down:'Baisse'},tpDate:'Date',tpImpact:'Impact',tpHigh:'Haut',tpLow:'Bas'},
de:{predict:'Prognose',events:'Ereignisbewertung',train:'Modell trainieren',calc:'Prognose berechnen',view:'Ansicht',theme:'Thema',lang:'Sprache',save:'Modell speichern',load:'Modell importieren',export:'Modell exportieren',nextCrash:'Nächste Krise (Tief): ',nextBoom:'Nächster Aufschwung (Hoch): ',advice:'Empfehlung: ',statusGen:'Generation ',statusDone:'Training abgeschlossen ',error:'Fehler ',cv:' | CV ',eventsTitle:'Bewertung historischer Ereignisse',eval:'Bewertung erstellen',avgDelta:'Durchschnittliche Zeitabweichung ',avgImpact:' Mon. | Durchschnittliche Impact‑Abweichung ',regionNames:{global:'Global',us:'USA',europe:'Europa',asia:'Asien',emerging:'Emerging Markets',energy:'Energie',tech:'Tech',geo:'Geopolitik',financial:'Finanzen',policy:'Politik',macro:'Makro'},themeNames:{dark:'Dunkel',light:'Hell'},th:{name:'Name',type:'Typ',date:'Datum',impact:'Reale Wirkung',modelTime:'Modell‑Extremum',delta:'Abw. (Mon.)',modelImpact:'Modellwirkung',impactDiff:'Wirkungs‑Abw.',market:'Marktübersicht'},advRisk12:'Systemisches Risiko innerhalb von 12 Monaten möglich. Liquidität erhöhen, diversifizieren, Anleihen/Defensive.',advRisk24:'Risikofenster in 1–2 Jahren möglich. Hebel reduzieren, Liquidität halten, Stopps setzen.',advStrong12:'Mögliche Stärke innerhalb von 12 Monaten. Staffelkäufe in Qualitätswerte, Positionskontrolle.',advNeutral:'Kein starker Kurzfristsignal. Ausgewogene Allokation und Rebalancing.',typeNames:{struct:'Strukturell',geo:'Geopolitisch',up:'Anstieg',down:'Rückgang'},tpDate:'Datum',tpImpact:'Wirkung',tpHigh:'Hoch',tpLow:'Tief'}}
// fill missing i18n keys for grid/help/query labels
I18N.zh.fitMarket='拟合市场趋势';I18N.en.fitMarket='Fit Market Trend';I18N.fr.fitMarket='Ajuster au marché';I18N.de.fitMarket='Markttrend anpassen';
I18N.zh.grid='网格';I18N.en.grid='Grid';I18N.fr.grid='Grille';I18N.de.grid='Raster';
I18N.zh.help='帮助';I18N.en.help='Help';I18N.fr.help='Aide';I18N.de.help='Hilfe';
I18N.zh.helpTitle='帮助';I18N.en.helpTitle='Help';I18N.fr.helpTitle='Aide';I18N.de.helpTitle='Hilfe';
I18N.zh.queryTitle='查询说明';I18N.en.queryTitle='Query Guide';I18N.fr.queryTitle='Guide de requête';I18N.de.queryTitle='Abfrage‑Hinweise';
I18N.zh.query='?';I18N.en.query='?';I18N.fr.query='?';I18N.de.query='?';
I18N.zh.reset='重置';I18N.en.reset='Reset';I18N.fr.reset='Réinitialiser';I18N.de.reset='Zurücksetzen';
I18N.zh.tabInfoEvents='训练后点击生成评估';I18N.en.tabInfoEvents='Run training, then click "Generate Evaluation"';I18N.fr.tabInfoEvents=`Après l'entraînement, cliquez « Générer l'évaluation »`;I18N.de.tabInfoEvents='Nach dem Training „Bewertung erstellen“ klicken';
I18N.zh.yAxis='模型值';I18N.en.yAxis='Model Value';I18N.fr.yAxis='Valeur du modèle';I18N.de.yAxis='Modellwert';
I18N.zh.th.trend='趋势';I18N.en.th.trend='Trend';I18N.fr.th.trend='Tendance';I18N.de.th.trend='Trend';
I18N.zh.th.domain='属性';I18N.en.th.domain='Domain';I18N.fr.th.domain='Domaine';I18N.de.th.domain='Domäne';
I18N.zh.domainNames={financial:'财经',geo:'地缘政治',tech:'科技',energy:'能源',policy:'政策',macro:'宏观'};I18N.en.domainNames={financial:'Financial',geo:'Geopolitical',tech:'Tech',energy:'Energy',policy:'Policy',macro:'Macro'};I18N.fr.domainNames={financial:'Financier',geo:'Géopolitique',tech:'Tech',energy:'Énergie',policy:'Politique',macro:'Macro'};I18N.de.domainNames={financial:'Finanziell',geo:'Geopolitisch',tech:'Tech',energy:'Energie',policy:'Politik',macro:'Makro'};
I18N.zh.eventInfo='事件详情';I18N.en.eventInfo='Event Details';I18N.fr.eventInfo='Détails de l’événement';I18N.de.eventInfo='Ereignisdetails';
I18N.zh.eLabel='事件';I18N.en.eLabel='Event';I18N.fr.eLabel='Événement';I18N.de.eLabel='Ereignis';
I18N.zh.typeLabel='类型';I18N.en.typeLabel='Type';I18N.fr.typeLabel='Type';I18N.de.typeLabel='Typ';
I18N.zh.sentLabel='情绪';I18N.en.sentLabel='Sentiment';I18N.fr.sentLabel='Sentiment';I18N.de.sentLabel='Stimmung';
I18N.zh.modelLabel='模型值';I18N.en.modelLabel='Model Value';I18N.fr.modelLabel='Valeur du modèle';I18N.de.modelLabel='Modellwert';
I18N.zh.neg='负面';I18N.en.neg='Negative';I18N.fr.neg='Négatif';I18N.de.neg='Negativ';
I18N.zh.pos='正面';I18N.en.pos='Positive';I18N.fr.pos='Positif';I18N.de.pos='Positiv';
I18N.zh.neutral='中性';I18N.en.neutral='Neutral';I18N.fr.neutral='Neutre';I18N.de.neutral='Neutral';
I18N.zh.regionLabel='地区';I18N.en.regionLabel='Region';I18N.fr.regionLabel='Région';I18N.de.regionLabel='Region';
I18N.zh.domainLabel='领域';I18N.en.domainLabel='Domain';I18N.fr.domainLabel='Domaine';I18N.de.domainLabel='Domäne';
const HELP_TEXTS={
 zh:`本页的创意思路：经济与地缘政治事件往往呈现某种周期性与共振。本模型集成了经典经济周期理论，包括：Kitchin基钦周期（约40个月库存周期）、Juglar朱格拉周期（约9-10年设备投资周期）、Kuznets库兹涅茨周期（约15-25年建筑周期）以及Kondratiev康波周期（约50-60年技术长波），并结合Martin Armstrong的8.6年周期理论。通过遗传算法对这些周期参数进行优化，以拟合自1750年以来的历史重大财经与地缘政治事件。例如战争与冲突阶段通常伴随风险偏好下降，战后复工带来复苏；能源冲击引发通胀。我们训练该时间序列模型，总结过去、预测下一阶段极值（低点/高点），并给出资产配置建议。页面支持拖拽/滚轮缩放、多曲线叠加视图、主题/语言切换等。评估页将历史事件与模型极值对比，验证模型有效性。仅用于研究与教育，不构成投资建议。`,
 en:`Idea: economic and geopolitical events often show cyclicality. This model integrates classic economic cycle theories, including Kitchin (inventory, ~40mo), Juglar (investment, ~9-10yr), Kuznets (construction, ~15-25yr), and Kondratiev (long wave, ~50-60yr) cycles, combined with Martin Armstrong's 8.6yr cycle theory. Using genetic algorithms, we optimize these parameters to fit historical financial and geopolitical events since 1750. For example, conflicts lower risk appetite, while post-war periods bring recovery. We train this time-series model to summarize history, forecast upcoming extrema, and suggest allocation. Features include drag/zoom, multi-curve views, theme/language switch, and event evaluation. Evaluation compares events against model extrema. Research/education only; not investment advice.`,
 fr:`Idée directrice : les événements économiques et géopolitiques présentent souvent une cyclicité et des résonances. Les guerres réduisent l'appétence au risque et les prix, tandis que la reconstruction post-conflit apporte une reprise ; les chocs énergétiques (ex. crise pétrolière des années 1970) entraînent inflation et stagflation ; les cycles de resserrement/assouplissement monétaire impactent valorisation et liquidité ; après 2008, désendettement et réparation ont duré des années. Sur cette base, nous entraînons un modèle simplifié de série temporelle pour résumer l'histoire, prévoir les extrémums à venir (bas/hauts) et suggérer allocation et gestion des risques. La page offre glisser/zoom, vues régionales, thème/langue, sauvegarde/import/export du modèle et évaluation des événements ; l'évaluation compare les événements aux extrémums du modèle pour mesurer les deltas de temps/impact. Outil de recherche/formation ; pas un conseil en investissement.`,
 de:`Leitidee: Ökonomische und geopolitische Ereignisse zeigen häufig Zyklen und Resonanz. Kriege mindern Risikoappetit und Preise, während Wiederaufbau Erholung bringt; Energieschocks (z. B. Ölkrise der 1970er) führen zu Inflation und Stagflation; Zyklen aus Straffung/Lockerung beeinflussen Bewertung und Liquidität; nach 2008 hielten Deleveraging und Reparatur über Jahre an. Darauf aufbauend trainieren wir ein vereinfachtes Zeitreihen-Modell, das Historie zusammenfasst, kommende Extremwerte (Tiefs/Hochs) prognostiziert und Hinweise zu Allokation und Risikosteuerung gibt. Die Seite unterstützt Ziehen/Mausrad-Zoom, Regionsansichten, Thema/Sprache, Modell-Speichern/Import/Export und Ereignisbewertung; die Bewertung vergleicht Ereignisse mit Modell-Extremwerten, um Zeit/Impact-Abweichungen zu messen. Nur Forschung/Bildung; keine Anlageberatung.`
};
const QUERY_TEXTS={zh:{train:'训练模型：在至少30秒内反复训练并择优。',predict:'计算预测：生成曲线与下一事件时间。',region:'视图：全球为综合指数（美国40%、欧洲25%、亚洲20%、新兴15%）。',global:'全球：多地区加权组合视图。',us:'美国：美国市场主导视图。',europe:'欧洲：欧洲市场主导视图。',asia:'亚洲：亚洲主要经济体综合视图。',emerging:'新兴市场：发展中市场（亚非拉）。',energy:'能源：石油、天然气、炼化、电力等。',tech:'科技：半导体、软件、互联网、通信。',theme:'主题：深色/浅色切换。',lang:'语言：中文/英语/法语/德语。',grid:'网格：参考刻度线显示开关。',save:'保存模型：保存参数到浏览器。',load:'导入模型：从文件加载模型。',export:'导出模型：下载JSON模型。',reset:'重置：清除所有数据并恢复默认。'},en:{train:'Train: repeat for ≥30s and select best.',predict:'Forecast: render series and next event time.',region:'View: Global mix (US 40%, Europe 25%, Asia 20%, Emerging 15%).',global:'Global: weighted combined view.',us:'US: US market‑centric view.',europe:'Europe: European market‑centric view.',asia:'Asia: composite of major Asian economies.',emerging:'Emerging: developing markets (Asia/Africa/LatAm).',energy:'Energy: oil, gas, refining, power.',tech:'Tech: semiconductors, software, internet, communications.',theme:'Theme: dark/light switch.',lang:'Language: Chinese/English/French/German.',grid:'Grid: toggle reference grid lines.',save:'Save: store model locally.',load:'Import: load model from file.',export:'Export: download JSON model.'},fr:{train:'Entraîner : répéter ≥30 s et garder le meilleur.',predict:'Prévoir : tracer la série et le prochain événement.',region:'Vue : Global (US 40%, Europe 25%, Asie 20%, Émergents 15%).',global:'Global : vue combinée pondérée.',us:'États‑Unis : vue centrée sur le marché US.',europe:'Europe : vue centrée sur le marché européen.',asia:'Asie : composite des grandes économies asiatiques.',emerging:'Émergents : marchés en développement (Asie/Afrique/AmLat).',energy:'Énergie : pétrole, gaz, raffinage, électricité.',tech:'Tech : semi‑conducteurs, logiciels, internet, communications.',theme:'Thème : sombre/clair.',lang:'Langue : Chinois/Anglais/Français/Allemand.',grid:'Grille : activer les lignes de repère.',save:'Enregistrer : stocker le modèle localement.',load:'Importer : charger un modèle.',export:'Exporter : télécharger le modèle JSON.'},de:{train:'Trainieren: ≥30 s wiederholen, bestes wählen.',predict:'Prognose: Serie und nächstes Ereignis.',region:'Ansicht: Global (USA 40%, Europa 25%, Asien 20%, Emerging 15%).',global:'Global: gewichtete kombinierte Ansicht.',us:'USA: US‑marktzentrierte Ansicht.',europe:'Europa: europamarkt‑zentrierte Ansicht.',asia:'Asien: Verbund großer asiatischer Volkswirtschaften.',emerging:'Emerging: Entwicklungsmärkte (Asien/Afrika/LatAm).',energy:'Energie: Öl, Gas, Raffinerie, Strom.',tech:'Tech: Halbleiter, Software, Internet, Kommunikation.',theme:'Thema: dunkel/hell.',lang:'Sprache: Chinesisch/Englisch/Französisch/Deutsch.',grid:'Gitter: Referenzlinien umschalten.',save:'Speichern: Modell lokal sichern.',load:'Importieren: Modell laden.',export:'Exportieren: JSON‑Modell herunterladen.'}};
function applyLang(){}
langSel.addEventListener('change',()=>{applyLangFinal();predict();if(viewEvents.style.display!=='none')evaluate()});
function setStatusGen(g){const L=I18N[langSel.value]||I18N.zh;statusEl.textContent=L.statusGen+g;lastGen=g;lastDoneMs=null}
function setFitness(err,cvv){const L=I18N[langSel.value]||I18N.zh;fitnessEl.textContent=L.error+err.toFixed(1)+L.cv+cvv.toFixed(1);lastErr=err;lastCv=cvv}
function setDone(ms){const L=I18N[langSel.value]||I18N.zh;statusEl.textContent=L.statusDone+ms+'ms';lastDoneMs=ms}
function applyLangFinal(){
  const L=I18N[langSel.value]||I18N.zh;
  
  // Apply tab info text
  const tabInfo = document.getElementById('tabInfo');
  if(tabInfo && L.tabInfoEvents) tabInfo.textContent = L.tabInfoEvents;
  
  document.getElementById('tabPredict').textContent=L.predict;
  document.getElementById('tabEvents').textContent=L.events;
  document.getElementById('viewPredict').querySelector('.title').textContent=L.predictTitle||L.predict;
  document.getElementById('viewEvents').querySelector('.title').textContent=L.eventsTitle;
  document.getElementById('eval').textContent=L.eval;
  document.getElementById('thName').textContent=L.th.name;
  const thTrend=document.getElementById('thTrend');
  const thRegion=document.getElementById('thRegion');
  const thDomain=document.getElementById('thDomain');
  if(thTrend)thTrend.textContent=(L.th.type||L.th.trend||'趋势');
  if(thRegion)thRegion.textContent=(L.regionLabel||'地区');
  if(thDomain)thDomain.textContent=(L.domainLabel||'领域');
  document.getElementById('thDate').textContent=L.th.date;
  document.getElementById('thImpact').textContent=L.th.impact;
  document.getElementById('thModelTime').textContent=L.th.modelTime;
  document.getElementById('thDelta').textContent=L.th.delta;
  document.getElementById('thModelImpact').textContent=L.th.modelImpact;
  document.getElementById('thImpactDiff').textContent=L.th.impactDiff;
  document.getElementById('thMarket').textContent=L.th.market||'Market';
  document.getElementById('train').textContent=L.train;
  document.getElementById('lblRegion').textContent=L.regionLabel||'Region';
  document.getElementById('lblDomain').textContent=L.domainLabel||'Domain';
  document.getElementById('lblTheme').textContent=L.theme;
  document.getElementById('lblLang').textContent=L.lang;
  document.getElementById('helpTitle').textContent=(L.helpTitle||'帮助');
  document.getElementById('queryTitle').textContent=(L.queryTitle||'查询说明');
  document.getElementById('lblGrid').textContent=(L.grid||'网格');
  document.getElementById('lblFitMarket').textContent=(L.fitMarket||'拟合市场趋势');
  const ei=document.getElementById('eventInfoTitle');
  if(ei) ei.textContent = L.eventInfo||'事件详情';
  
  // Fix: Sync evaluation info text
  const evalInfo = document.getElementById('evalInfo');
  if(evalInfo && (!evalInfo.textContent || evalInfo.textContent.includes('训练后') || evalInfo.textContent.includes('Run training') || evalInfo.textContent.includes('Après') || evalInfo.textContent.includes('Nach'))) {
       evalInfo.textContent = L.tabInfoEvents || '训练后点击生成评估';
  }
  if(ei){const lang=langSel.value||'zh';ei.textContent=(L.eventInfo)||((lang==='zh')?'事件详情':'Event Details')}
  document.getElementById('saveModel').textContent=L.save;
  document.getElementById('loadModel').textContent=L.load;
  document.getElementById('exportModel').textContent=L.export;document.getElementById('resetModel').textContent=L.reset;
  document.getElementById('lblNextCrash').textContent=L.nextCrash;
  document.getElementById('lblNextBoom').textContent=L.nextBoom;
  document.getElementById('lblAdvice').textContent=L.advice;
  const opts=['global','us','europe','asia','emerging','geo','financial','tech','energy','policy','macro'];
  opts.forEach(k=>{
    const sp=document.querySelector('.lbl-'+k);
    if(sp)sp.textContent=L.regionNames[k]||k;
  });
  const darkOpt=document.querySelector('#theme option[value="dark"]');
  const lightOpt=document.querySelector('#theme option[value="light"]');
  if(darkOpt)darkOpt.textContent=(L.themeNames?L.themeNames.dark:'深色');
  if(lightOpt)lightOpt.textContent=(L.themeNames?L.themeNames.light:'浅色');
  helpTextEl.innerHTML=(HELP_TEXTS[langSel.value]||HELP_TEXTS.zh);
  if(typeof lastDoneMs==='number'){
    statusEl.textContent=L.statusDone+lastDoneMs+'ms'
  }else if(typeof lastGen==='number'){
    statusEl.textContent=L.statusGen+lastGen
  }
  if(typeof lastErr==='number'&&typeof lastCv==='number'){
    fitnessEl.textContent=L.error+lastErr.toFixed(1)+L.cv+lastCv.toFixed(1)
  }
  if(viewEvents.style.display!=='none'){
    tabInfo.textContent=(L.tabInfoEvents||'训练后点击生成评估');
  }
  if(eventInfoPanel.style.display!=='none' && lastClickedEv){
    showEventInfo(lastClickedEv);
  }
}
document.body.classList.toggle('light',themeSel.value==='light');
applyLangFinal();
[chart].forEach(c=>{
  if(!c) return;
  c.addEventListener('mousedown',onDown);
  c.addEventListener('mousemove',onMove);
  c.addEventListener('mouseup',onUp);
  if(c===chart) c.addEventListener('click',onClick);
  c.addEventListener('mouseleave',()=>{onUp();if(c===chart&&!pinned)hideTooltip()});
  c.addEventListener('wheel',onWheel,{passive:false});
});
themeSel.addEventListener('change',()=>{document.body.classList.toggle('light',themeSel.value==='light');renderView(lastSeriesData,lastFrom,lastEx)});
gridSel.addEventListener('change',()=>{showGrid=gridSel.checked;predict()});
queryBtn.addEventListener('click',()=>{queryMode=!queryMode;queryPanel.style.display=queryMode?'block':'none';queryBtn.classList.toggle('query-on',queryMode)});
function setQuery(key){const lang=langSel.value;const Q=QUERY_TEXTS[lang]||QUERY_TEXTS.zh;queryContentEl.textContent=Q[key]||''}
trainBtn.addEventListener('click',()=>{
    if(queryMode){setQuery('train');return}
    const checked=[];
    regionCheckboxes.forEach(cb=>{if(cb.checked&&cb.value!=='global')checked.push(cb.value)});
    if(checked.length===0){alert('请选择至少一个地区 / Please select at least one region');return}
    
    setAppState('正在训练 / Training...');
    // Train sequentially
    let idx=0;
    function next(){
        if(idx>=checked.length){
            setAppState('训练完成 / Training Done');
            predict();
            return;
        }
        const r=checked[idx++];
        setTrainCount(`Training ${r}...`);
        // Use setTimeout to allow UI update
        setTimeout(()=>{
            trainRegion(r);
            next();
        },10);
    }
    next();
});
themeSel.addEventListener('change',()=>{if(queryMode)setQuery('theme')});
langSel.addEventListener('change',()=>{if(queryMode)setQuery('lang')});
gridSel.addEventListener('change',()=>{if(queryMode)setQuery('grid')});
/* moved below after element refs */
const saveModelBtn=document.getElementById('saveModel');
const loadModelBtn=document.getElementById('loadModel');
const exportModelBtn=document.getElementById('exportModel');const resetModelBtn=document.getElementById('resetModel');
const loadModelFile=document.getElementById('loadModelFile');
saveModelBtn.addEventListener('click',()=>{if(queryMode)setQuery('save')});
loadModelBtn.addEventListener('click',()=>{if(queryMode)setQuery('load')});
exportModelBtn.addEventListener('click',()=>{if(queryMode)setQuery('export')});
resetModelBtn.addEventListener('click',()=>{if(queryMode)setQuery('reset')});
saveModelBtn.onclick=()=>{localStorage.setItem('forecast_models_v2',JSON.stringify(MODELS))};
loadModelBtn.onclick=()=>{loadModelFile.click()};
loadModelFile.onchange=(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(r.result);if(j&&j.us&&j.europe){for(let k in MODELS){MODELS[k]=j[k]||MODELS[k]}}else if(j&&j.a&&j.ph){for(let k in MODELS)MODELS[k]=JSON.parse(JSON.stringify(j))}predict()}catch{}};r.readAsText(f)};
exportModelBtn.onclick=()=>{const blob=new Blob([JSON.stringify(MODELS)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='model.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)};resetModelBtn.onclick=()=>{if(confirm('重置模型将清除所有训练数据并恢复默认设置，确定吗？')){localStorage.removeItem('forecast_models_v2');localStorage.removeItem('forecast_model');location.reload()}};
async function boot(){
  try {
    initMarketCharts();
    console.log("Forecast App v3.0 loaded");
    const valid=(p)=>p&&Array.isArray(p.a)&&Array.isArray(p.ph)&&p.a.length===P.length&&typeof p.k==='number'&&typeof p.sigma==='number';
    let loaded=false;
    try{
      const s=localStorage.getItem('forecast_models_v2');
      if(s){
        const m=JSON.parse(s);
        if(m.us){
          let allGood=true;
          for(let k in MODELS){
            if(!valid(m[k])) allGood=false;
          }
          if(allGood){
            for(let k in MODELS) MODELS[k]=m[k];
            loaded=true;
          }
        }
      }
    }catch(e){console.warn('Local load failed', e)}
    
    if(!loaded){
      // Try migration from old format or just skip
      try{
        const s=localStorage.getItem('forecast_model');
        if(s){
          const j=JSON.parse(s);
          // Attempt to migrate old single model to all regions if valid-ish
          if(j && Array.isArray(j.a) && j.a.length>0){
             // Basic migration: expand arrays if needed, set defaults for missing scalars
             const fix=(p)=>{
               const n={...initParams(), ...p};
               if(n.a.length<P.length){
                 n.a=n.a.concat(new Array(P.length-n.a.length).fill(0.05));
                 n.ph=n.ph.concat(P.slice(n.ph.length).map(v=>seededRandom()*v));
               }
               return n;
             };
             const fixed=fix(j);
             for(let k in MODELS) MODELS[k]=JSON.parse(JSON.stringify(fixed));
             loaded=true;
          }
        }
      }catch(e){}
    }
  
    // Try fetch from model.json if still not loaded
    if(!loaded){
      try{
        const r=await fetch('model.json',{cache:'no-cache'});
        if(r.ok){
          const j=await r.json();
          if(j.us){
            let allGood=true;
            for(let k in MODELS) if(!valid(j[k])) allGood=false;
            if(allGood){
               for(let k in MODELS) MODELS[k]=j[k];
               localStorage.setItem('forecast_models_v2',JSON.stringify(MODELS));
               loaded=true;
            }
          }
        }
      }catch(e){}
    }
  
    // FORCE RESET if anything failed or data is partial
    if(!loaded){
        console.warn("Data load failed or invalid. Resetting to defaults.");
        localStorage.removeItem('forecast_models_v2');
        localStorage.removeItem('forecast_model');
        for(let k in MODELS) MODELS[k]=initParams();
        loaded=true;
    }
    
    generateMarketData();
    // Ensure winStart is valid
    if(typeof winStart === 'undefined' || isNaN(winStart)) winStart = ym('1960-01');
    renderMarketCharts(ym('1750-01'));
    predict();
  } catch(err) {
      console.error("Boot failed:", err);
      alert("Application Error: " + err.message);
  }
}

// Market Data Chart Support
let chartStock, ctxStock;
let chartGold, ctxGold;
let chartOil, ctxOil;

const checkStock = document.getElementById('checkStock');
const checkGold = document.getElementById('checkGold');
const checkOil = document.getElementById('checkOil');

// MARKET_DATA is defined in market_data.js as const. 
// If it's missing, we need a fallback, but we cannot redeclare it if it exists.
if(typeof MARKET_DATA === 'undefined') {
    window.MARKET_DATA = {stock:[], gold:[], oil:[]};
} else {
    // Ensure basic structure
    if(!MARKET_DATA.stock) MARKET_DATA.stock = [];
    if(!MARKET_DATA.gold) MARKET_DATA.gold = [];
    if(!MARKET_DATA.oil) MARKET_DATA.oil = [];
}

function initMarketCharts(){
    chartStock = document.getElementById('chartStock');
    chartGold = document.getElementById('chartGold');
    chartOil = document.getElementById('chartOil');
    
    if(!chartStock || !chartGold || !chartOil) {
        return;
    }

    ctxStock = chartStock.getContext('2d');
    ctxGold = chartGold.getContext('2d');
    ctxOil = chartOil.getContext('2d');
    
    [chartStock, chartGold, chartOil].forEach(c => {
        if(!c) return;
        c.addEventListener('mousedown',onDown);
        c.addEventListener('mousemove',onMove);
        c.addEventListener('mouseup',onUp);
        c.addEventListener('mouseleave',()=>{onUp();});
        c.addEventListener('wheel',onWheel,{passive:false});
    });

    const stockIndexSel = document.getElementById('stockIndexSel');
    if(stockIndexSel){
        stockIndexSel.addEventListener('change', ()=>{
             const type = stockIndexSel.value;
             // Auto-jump to data start
             let startY = null;
             
             // Try source first
             if(typeof MARKET_SOURCE !== 'undefined' && MARKET_SOURCE[type] && MARKET_SOURCE[type].length > 0){
                 startY = MARKET_SOURCE[type][0][0];
             } 
             // Try candles if source not found
             else if(typeof MARKET_CANDLES !== 'undefined'){
                 const c = MARKET_CANDLES[type+'_weekly'] || MARKET_CANDLES[type+'_daily'] || MARKET_CANDLES[type.toUpperCase()+'_weekly'];
                 if(c && c.length > 0){
                     // c[0][0] is timestamp
                     startY = new Date(c[0][0]).getFullYear();
                 }
             }

             if(startY && !isNaN(startY)){
                 // Set winStart to 2 years before startY
                 // bound to 1750
                 const m = (startY - 1750) * 12;
                 winStart = Math.max(0, m - 24);
             }
             
             if(typeof winStart === 'undefined' || isNaN(winStart)) winStart = ym('1960-01');

             renderMarketCharts(ym('1750-01'));
        });
    }

    // Add listeners to market checkboxes
    [checkStock, checkGold, checkOil].forEach(cb => {
        if(cb) cb.addEventListener('change', ()=>renderMarketCharts(ym('1750-01')));
    });

    // Timeframe selector listeners
    const tfRadios = document.getElementsByName('tf');
    tfRadios.forEach(r => {
        r.addEventListener('change', ()=>renderMarketCharts(ym('1750-01')));
    });
}

function generateMarketData(){
    const start=ym('1750-01');
    const end=ym('2099-12');
    const len=end-start+1;
    
    function getM(dy){
        const y=Math.floor(dy);
        const m=Math.round((dy-y)*12);
        return (y-baseY)*12+m;
    }

    function interpolate(src){
        if(!src) return new Array(len).fill(0);
        const res = new Array(len).fill(NaN);
        
        // Populate known points
        for(let i=0; i<src.length; i++){
            const [dy, val] = src[i];
            const idx = getM(dy) - start;
            if(idx >= 0 && idx < len){
                res[idx] = val;
            }
        }
        
        // Linear interpolation for gaps
        let lastIdx = -1;
        for(let i=0; i<len; i++){
            if(!isNaN(res[i])){
                if(lastIdx !== -1 && i > lastIdx + 1){
                    const v1 = res[lastIdx];
                    const v2 = res[i];
                    const steps = i - lastIdx;
                    const dV = (v2 - v1) / steps;
                    for(let j=1; j<steps; j++){
                        res[lastIdx+j] = v1 + dV*j;
                    }
                }
                lastIdx = i;
            }
        }
        
        // Fill edges
        // Find first valid
        let firstValid = -1;
        for(let i=0; i<len; i++){
            if(!isNaN(res[i])){ firstValid=i; break; }
        }
        if(firstValid > 0){
            for(let i=0; i<firstValid; i++) res[i] = res[firstValid];
        }
        
        // Find last valid
        let lastValid = -1;
        for(let i=len-1; i>=0; i--){
            if(!isNaN(res[i])){ lastValid=i; break; }
        }
        if(lastValid !== -1 && lastValid < len-1){
            for(let i=lastValid+1; i<len; i++) res[i] = res[lastValid];
        }
        
        // Fallback for completely empty
        if(firstValid === -1){
            return new Array(len).fill(0);
        }

        return res;
    }

    if(typeof MARKET_SOURCE !== 'undefined'){
        // Generic loader for all keys in MARKET_SOURCE
        for(let key in MARKET_SOURCE){
            if(MARKET_SOURCE.hasOwnProperty(key)){
                // Interpolate and store in MARKET_DATA
                try {
                    if(Array.isArray(MARKET_SOURCE[key])) {
                        MARKET_DATA[key] = interpolate(MARKET_SOURCE[key]);
                    }
                } catch(e) {
                    console.warn("Failed to interpolate " + key, e);
                }
            }
        }
        
        // Map uppercase keys to lowercase for internal usage
        if(MARKET_DATA['GOLD'] && !MARKET_DATA['gold']) MARKET_DATA['gold'] = MARKET_DATA['GOLD'];
        if(MARKET_DATA['OIL'] && !MARKET_DATA['oil']) MARKET_DATA['oil'] = MARKET_DATA['OIL'];
        if(MARKET_DATA['SP500'] && !MARKET_DATA['sp500']) MARKET_DATA['sp500'] = MARKET_DATA['SP500'];
        
        // Ensure default fallbacks if not present
        if(!MARKET_DATA.stock) MARKET_DATA.stock = MARKET_DATA.sp500 || [];
        if(!MARKET_DATA.gold) MARKET_DATA.gold = [];
        if(!MARKET_DATA.oil) MARKET_DATA.oil = [];
    }
}
// generateMarketData(); // Moved to boot() to avoid top-level crashes

function updateDataPanel(ticker){
    let info = MARKET_DATA[ticker + '_info'];
    if(!info && ticker){
        info = MARKET_DATA[ticker.toUpperCase() + '_info'];
    }
    if(!info){
        // Clear panel
        ['sd_open','sd_high','sd_low','sd_close','sd_vol','sd_amount','sd_rise','sd_fall',
         'sd_open_today','sd_close_prev','sd_high_today','sd_low_today','sd_turnover','sd_vol_ratio','sd_bid_ratio','sd_flat']
         .forEach(id => { const el = document.getElementById(id); if(el) el.innerText = '--'; });
        return;
    }
    
    // Helper to safe string
    const s = (v) => (v !== undefined && v !== null) ? v : '--';
    const num = (v) => (typeof v === 'number') ? v.toFixed(2) : s(v);
    const big = (v) => {
        if(typeof v !== 'number') return s(v);
        if(v > 1e8) return (v/1e8).toFixed(2) + '亿';
        if(v > 1e4) return (v/1e4).toFixed(2) + '万';
        return v.toFixed(0);
    };

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };

    set('sd_open', num(info.open));
    set('sd_high', num(info.dayHigh));
    set('sd_low', num(info.dayLow));
    set('sd_price', num(info.currentPrice || info.lastPrice || info.regularMarketPrice)); 
    set('sd_vol', big(info.volume));
    set('sd_amount', big(info.amount)); 
    
    set('sd_bid', num(info.bid));
    set('sd_ask', num(info.ask));
    
    // Calculate Rise/Fall
    const curr = info.currentPrice || info.lastPrice || info.regularMarketPrice;
    const prev = info.previousClose || info.regularMarketPreviousClose;
    
    if(curr && prev){
        const diff = curr - prev;
        const pct = (diff / prev) * 100;
        const color = diff >= 0 ? '#22c55e' : '#ef4444'; 
        const sign = diff >= 0 ? '+' : '';
        
        const elChange = document.getElementById('sd_change');
        if(elChange) {
            elChange.innerText = `${sign}${diff.toFixed(2)}`;
            elChange.style.color = color;
        }
        const elPct = document.getElementById('sd_percent');
        if(elPct) {
            elPct.innerText = `${sign}${pct.toFixed(2)}%`;
            elPct.style.color = color;
        }
        const elPrice = document.getElementById('sd_price');
        if(elPrice) {
            elPrice.style.color = color;
        }
    }
    
    // Turnover, VolRatio, BidRatio often require calculation or separate feed
    if(info.bid && info.ask) set('sd_bid_ratio', (info.bid/info.ask).toFixed(2));
}

function renderCandles(ctx, data, w, h, mL, mR, mT, mB, ph, axisColor, gridColor, winStart, winLen, fxm){
    // data format: [[timestamp, open, high, low, close, volume], ...]
    
    // Filter visible data
    // Convert timestamp to month index to match winStart/winLen
    // m = (y - 1750)*12 + m + d/30
    
    const tsToM = (ts) => {
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = d.getMonth();
        const day = d.getDate();
        return (y - 1750)*12 + m + (day-1)/30.5;
    };

    const visibleData = [];
    let minP = Infinity, maxP = -Infinity;
    
    // Optimization: Binary search start/end could be better, but linear scan is fine for <1000 candles
    for(let i=0; i<data.length; i++){
        const d = data[i];
        const m = tsToM(d[0]);
        if(m >= winStart && m <= winStart + winLen){
            visibleData.push({m, d});
            if(d[3] < minP) minP = d[3]; // Low
            if(d[2] > maxP) maxP = d[2]; // High
        }
    }
    
    if(visibleData.length === 0) {
        ctx.fillStyle = axisColor;
        ctx.textAlign = 'center';
        ctx.fillText('此范围内无K线数据 / No Candle Data in Range', w/2, h/2);
        return;
    }

    const rangeP = maxP - minP;
    const pad = rangeP * 0.1 || 1; // avoid zero range
    minP -= pad; maxP += pad;
    
    const fy = (p) => mT + ph - (p - minP)/(maxP - minP) * ph;
    
    // Draw Grid (Y-Axis)
    const yTicks = getNiceTicks(minP, maxP, 5);
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    ctx.beginPath();
    yTicks.forEach(tick => {
        const y = Math.floor(fy(tick)) + 0.5;
        if(y>mT && y<mT+ph){
            ctx.moveTo(mL, y);
            ctx.lineTo(w - mR, y);
            ctx.fillText(tick, mL - 5, y);
        }
    });
    ctx.stroke();

    // Draw Candles
    // Width of candle depends on zoom.
    // If we have N candles in width W, candle width = W / N * 0.8
    // BUT we are mapping to absolute time.
    // 1 day width in month units = 1/30.5
    // width in pixels = (1/30.5) / winLen * pw
    
    const pw = w - mL - mR;
    const dayWidthM = 1/30.5; 
    const barW = Math.max(1, (dayWidthM / winLen * pw) * 0.8);
    
    visibleData.forEach(item => {
        const {m, d} = item;
        const [ts, op, hi, lo, cl] = d;
        
        const x = fxm(m);
        const yO = fy(op);
        const yC = fy(cl);
        const yH = fy(hi);
        const yL = fy(lo);
        
        // User requested: Red = Fall, Green = Rise
        const isRise = cl >= op;
        ctx.fillStyle = isRise ? '#22c55e' : '#ef4444';
        ctx.strokeStyle = ctx.fillStyle;
        
        // Wick
        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();
        
        // Body
        const bodyTop = Math.min(yO, yC);
        const bodyH = Math.abs(yO - yC) || 1; 
        ctx.fillRect(x - barW/2, bodyTop, barW, bodyH);
    });
}

function renderMarketCharts(from){
  try {
    if(typeof winStart === 'undefined' || isNaN(winStart)) winStart = ym('1960-01');
    const axisColor = themeSel.value==='dark'?'#94a3b8':'#475569';
    const gridColor = themeSel.value==='dark'?'rgba(255,255,255,0.1)':'rgba(0,0,0,0.1)';
    const stockIndexSel = document.getElementById('stockIndexSel');
    const stockType = stockIndexSel ? stockIndexSel.value : 'sp500';
    
    let data = MARKET_DATA[stockType];
    
    if(!data || data.length === 0){
        if(stockType === 'sp500' && MARKET_DATA.stock) data = MARKET_DATA.stock;
    }
    
    MARKET_DATA.stock = data || [];

    const list = [
        {ctx: ctxStock, arr: MARKET_DATA.stock, check: checkStock, color: '#3b82f6', name: stockType},
        {ctx: ctxGold, arr: MARKET_DATA.gold, check: checkGold, color: '#eab308', name: 'gold'},
        {ctx: ctxOil, arr: MARKET_DATA.oil, check: checkOil, color: '#ef4444', name: 'oil'}
    ];

    const dpr = window.devicePixelRatio || 1;
    const w = 900;
    const h = 150;
    const mL=60, mR=20, mT=20, mB=30;
    const pw=w-mL-mR, ph=h-mT-mB;
    const iStart=Math.max(0,winStart-from);
    const fxm=(m)=>mL+(m-winStart)/winLen*pw;

    // Get selected timeframe
    const tfRadios = document.getElementsByName('tf');
    let selectedTf = 'week';
    for(const r of tfRadios){ if(r.checked) selectedTf = r.value; }
    
    updateDataPanel(stockType);

    list.forEach(item => {
        const {ctx, arr, check, color, name} = item;
        if(!ctx || !check) return; 
        const cvs = ctx.canvas;
        const container = cvs.parentElement;
        
        if(!check.checked){
            container.style.display = 'none';
            return;
        }
        container.style.display = 'block';

        const isStock = (ctx === ctxStock);
        const thisH = isStock ? 450 : 150;

        if(cvs.width !== w*dpr || cvs.height !== thisH*dpr){
             cvs.width = w*dpr;
             cvs.height = thisH*dpr;
             cvs.style.width = w+'px';
             cvs.style.height = thisH+'px';
        }
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0,0,w,thisH);
        
        const hasLineData = arr && arr.length > 0;
        const hasCandleData = MARKET_DATA[name+'_daily'] || MARKET_DATA[name+'_weekly'] || MARKET_DATA[name.toUpperCase()+'_daily'] || MARKET_DATA[name.toUpperCase()+'_weekly'];
        
        if(!hasLineData && !hasCandleData){
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('暂无数据 / Data Not Available', w/2, thisH/2);
            return;
        }

        const ph_local = thisH - mT - mB;
        
        let candleKey = null;
        if(selectedTf === 'day') candleKey = name + '_daily';
        if(selectedTf === 'week') candleKey = name + '_weekly';
        
        let candleData = candleKey ? MARKET_DATA[candleKey] : null;
        if(!candleData && candleKey){
            const upperKey = name.toUpperCase() + (selectedTf === 'day' ? '_daily' : '_weekly');
            candleData = MARKET_DATA[upperKey];
        }
        
        const useCandles = isStock && (selectedTf === 'day' || selectedTf === 'week') && candleData && candleData.length > 0;
        
        if(useCandles){
            renderCandles(ctx, candleData, w, thisH, mL, mR, mT, mB, ph_local, axisColor, gridColor, winStart, winLen, fxm);
        } else {
            // Existing Line Chart Logic
            // Ensure we have array data for line chart
            if(!arr || arr.length === 0) return;

            const iEnd=Math.min(arr.length-1,iStart+winLen);
            
            let min=1e9, max=-1e9;
            for(let i=iStart; i<=iEnd; i++){
                const val = arr[i];
                if(!isNaN(val)){
                    if(val<min) min=val;
                    if(val>max) max=val;
                }
            }
            if(min>max){min=0;max=100}
            if(max===min){max=min+1}
            
            const range = max-min;
            min -= range*0.05;
            max += range*0.05;

            const fy=(v)=>mT+ph_local-(v-min)/(max-min)*ph_local;

            const yTicks = getNiceTicks(min, max, 5);
            ctx.strokeStyle=gridColor;
            ctx.fillStyle=axisColor;
            ctx.lineWidth=1;
            ctx.font='10px sans-serif';
            ctx.textAlign='right';
            ctx.textBaseline='middle';
            
            ctx.beginPath();
            yTicks.forEach(tick=>{
                const y=Math.floor(fy(tick))+0.5;
                if(y>mT && y<mT+ph_local){
                    ctx.moveTo(mL,y);
                    ctx.lineTo(w-mR,y);
                    ctx.fillText(tick, mL-5, y);
                }
            });
            ctx.stroke();

            // X-Axis Grid
            ctx.beginPath();
            ctx.textAlign='center';
            ctx.textBaseline='top';
            for(let i=iStart; i<=iEnd; i++){
                if(i%12===0){ 
                   const x=Math.floor(fxm(i+from))+0.5;
                   if(x>mL && x<w-mR){
                        ctx.moveTo(x,mT);
                        ctx.lineTo(x,thisH-mB);
                        ctx.fillText(Math.floor((i+from)/12)+baseY, x, thisH-mB+5);
                   }
                }
            }
            ctx.strokeStyle=gridColor;
            ctx.stroke();

            // Plot Line
            ctx.beginPath();
            ctx.strokeStyle=color;
            ctx.lineWidth=2;
            let moved=false;
            for(let i=iStart; i<=iEnd; i++){
                const val = arr[i];
                if(isNaN(val)) continue;
                const x=fxm(i+from);
                const y=fy(val);
                if(x<mL || x>w-mR) continue;
                
                if(!moved){ ctx.moveTo(x,y); moved=true; }
                else ctx.lineTo(x,y);
            }
            ctx.stroke();
        }
    });
  } catch(e) { console.error('Render error', e); }
}
}
boot();

function evaluate(){
    const from=ym('1750-01');
    const to=ym('2024-12');
    const arr=seriesGlobal(from,to);
    let min=1e9,max=-1e9;
    for(let i=0;i<arr.length;i++){
        if(arr[i]<min)min=arr[i];
        if(arr[i]>max)max=arr[i];
    }
    const norm=(v)=>Math.abs((v-min)/(max-min));
    const keys=['us','europe','asia','emerging'];
    const thH=keys.map(k=>MODELS[k].thHigh).reduce((a,b)=>a+b,0)/keys.length;
    const thL=keys.map(k=>MODELS[k].thLow).reduce((a,b)=>a+b,0)/keys.length;
    const ex=extremes(arr,from,thH,thL);
    eventsTable.innerHTML='';
    const L=I18N[langSel.value]||I18N.zh;
    let totalDelta=0,totalMag=0,validCount=0;
    const sortedEvents=[...events].sort((a,b)=>a.month-b.month);
    
    for(let i=0;i<sortedEvents.length;i++){
        const e=sortedEvents[i];
        const s=eventSentiment(e);
        const trend=(s==='pos'?'up':(s==='neg'?'down':'none'));
        const domain=e.domain || (e.type==='geo'?'geo':'financial');
        const region=e.region||'global';
        let target=trend==='up'?ex.peaks:(trend==='down'?ex.troughs:ex.peaks.concat(ex.troughs));
        let best=null,bd=null;
        if(target.length>0){
            let minD=1e9;
            for(let j=0;j<target.length;j++){
                const d=Math.abs(target[j].t-e.month);
                if(d<minD){minD=d;best=target[j]}
            }
            if(minD<=60){bd=minD}else{best=null;bd=null}
        }
        const mPred=norm(compositeGlobal(e.month));
        const mDiff=Math.abs(mPred-e.impact);
        if(bd!==null){totalDelta+=bd;validCount++}
        totalMag+=mDiff;
        
        const tr=document.createElement('tr');
        function td(t){const x=document.createElement('td');x.style.padding='6px';x.textContent=t;return x}
        const typeMap=L.typeNames||{struct:'�ṹ',geo:'��Ե����',up:'����',down:'�µ�'};
        const domainMap=L.domainNames||{fin:'�ƾ�',geo:'��Ե����'};
        const regionMap=L.regionNames||{};
        
        tr.appendChild(td(evName(e)));
        tr.appendChild(td(regionMap[region]||region));
        tr.appendChild(td(domainMap[domain]||domain));
        tr.appendChild(td(trend==='none'?'-':(typeMap[trend]||trend)));
        tr.appendChild(td(e.date));
        tr.appendChild(td(e.impact.toFixed(2)));
        tr.appendChild(td(best?fromm(best.t):'-'));
        tr.appendChild(td(bd!==null?String(bd):'-'));
        tr.appendChild(td(mPred.toFixed(2)));
        tr.appendChild(td(mDiff.toFixed(2)));
        tr.appendChild(td(getMarketTrend(e.date)));
        eventsTable.appendChild(tr);
    }
    const avgD=validCount>0?totalDelta/validCount:0;
    const avgM=sortedEvents.length>0?totalMag/sortedEvents.length:0;
    evalInfo.textContent=L.avgDelta+avgD.toFixed(1)+L.avgImpact+avgM.toFixed(2);
}
evalBtn.onclick=()=>evaluate();

