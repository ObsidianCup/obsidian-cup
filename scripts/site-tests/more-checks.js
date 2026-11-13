const {chromium}=require('playwright');const fs=require('fs');const S=process.argv[2];const fake=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
const out=[];const ok=(c,n,x)=>out.push((c?'ok   ':'FAIL ')+n+(c?'':' '+JSON.stringify(x||'')));
async function ctx(b,{w=375,lang='en',accounts=true,reduce=false,scn={profile:{legal_name:'Rina Akter',sports:['volleyball'],player_code:'OC-RA427'}}}){
 const c=await b.newContext({viewport:{width:w,height:900},reducedMotion:reduce?'reduce':'no-preference'});
 await c.addInitScript(([l,s])=>{try{localStorage.setItem('oc_lang',l)}catch(e){};window.__scn=s},[lang,scn]);
 await c.route('**/supabase-js-2.118.0.js',r=>r.fulfill({contentType:'application/javascript',body:fake}));
 await c.route('**/js/config.js',async r=>{const res=await r.fetch();let t=await res.text();t=t.replace(/turnstileSiteKey:\s*"[^"]*"/,'turnstileSiteKey: ""');if(accounts)t=t.replace(/accountsEnabled:\s*false/,'accountsEnabled: true');r.fulfill({response:res,body:t})});
 await c.route(/googletagmanager|google-analytics|fonts\.g|challenges/,r=>r.abort());return c;}
(async()=>{const b=await chromium.launch();
// (a) accounts switched on: every page
const pages=['/','/pages/tournaments.html','/pages/volleyball.html','/pages/futsal.html','/pages/rules.html','/pages/about.html','/pages/experiences.html','/pages/faq.html','/pages/register.html','/pages/account.html','/pages/legal.html?doc=privacy','/404.html'];
for(const lang of ['en','bn'])for(const w of [1280,768,375]){const c=await ctx(b,{w,lang});const p=await c.newPage();p.setDefaultTimeout(8000);
 for(const u of pages){const errs=[];p.removeAllListeners('pageerror');p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8765'+u);await p.waitForTimeout(500);
  const r=await p.evaluate(()=>({over:document.documentElement.scrollWidth-document.documentElement.clientWidth,login:[...document.querySelectorAll('.g-login')].filter(e=>e.offsetParent).length,headerH:document.querySelector('.g-header')?.offsetHeight}));
  if(r.over>0||errs.length||(r.login<1&&w>=375)||r.headerH>80)ok(false,`accounts on ${lang} ${w} ${u}`,{...r,errs});}
 await c.close();}
ok(true,'accounts-on crawl finished (failures listed above, if any)');
// home with accounts on
{const c=await ctx(b,{w:1280});const p=await c.newPage();await p.goto('http://localhost:8765/');await p.waitForTimeout(500);
 ok(await p.$eval('#flowTitle',e=>!!e.offsetParent),'steps section shows when accounts are on');ok(await p.$eval('.g-actions [data-needs-accounts]',e=>!!e.offsetParent),'create account button shows when accounts are on');
 await p.screenshot({path:S+'/shots2/home-accounts-on.png'});
 // (c) tabs by keyboard
 await p.focus('#tabVolleyball');await p.keyboard.press('ArrowRight');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.activeElement.id==='tabFutsal'&&!document.getElementById('panelFutsal').hidden&&document.getElementById('panelVolleyball').hidden),'arrow key moves to the Futsal tab');
 const bar=await p.$eval('.g-tabbar',e=>e.getBoundingClientRect().left),tab=await p.$eval('#tabFutsal',e=>e.getBoundingClientRect().left);ok(Math.abs(bar-tab)<2,'underline sits under the chosen tab',{bar,tab});
 await c.close();}
// (b) reduced motion
{const c=await ctx(b,{w:375,reduce:true});const p=await c.newPage();await p.goto('http://localhost:8765/');await p.waitForTimeout(400);
 await p.click('.g-menu-btn');await p.waitForTimeout(100);ok(await p.$eval('#gMenu',e=>getComputedStyle(e).visibility==='visible'&&e.getBoundingClientRect().left<375),'reduced motion: menu opens');
 await p.keyboard.press('Escape');await p.waitForTimeout(100);ok(await p.$eval('#gMenu',e=>getComputedStyle(e).visibility==='hidden'),'reduced motion: menu closes at once');
 const dur=await p.evaluate(()=>getComputedStyle(document.querySelector('main')).animationName);ok(dur==='none','reduced motion: no page fade',dur);
 await p.goto('http://localhost:8765/pages/account.html');await p.waitForSelector('#deleteOpen',{state:'visible'});await p.click('#deleteOpen');
 ok(await p.$eval('#deleteDialog',e=>e.open&&getComputedStyle(e).animationName==='none'),'reduced motion: delete box opens without animation');await c.close();}
// menu: links work, body scroll locked and released
{const c=await ctx(b,{w:375});const p=await c.newPage();await p.goto('http://localhost:8765/');await p.waitForTimeout(400);await p.click('.g-menu-btn');await p.waitForTimeout(350);
 ok(await p.evaluate(()=>document.body.style.overflow==='hidden'),'menu locks page scroll');
 await Promise.all([p.waitForNavigation(),p.click('#gMenu a[href*="about"]')]);ok(p.url().includes('about')&&await p.evaluate(()=>document.body.style.overflow!=='hidden'),'menu link opens the page with scrolling free');
 await p.click('.g-menu-btn');await p.waitForTimeout(350);await p.click('#gMenu .lang-btn[data-lang="bn"]');await p.waitForTimeout(300);ok(await p.evaluate(()=>document.documentElement.lang==='bn'),'language switch works inside the menu');await c.close();}
// (d) admin page with a non-admin account
{const c=await ctx(b,{w:1280});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('http://localhost:8765/pages/admin.html');await p.waitForTimeout(1500);
 await p.screenshot({path:S+'/shots2/admin-player.png'});await c.close();}
console.log(out.join('\n'));await b.close()})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.message.slice(0,300))})
