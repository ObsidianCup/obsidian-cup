// Full public-site audit: every page, EN and BN, four widths.
const {chromium}=require('playwright');const fs=require('fs');const S=process.argv[2];
const pages=['/','/pages/tournaments.html','/pages/volleyball.html','/pages/futsal.html','/pages/rules.html','/pages/about.html','/pages/experiences.html','/pages/faq.html','/pages/register.html','/pages/fixtures.html','/pages/legal.html?doc=terms','/pages/legal.html?doc=privacy','/pages/legal.html?doc=media','/pages/legal.html?doc=payment','/pages/account.html','/pages/admin.html','/404.html'];
(async()=>{const b=await chromium.launch();const problems=[];const links=new Set();
for(const lang of ['en','bn'])for(const w of [1440,1024,768,375]){
 const c=await b.newContext({viewport:{width:w,height:900}});await c.addInitScript(l=>{try{localStorage.setItem('oc_lang',l)}catch(e){}},lang);
 await c.route(/googletagmanager|google-analytics|fonts\.g|challenges\.cloudflare|supabase\.co/,r=>r.abort());
 const p=await c.newPage();
 for(const u of pages){const errs=[],bad=[];p.removeAllListeners('pageerror');p.removeAllListeners('response');
  p.on('pageerror',e=>errs.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().includes('localhost')&&!r.url().endsWith('/nope.html'))bad.push(r.status()+' '+r.url().replace('http://localhost:8765',''))});
  await p.goto('http://localhost:8765'+u).catch(e=>errs.push('nav '+e.message));await p.waitForTimeout(450);
  const r=await p.evaluate(()=>{const de=document.documentElement;const vis=e=>e.offsetParent!==null;
   const texts=[...document.querySelectorAll('body *')].filter(e=>vis(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()));
   const small=texts.filter(e=>parseFloat(getComputedStyle(e).fontSize)<12).map(e=>e.className||e.tagName).slice(0,4);
   const clipped=texts.filter(e=>{const s=getComputedStyle(e);return e.scrollWidth>e.clientWidth+2&&s.overflow==='hidden'&&s.textOverflow!=='ellipsis'&&e.clientWidth>0&&s.display!=='inline'}).map(e=>(e.className||e.tagName)+':'+e.textContent.trim().slice(0,20)).slice(0,4);
   const offR=[...document.querySelectorAll('main *, header *, footer *')].filter(e=>vis(e)&&e.getBoundingClientRect().right>de.clientWidth+1&&getComputedStyle(e).position!=='fixed'&&!e.closest('.g-menu')).map(e=>e.className||e.tagName).slice(0,4);
   const hs=[...document.querySelectorAll('h1,h2,h3,h4')].filter(vis).map(h=>+h.tagName[1]);let skip=0;hs.forEach((h,i)=>{if(i&&h>hs[i-1]+1)skip++});
   const tap=[...document.querySelectorAll('a,button,summary,input,select')].filter(e=>vis(e)&&!e.closest('p,li,dd,td,.g-prose,.legal-body,.g-footer-meta,label')).filter(e=>{const r=e.getBoundingClientRect();return r.height<40&&r.width>0}).map(e=>(e.className||e.tagName)+':'+Math.round(e.getBoundingClientRect().height)).slice(0,5);
   return {over:de.scrollWidth-de.clientWidth,h1:document.querySelectorAll('h1').length,h1vis:[...document.querySelectorAll('h1')].filter(vis).length,small,clipped,offR,skip,tap,
    noAlt:[...document.images].filter(i=>!i.hasAttribute('alt')).length,broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&!i.src.includes('google')).map(i=>i.getAttribute('src')),
    unlabelled:[...document.querySelectorAll('input,select,textarea')].filter(e=>e.type!=='hidden'&&vis(e)&&!(e.labels&&e.labels.length)&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>e.id||e.name),
    lang:de.lang,title:document.title,dupIds:(()=>{const s={};document.querySelectorAll('[id]').forEach(e=>s[e.id]=(s[e.id]||0)+1);return Object.keys(s).filter(k=>s[k]>1)})(),
    hrefs:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))}});
  r.hrefs.forEach(h=>{if(h&&!/^(https?:|mailto:|tel:|#)/.test(h))links.add(new URL(h,'http://localhost:8765'+u).href.split('#')[0])});
  const issues={};
  if(r.over>0)issues.over=r.over; if(errs.length)issues.errs=errs; if(bad.length)issues.bad=bad; if(r.small.length)issues.small=r.small; if(r.clipped.length)issues.clipped=r.clipped;
  if(r.offR.length)issues.offR=r.offR; if(r.skip)issues.headingSkip=r.skip; if(r.h1vis!==1)issues.h1=r.h1vis; if(r.noAlt)issues.noAlt=r.noAlt; if(r.broken.length)issues.broken=r.broken;
  if(r.unlabelled.length)issues.unlabelled=r.unlabelled; if(r.dupIds.length)issues.dupIds=r.dupIds; if(r.lang!==lang)issues.lang=r.lang; if(w<=768&&r.tap.length)issues.tap=r.tap; if(!r.title)issues.title='none';
  if(Object.keys(issues).length)problems.push({lang,w,u,...issues});
 }await c.close();}
// every internal link answers
const c=await b.newContext();const p=await c.newPage();const dead=[];
for(const l of links){const res=await p.request.get(l).catch(()=>null);if(!res||res.status()>=400)dead.push(l.replace('http://localhost:8765',''));}
fs.writeFileSync(S+'/full.json',JSON.stringify({problems,dead,links:links.size},null,1));
const key=x=>JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k])=>!['lang','w'].includes(k))));const seen={};
for(const x of problems){const k=key(x);(seen[k]=seen[k]||[]).push(x.lang+x.w);}
for(const k in seen)console.log(seen[k].join(','),k.slice(0,420));
console.log('links checked',links.size,'dead',dead);await b.close()})()
