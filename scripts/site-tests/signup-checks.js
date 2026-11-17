// Sign-up asks for the full name first; an unfinished account gets a clear prompt.
const {chromium}=require('playwright');const fs=require('fs');const R=require('path').resolve(__dirname,'../..');   // run with the site served on http://localhost:8765
const fake=fs.readFileSync(R+'/scripts/site-tests/fake-supabase.js','utf8');
async function ctx(b,scn,w=1280){const c=await b.newContext({viewport:{width:w,height:900}});await c.addInitScript(s=>{window.__scn=s},scn);
 await c.route('**/supabase-js-2.118.0.js',r=>r.fulfill({contentType:'application/javascript',body:fake}));
 await c.route('**/js/config.js',async r=>{const res=await r.fetch();let t=await res.text();t=t.replace(/turnstileSiteKey:\s*"[^"]*"/,'turnstileSiteKey: ""');r.fulfill({response:res,body:t})});
 await c.route(/googletagmanager|challenges/,r=>r.abort());return c;}
(async()=>{const b=await chromium.launch();let bad=0;const say=(ok,m)=>{console.log(ok?'ok  ':'FAIL',m);if(!ok)bad++};
 {const c=await ctx(b,{session:false});const p=await c.newPage();await p.goto('http://localhost:8765/pages/account.html');await p.waitForSelector('[data-view="auth"]:not([hidden])');
  say(await p.locator('#nameField').isHidden(),'log in: no name field');
  await p.click('[data-tab=signup]');
  const order=await p.evaluate(()=>[...document.querySelectorAll('#authForm .acct-field:not([hidden]) label')].map(l=>l.textContent.trim()));
  say(order[0].startsWith('Full name'),'sign up: name comes first ('+order.join(' | ')+')');
  await p.fill('#authEmail','new@example.com');await p.fill('#authPassword','longpassword');await p.fill('#authPassword2','longpassword');await p.click('#authSubmit');await p.waitForTimeout(300);
  say(/full name/i.test(await p.textContent('#authMsg')),'sign up without a name is stopped with a clear message');
  say(await p.evaluate(()=>document.activeElement.id)==='authName','and the name field gets the focus');
  await p.screenshot({path:'/tmp/srv/su-form.png'});await c.close();}
 {const c=await ctx(b,{profile:{player_code:'OC-RA427',legal_name:'Rina Akter',display_name:'Rina',sports:['volleyball'],positions:{volleyball:['setter']}}});const p=await c.newPage();
  await p.goto('http://localhost:8765/pages/account.html');await p.waitForSelector('[data-view="app"]:not([hidden])');await p.waitForTimeout(300);
  say(await p.locator('#unfinishedCard').isVisible(),'no date of birth or gender: the not-finished card shows');
  const body=await p.textContent('#unfinishedBody');say(/date of birth and gender/.test(body),'it names what is missing: '+body);
  await p.screenshot({path:'/tmp/srv/su-card.png'});
  await p.click('#unfinishedGo');await p.waitForTimeout(800);say(await p.evaluate(()=>document.activeElement.id)==='f_date_of_birth','Finish my profile jumps to the first missing field');await c.close();}
 {const c=await ctx(b,{profile:{player_code:'OC-RA427',legal_name:'Rina Akter',date_of_birth:'2004-05-01',gender:'female',sports:['volleyball'],positions:{volleyball:['setter']}}});const p=await c.newPage();
  await p.goto('http://localhost:8765/pages/account.html');await p.waitForSelector('[data-view="app"]:not([hidden])');await p.waitForTimeout(300);
  say(await p.locator('#unfinishedCard').isHidden(),'a finished account does not see the card');await c.close();}
 console.log('failures',bad);await b.close()})();
