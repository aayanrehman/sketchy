import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
process.env.PORT='0';process.env.AI_MODE='mock';process.env.NODE_ENV='test';
const {server,io,rooms}=await import('../server/src/index');
if(!server.listening)await new Promise<void>(r=>server.once('listening',r));
const base=`http://127.0.0.1:${(server.address() as any).port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
const pause=(ms=450)=>new Promise(r=>setTimeout(r,ms));
try{
 await page.goto(`${base}/demo`);await page.getByRole('button',{name:'Start demo',exact:true}).click();await page.getByRole('button',{name:'Got it',exact:true}).waitFor();
 const room=[...rooms.values()][0];const human=room.players.find(p=>!p.isBot)!;
 for(let game=0;game<2;game++){
  await page.getByRole('button',{name:'Got it',exact:true}).click();await pause();room.advance();await pause();
  for(let round=1;round<=2;round++){
   assert.equal(room.round,round);assert.equal(room.currentRound()!.imposterId===human.id,round===2);
   await page.getByRole('button',{name:'Submit (blank)',exact:true}).click();
   await page.getByRole('heading',{name:'Glow-up gallery',exact:true}).waitFor();
   room.advance();await pause();room.skip(null);await pause();
   const r=room.currentRound()!;const target=r.participantIds.find(id=>id!==human.id)!;
   await page.locator(`[data-tile="${target}"]`).click();
   await pause();if(room.phase==='VOTE')room.advance();await pause();room.advance();await pause();
   if(room.phase==='STEAL'){if(r.imposterId===human.id)await page.getByRole('button',{name:`Option ${r.stealOptions.indexOf(r.realPrompt)+1}: ${r.realPrompt}`,exact:true}).click();room.advance();}
   await page.getByRole('heading',{name:'The whole picture'}).waitFor();
   await page.getByRole('button',{name:'I’ve reviewed the results · Continue'}).click();await pause();room.advance();await pause();
   if(round===1){room.advance();await pause();}
  }
  await page.getByRole('button',{name:'Try both roles again'}).waitFor();
  if(!game){await fs.mkdir('artifacts/browser',{recursive:true});await page.screenshot({path:'artifacts/browser/demo-final.png',fullPage:true});await page.getByRole('button',{name:'Try both roles again'}).click();await pause();}
 }
 assert.deepEqual(errors,[]);console.log('PASS: solo demo and replay, artist then imposter, both rounds, no page errors.');
}finally{await browser.close();for(const r of rooms.values())r.destroy();await new Promise<void>(r=>io.close(()=>r()));server.close();}
