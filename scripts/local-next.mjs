import { spawn } from 'node:child_process';
import { localNodeOptions } from './local-next-options.mjs';
const [mode,...args]=process.argv.slice(2);if(!['dev','start'].includes(mode))throw new Error('Only local dev/start supported');
const rest=[];for(let i=0;i<args.length;i++){if(args[i]==='--hostname'||args[i]==='-H'){if(!['127.0.0.1','localhost','::1'].includes(args[++i]))throw new Error('Local storage requires a loopback listener');}else if(args[i].startsWith('--hostname='))throw new Error('Use --hostname 127.0.0.1');else rest.push(args[i]);}
const child=spawn(process.execPath,['node_modules/next/dist/bin/next',mode,'--hostname','127.0.0.1',...rest],{stdio:'inherit',windowsHide:true,env:{...process.env,NODE_OPTIONS:localNodeOptions(process.env.NODE_OPTIONS),ACC_LOCAL_BIND:'127.0.0.1'}});child.on('exit',(code)=>process.exit(code??1));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
