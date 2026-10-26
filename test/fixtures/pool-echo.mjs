// Backend-only transport test. No SDK, tokens, cloud or real cameras.
import { createInterface } from 'node:readline';
const active=new Map();
const send=(id,value)=>console.log(JSON.stringify({...value,streamId:id}));
for await(const line of createInterface({input:process.stdin})) {
 const m=JSON.parse(line);
 if(m.action==='start') {active.set(m.streamId,m.config.serial);send(m.streamId,{pid:process.pid,camera:m.config.serial});}
 if(m.action==='command') send(m.streamId,{camera:active.get(m.streamId)});
 if(m.action==='stop') {active.delete(m.streamId);send(m.streamId,{stage:'pool-ended',exitCode:0});}
}
