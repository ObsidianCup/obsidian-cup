// Stand-in for supabase-js with a small in-memory "database". Scenario comes from window.__scn.
(function(){
  const scn = Object.assign({ session:true, profile:{}, consents:'current', emailTaken:'taken@example.com' }, window.__scn||{});
  const base = {id:'u1',email:'rina@example.com',player_code:null,legal_name:null,display_name:null,date_of_birth:null,gender:null,phone:null,sports:[],positions:{},language:'en',avatar_version:0,playing_level:null,deletion_requested_at:null,dob_changes:0,code_changes:0};
  let profile = scn.profile===null ? null : Object.assign({}, base, scn.profile);
  let consents = scn.consents==='current' ? [['terms','1.2'],['privacy','1.4'],['dob_declaration','1.2']].map(([k,v])=>({doc_key:k,doc_version:v,choice:'accepted'})) : (scn.consents||[]);
  const log = window.__log = [];
  const user={id:'u1',email:'rina@example.com',app_metadata:{providers:['email']}};
  let cb=()=>{}; let session = scn.session ? {user} : null;
  function builder(table){
    const st={op:'select',payload:null};
    const run=()=>{ log.push(table+':'+st.op);
      if (window.__fail && window.__fail.test(table+':'+st.op)) return {data:null,error:{message:'boom'}};
      if(table==='profiles'){ if(st.op==='update'){ Object.assign(profile, st.payload); } return {data: profile?Object.assign({},profile):null, error:null}; }
      if(table==='my_consents') return {data:consents.slice(),error:null};
      if(table==='consent_records'){ if(st.op==='insert'){ [].concat(st.payload).forEach(r=>{consents=consents.filter(c=>c.doc_key!==r.doc_key).concat([r])}); } return {data:null,error:null}; }
      if(table==='site_settings') return {data:{on_off:!!scn.liveCard},error:null};
      return {data:[],error:null}; };
    const p=new Proxy(function(){}, { get(_,k){ if(k==='then') return (res,rej)=>Promise.resolve(run()).then(res,rej);
      if(k==='update'||k==='insert'||k==='upsert') return (payload)=>{st.op=k==='upsert'?'update':k;st.payload=payload;return p};
      if(k==='delete') return ()=>{st.op='delete';return p};
      return ()=>p; }, apply(){return p} });
    return p;
  }
  window.supabase={ createClient(){ return {
    auth:{ onAuthStateChange(f){cb=f; setTimeout(()=>f('INITIAL_SESSION',session),0); return {data:{subscription:{unsubscribe(){}}}};},
      signOut: async()=>{ session=null; setTimeout(()=>cb('SIGNED_OUT',null),0); return {error:null}; },
      getSession: async()=>({data:{session}}), getUser: async()=>({data:{user:session?user:null}}),
      signUp: async({email})=>{ log.push('signUp'); if(email===scn.emailTaken) return {data:{user:{identities:[]},session:null},error:null}; return {data:{user:{identities:[{}]},session:null},error:null}; },
      signInWithPassword: async({password})=>{ log.push('signIn'); if(password==='wrongpass1') return {data:{},error:{message:'Invalid login credentials'}}; session={user}; setTimeout(()=>cb('SIGNED_IN',session),0); return {data:{session},error:null}; },
      signInWithOAuth: async()=>{ log.push('oauth'); return {error:null}; },
      resetPasswordForEmail: async()=>{ log.push('reset'); return {error:null}; },
      updateUser: async()=>({error:null}), setSession: async()=>({error:null}) },
    from: builder,
    rpc: async(n,args)=>{ log.push('rpc:'+n);
      if(n==='request_account_deletion') return window.__delErr?{data:null,error:{message:window.__delErr}}:{data:'2026-11-27T10:00:00Z',error:null};
      if(n==='cancel_account_deletion'){ if(profile) profile.deletion_requested_at=null; return {data:true,error:null}; }
      if(n==='player_code_status') return {data: /999$/.test(args.p_code)?'taken':'ok', error:null};
      if(n==='suggest_player_codes') return {data:['OC-RA101','OC-RA202','OC-RA303'],error:null};
      if(n==='choose_player_code'){ profile.player_code=args.p_code; profile.code_changes=(profile.code_changes||0)+1; return {data:args.p_code,error:null}; }
      if(n==='my_card') return {data:null,error:null};
      return {data:null,error:null}; },
    storage:{ from(){ return { download: async()=>({data:null,error:{message:'none'}}), upload: async()=>({error:null}), remove: async()=>({error:null}), createSignedUrl: async()=>({data:null,error:null}) }; } },
    channel(){ return builder('x'); }, removeChannel(){},
  }; }};
})();
