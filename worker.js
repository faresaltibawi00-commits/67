const C={'access-control-allow-origin':'*','access-control-allow-headers':'content-type,authorization','access-control-allow-methods':'GET,POST,OPTIONS'};
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...C,'content-type':'application/json'}});
const PR={"تنّور":45,"ومضة":60,"سلام":55,"قوّة":50,"بُنّ":40,"أعمالي":35};
const enc=new TextEncoder();
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const sign=async(m,k)=>hex(await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',enc.encode(k),{name:'HMAC',hash:'SHA-256'},false,['sign']),enc.encode(m)));
const dg=t=>String(t||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g,'');
const same=async(a,b,k)=>(await sign(a,k))===(await sign(b,k));
async function authed(req,env){const [e,g]=(req.headers.get('authorization')||'').slice(7).split('.');return !!e&&+e>Date.now()&&g===await sign(e,env.SECRET)}
export default{async fetch(req,env){
if(req.method==='OPTIONS')return new Response(null,{headers:C});
const u=new URL(req.url),p=u.pathname;
try{
if(p==='/api/order'&&req.method==='POST'){
 const b=await req.json(),name=String(b.name||'').trim().slice(0,60),phone=dg(b.phone).slice(0,15);
 if(name.length<2||phone.length<6||!Array.isArray(b.items)||!b.items.length||b.items.length>20)return J({error:'bad'},400);
 const items=b.items.map(x=>({t:String(x.t).slice(0,30),n:String(x.n).slice(0,30),pr:PR[x.n]}));
 if(items.some(x=>!x.pr))return J({error:'bad item'},400);
 const total=items.reduce((a,x)=>a+x.pr,0),o={name,phone,items,total,at:Date.now()};
 await env.STORE.put('o:'+String(9e15-Date.now()).padStart(16,'0')+Math.random().toString(36).slice(2,6),JSON.stringify(o),{expirationTtl:7776000});
 if(env.TG_TOKEN&&env.TG_CHAT)await fetch('https://api.telegram.org/bot'+env.TG_TOKEN+'/sendMessage',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:env.TG_CHAT,text:'طلب جديد\n'+name+' '+phone+'\n'+items.map(x=>x.t+' '+x.n).join('، ')+'\nالمجموع '+total+' د.ك'})}).catch(()=>{});
 return J({ok:1})}
if(p==='/api/messages'){const ph=dg(u.searchParams.get('phone'));
 const [b,i]=await Promise.all([env.STORE.get('b'),ph?env.STORE.get('i:'+ph):null]);
 return J({b:b?JSON.parse(b):null,i:i?JSON.parse(i):null})}
if(p==='/api/login'&&req.method==='POST'){const b=await req.json();
 const ok=(await same(String(b.name||'').trim().toLowerCase(),String(env.OWNER_NAME).toLowerCase(),env.SECRET))&&(await same(dg(b.phone),dg(env.OWNER_PASS),env.SECRET));
 if(!ok)return J({error:'no'},401);
 const e=Date.now()+432e5;return J({token:e+'.'+await sign(''+e,env.SECRET)})}
if(p==='/api/orders'){if(!await authed(req,env))return J({error:'auth'},401);
 const l=await env.STORE.list({prefix:'o:',limit:100});
 const orders=(await Promise.all(l.keys.map(k=>env.STORE.get(k.name)))).filter(Boolean).map(x=>JSON.parse(x));
 return J({orders})}
if(p==='/api/send'&&req.method==='POST'){if(!await authed(req,env))return J({error:'auth'},401);
 const b=await req.json(),text=String(b.text||'').trim().slice(0,300);if(!text)return J({error:'empty'},400);
 const m=JSON.stringify({text,at:Date.now()});
 if(b.to==='all')await env.STORE.put('b',m);else{const ph=dg(b.to);if(ph.length<6)return J({error:'phone'},400);await env.STORE.put('i:'+ph,m,{expirationTtl:2592000})}
 return J({ok:1})}
return J({error:'not found'},404)
}catch(e){return J({error:'server'},500)}}}
