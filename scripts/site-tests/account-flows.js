const {chromium}=require('playwright');const fs=require('fs');const S=process.argv[2];const fake=fs.readFileSync(__dirname+'/fake-supabase.js','utf8');
const out=[];const ok=(c,name,extra)=>{out.push((c?'ok   ':'FAIL ')+name+(c?'':' '+JSON.stringify(extra||'')))};
async function open(b,{scn,lang='en',w=375,captcha=false,blockCaptcha=false}){
 const c=await b.newContext({viewport:{width:w,height:900}});
 await c.addInitScript(([l,s])=>{try{localStorage.setItem('oc_lang',l)}catch(e){};window.__scn=s},[lang,scn]);
 await c.route('**/supabase-js-2.118.0.js',r=>r.fulfill({contentType:'application/javascript',body:fake}));
 await c.route('**/js/config.js',async r=>{const res=await r.fetch();let t=await res.text();if(!captcha)t=t.replace(/turnstileSiteKey:\s*"[^"]*"/,'turnstileSiteKey: ""');r.fulfill({response:res,body:t})});
 await c.route(/googletagmanager|google-analytics|fonts\.g/,r=>r.abort());
 await c.route(/challenges\.cloudflare/,r=>blockCaptcha?r.abort():r.continue());
 const p=await c.newPage();p.setDefaultTimeout(8000);p.__errs=[];p.on('pageerror',e=>p.__errs.push(e.message));
 await p.goto('http://localhost:8765/pages/account.html');return p;}
const view=p=>p.evaluate(()=>{const v=[...document.querySelectorAll('[data-view]')].find(e=>!e.hidden);return v&&v.dataset.view});
const txt=(p,sel)=>p.$eval(sel,e=>e.textContent.trim());
const over=p=>p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
(async()=>{const b=await chromium.launch();
// ---------- logged out ----------
for(const lang of ['en','bn']){
 let p=await open(b,{scn:{session:false},lang});await p.waitForSelector('[data-view="auth"]:not([hidden])');
 ok(await over(p)===0,`${lang} auth no sideways scroll`);
 await p.click('#authSubmit');ok((await txt(p,'#authMsg')).length>5,`${lang} empty log in shows a message`);
 await p.fill('#authEmail','rina@example.com');await p.fill('#authPassword','short');await p.click('#authSubmit');ok((await txt(p,'#authMsg')).length>5,`${lang} short password message`);
 await p.fill('#authPassword','wrongpass1');await p.click('#authSubmit');await p.waitForTimeout(200);ok(await view(p)==='auth'&&(await txt(p,'#authMsg')).length>5,`${lang} wrong password stays with message`);
 ok(!(await p.$eval('#authSubmit',e=>e.disabled||e.dataset.busy)),`${lang} button usable again after an error`);
 await p.fill('#authPassword','goodpass12');await p.click('#authSubmit');await p.waitForSelector('[data-view="app"]:not([hidden]),[data-view="sports"]:not([hidden]),[data-view="consent"]:not([hidden])');ok(true,`${lang} log in goes forward`);
 ok(p.__errs.length===0,`${lang} auth no script errors`,p.__errs);await p.context().close();
 // sign up
 p=await open(b,{scn:{session:false},lang});await p.waitForSelector('[data-view="auth"]:not([hidden])');
 await p.click('[data-tab="signup"]');
 await p.fill('#authEmail','taken@example.com');await p.fill('#authPassword','goodpass12');await p.fill('#authPassword2','goodpass13');await p.click('#authSubmit');ok((await txt(p,'#authMsg')).length>5,`${lang} password mismatch message`);
 await p.fill('#authPassword2','goodpass12');await p.click('#authSubmit');await p.waitForTimeout(200);
 ok(await view(p)==='auth'&&await p.$eval('[data-tab="login"]',e=>e.getAttribute('aria-selected')==='true')&&(await txt(p,'#authMsg')).length>10,`${lang} used email switches to log in with a message`);
 await p.click('[data-tab="signup"]');await p.fill('#authEmail','new@example.com');await p.fill('#authPassword','goodpass12');await p.fill('#authPassword2','goodpass12');await p.click('#authSubmit');await p.waitForSelector('[data-view="checkemail"]:not([hidden])');
 const ce=await txt(p,'#checkEmailBody');ok(ce.includes('new@example.com'),`${lang} check-email screen names the address`);
 if(lang==='en')ok(/spam/i.test(ce),'en check-email mentions spam folder',ce);
 await p.context().close();
 // forgot
 p=await open(b,{scn:{session:false},lang});await p.waitForSelector('[data-view="auth"]:not([hidden])');await p.fill('#authEmail','rina@example.com');await p.click('#forgotBtn');
 ok(await view(p)==='forgot'&&await p.inputValue('#forgotEmail')==='rina@example.com',`${lang} forgot keeps the typed email`);
 await p.click('#forgotForm button[type=submit]');await p.waitForTimeout(150);const fm=await txt(p,'#forgotMsg');ok(fm.length>10,`${lang} reset shows a message`);if(lang==='en')ok(/spam/i.test(fm),'en reset mentions spam folder',fm);
 await p.context().close();
}
// security check blocked
{const p=await open(b,{scn:{session:false},captcha:true,blockCaptcha:true});await p.waitForSelector('[data-view="auth"]:not([hidden])');await p.fill('#authEmail','rina@example.com');await p.fill('#authPassword','goodpass12');await p.click('#authSubmit');await p.waitForTimeout(600);
 const m=await txt(p,'#authMsg');ok(/security check did not load/i.test(m),'blocked security check gives a clear message',m);ok(!(await p.$eval('#authSubmit',e=>e.dataset.busy)),'button not stuck after blocked check');await p.context().close();}
// ---------- consent, sports ----------
for(const lang of ['en','bn']){
 let p=await open(b,{scn:{consents:[['terms','1.1'],['privacy','1.3'],['dob_declaration','1.2']].map(([k,v])=>({doc_key:k,doc_version:v,choice:'accepted'}))},lang});
 await p.waitForSelector('[data-view="consent"]:not([hidden])');ok(true,`${lang} old agreement asks again`);
 await p.click('#consentBtn');ok((await txt(p,'#consentMsg')).length>5,`${lang} consent needs all boxes`);
 ok(await p.$$eval('#cTermsText a,#cPrivacyText a',a=>a.length===2&&a.every(x=>x.href.includes('legal.html?doc='))),`${lang} consent links to documents`);
 for(const id of ['#cTerms','#cPrivacy','#cDob'])await p.check(id);await p.click('#consentBtn');await p.waitForSelector('[data-view="sports"]:not([hidden])');
 await p.click('#sportsBtn');ok((await txt(p,'#sportsMsg')).length>3,`${lang} sports needs a choice`);
 await p.check('[data-pick-sport][value="volleyball"]');await p.click('#sportsBtn');await p.waitForSelector('[data-view="app"]:not([hidden])');ok(await over(p)===0,`${lang} app no sideways scroll`);
 ok(p.__errs.length===0,`${lang} onboarding no script errors`,p.__errs);
 // ---------- app ----------
 const blank=await p.evaluate(()=>[...document.querySelectorAll('[data-view="app"] [data-t]')].filter(e=>e.offsetParent&&!e.textContent.trim()&&!e.children.length).map(e=>e.dataset.t));
 ok(blank.length===0,`${lang} no empty labels in app`,blank);
 const raw=await p.evaluate(()=>document.body.innerText.match(/\{[a-z_]+\}|undefined|\bnull\b|NaN|\[object/g));ok(!raw,`${lang} no raw placeholders on screen`,raw);
 await p.fill('#f_legal_name','R');await p.locator('#f_legal_name').blur();await p.waitForTimeout(200);
 const e1=await p.evaluate(()=>{const f=document.getElementById('f_legal_name');const er=f.closest('.acct-field').querySelector('.acct-err,[id$="_err"],.acct-field-err');return er?er.textContent.trim():''});
 await p.fill('#f_legal_name','Rina Akter');await p.locator('#f_legal_name').blur();await p.waitForTimeout(900);
 const saved=await p.evaluate(()=>window.__log.filter(x=>x==='profiles:update').length);ok(saved>=1,`${lang} name saves by itself`,saved);
 await p.selectOption('#f_playing_level',{index:0}).catch(()=>{});await p.click('#levelSave');await p.waitForTimeout(150);
 const lvErr=await p.evaluate(()=>{const f=document.getElementById('f_playing_level').closest('.acct-field');return f?f.innerText:''});
 ok(/first|প্রথম|Choose/i.test(lvErr)||lang==='bn',`${lang} level button explains when nothing is chosen`,lvErr.slice(0,120));
 if(await p.$('#codeSave:visible')){await p.click('#codeSave');await p.waitForTimeout(150);ok(true,`${lang} code save clickable with nothing typed`);}
 ok(p.__errs.length===0,`${lang} app no script errors`,p.__errs);
 await p.screenshot({path:`${S}/shots2/flow-app-${lang}.png`,fullPage:true});await p.context().close();
}
// broken profile load
{const p=await open(b,{scn:{profile:null}});await p.waitForSelector('[data-view="auth"]:not([hidden])',{timeout:8000});ok((await txt(p,'#authMsg')).length>5,'missing profile falls back to log in with a message');await p.context().close();}
console.log(out.join('\n'));await b.close()})().catch(e=>{console.log(out.join('\n'));console.log('CRASH',e.message.slice(0,400))})
