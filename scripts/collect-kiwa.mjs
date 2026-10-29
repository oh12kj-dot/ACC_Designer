// Supervised by the local Next server; all durable changes happen through its locked store.
const [origin,token,parent]=process.argv.slice(2);
if(!origin||!token||!parent)process.exit(1);
for(;;){
 try{process.kill(Number(parent),0);const res=await fetch(origin+'/api/catalog');if(!res.ok)break;const {state}=await res.json();if(state.status!=='running')break;const delay=Math.max(0,state.nextRequestAt-Date.now());if(delay)await new Promise(r=>setTimeout(r,delay));const result=await fetch(origin+'/api/catalog',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Catalog-Token':token},body:JSON.stringify({command:'step'})});if(!result.ok)break;const next=await result.json();if(next.status!=='running')break;await new Promise(r=>setTimeout(r,2000));}catch{break;}
}
