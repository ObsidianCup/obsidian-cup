// Showy motion mode: every public page, EN and BN, phone and laptop width.
// Nothing may stay hidden after scrolling, no sideways scroll, no errors;
// calm stays untouched, reduced motion never gets it, a missing script falls back.
const {chromium}=require('playwright');const fs=require('fs');
const R=require('path').resolve(__dirname,'../..');   // run with the site served on http://localhost:8765
(async()=>{const b=await chromium.launch();let bad=0;const say=(ok,m)=>{if(!ok){bad++;console.log('FAIL',m)}};
const pages=['index.html',...fs.readdirSync(R+'/pages').filter(f=>fs.readFileSync(R+'/pages/'+f,'utf8').includes('motion-boot.js')).map(f=>'pages/'+f)];
for(const lang of ['en','bn']) for(const w of [375,1280]) for(const pg of pages){
 const c=await b.newContext({viewport:{width:w,height:800}});const p=await c.newPage();const errs=[];
 await p.addInitScript(l=>{try{localStorage.setItem('oc_lang',l)}catch(e){}},lang);
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(/Refused|Content Security/i.test(m.text()))errs.push(m.text().slice(0,160))});
 await p.goto('http://localhost:8765/'+pg+'?motion=showy',{waitUntil:'load'});await p.waitForTimeout(500);
 const on=await p.evaluate(()=>document.documentElement.className);
 say(/m-on/.test(on)&&/m-ready/.test(on),`${pg} ${lang} ${w}: not on (${on})`);
 // scroll down in steps like a person, then check nothing stays hidden
 const H=await p.evaluate(()=>document.documentElement.scrollHeight);
 for(let y=0;y<H;y+=600){await p.mouse.wheel(0,600);await p.waitForTimeout(120);}
 await p.waitForTimeout(1400);
 const r=await p.evaluate(()=>({left:document.querySelectorAll('[data-m]').length,over:document.documentElement.scrollWidth-innerWidth,
   dim:[...document.querySelectorAll('main *')].filter(e=>e.getClientRects().length&&+getComputedStyle(e).opacity<1&&!e.closest('.m-arc,.m-facets')).map(e=>e.tagName+'.'+e.className).slice(0,4)}));
 say(r.left===0,`${pg} ${lang} ${w}: ${r.left} still tagged`);say(r.over<=0,`${pg} ${lang} ${w}: overflow ${r.over}`);say(r.dim.length===0,`${pg} ${lang} ${w}: dim ${r.dim}`);say(errs.length===0,`${pg} ${lang} ${w}: ${errs}`);
 await c.close();}
// calm default: untouched
{const c=await b.newContext();const p=await c.newPage();await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(600);
 const r=await p.evaluate(()=>({cls:document.documentElement.className,extra:document.querySelectorAll('.m-facets,.m-arc,.m-progress,[data-m]').length,anim:getComputedStyle(document.querySelector('.g-hero2 h1')).animationName}));
 say(r.cls===''&&r.extra===0&&r.anim==='none','calm default changed: '+JSON.stringify(r));
 await p.goto('http://localhost:8765/index.html?motion=showy');await p.waitForTimeout(300);await p.goto('http://localhost:8765/pages/about.html');await p.waitForTimeout(400);
 say(await p.evaluate(()=>document.documentElement.classList.contains('m-on')),'preview choice not kept on next page');
 await p.goto('http://localhost:8765/pages/about.html?motion=calm');await p.waitForTimeout(300);
 say(!(await p.evaluate(()=>document.documentElement.classList.contains('m-on'))),'?motion=calm did not switch off');await c.close();}
// reduced motion: never on
{const c=await b.newContext({reducedMotion:'reduce'});const p=await c.newPage();await p.goto('http://localhost:8765/index.html?motion=showy');await p.waitForTimeout(500);
 say(!(await p.evaluate(()=>document.documentElement.classList.contains('m-on'))),'on under reduced motion');await c.close();}
// motion.js blocked: page must come back to normal
{const c=await b.newContext();const p=await c.newPage();await p.route('**/js/motion.js',r=>r.abort());await p.goto('http://localhost:8765/index.html?motion=showy');await p.waitForTimeout(3400);
 const r=await p.evaluate(()=>({cls:document.documentElement.className,op:getComputedStyle(document.querySelector('.g-hero2 h1')).opacity}));
 say(r.cls===''&&r.op==='1','no fallback when motion.js is missing: '+JSON.stringify(r));await c.close();}
// keyboard: tabbing into a hidden block shows it
{const c=await b.newContext({viewport:{width:1280,height:800}});const p=await c.newPage();await p.goto('http://localhost:8765/index.html?motion=showy');await p.waitForTimeout(1500);
 await p.evaluate(()=>{const a=document.querySelector('.g-seasons a');a.focus({preventScroll:true})});await p.waitForTimeout(900);
 say(await p.evaluate(()=>+getComputedStyle(document.querySelector('.g-seasons li')).opacity===1),'focused block stayed hidden');await c.close();}
console.log('pages',pages.length,'failures',bad);await b.close()})();
