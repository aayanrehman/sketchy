import { chromium } from '@playwright/test';
import { io as connect } from 'socket.io-client';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
process.env.PORT = '0'; process.env.AI_MODE = 'off'; process.env.NODE_ENV = 'test';
const { server, io, rooms } = await import('../server/src/index');
if (!server.listening) await new Promise<void>(r => server.once('listening', r));
const base = `http://127.0.0.1:${(server.address() as any).port}`;
const out = 'artifacts/browser'; await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({ channel: 'chrome', headless:true });
const ctx = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
const phone = await ctx.newPage(); const errors:string[]=[]; phone.on('pageerror',e=>errors.push(e.message));
const desktop = await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const clients: ReturnType<typeof connect>[]=[];
const checks:any[]=[]; let activeRoom:any;
const pause = (ms=350) => new Promise(r=>setTimeout(r,ms));
async function capture(label:string) {
  if (activeRoom) { clearTimeout(activeRoom.timer); if (activeRoom.phaseEndsAt) activeRoom.phaseEndsAt = Date.now() + 600000; activeRoom.broadcast(); }
  await phone.evaluate(() => document.fonts.ready);
  for (const [width,height] of [[320,568],[390,844],[768,1024],[1440,1000]]) {
    await phone.setViewportSize({width,height}); await pause(1000);
    await phone.evaluate(() => window.scrollTo(0, 0));
    await phone.screenshot({path:`${out}/${label}-${width}.png`,fullPage:true});
    const overflow=await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    checks.push({label,width,overflow});assert.equal(overflow,false,`${label} overflows at ${width}`);
  }
  await phone.setViewportSize({width:390,height:844});
}
try {
  await phone.goto(base);await pause();await capture('landing');
  await phone.getByRole('button',{name:'How to play',exact:true}).click();await phone.keyboard.press('Escape');
  await desktop.goto(`${base}/host`);await desktop.waitForURL('**/host?code=*');
  const code=new URL(desktop.url()).searchParams.get('code')!;const room=rooms.get(code)!;activeRoom=room;
  await phone.goto(`${base}/play?code=${code}`);await phone.getByLabel('Your name',{exact:true}).fill('LongPlayer12');await phone.getByRole('button',{name:'Join game',exact:true}).click();
  await phone.getByRole('heading',{name:`Room ${code}`}).waitFor();
  for(let i=0;i<7;i++) {
    const s=connect(base,{transports:['websocket']});clients.push(s);await new Promise<void>(r=>s.once('connect',()=>r()));
    await new Promise(r=>s.emit('join',{code,name:`PlayerLong${i}`},r));
  }
  await pause(); await capture('lobby');await desktop.screenshot({path:`${out}/host-lobby.png`,fullPage:true});
  await desktop.getByRole('button',{name:'Start the show'}).click();await pause();await capture('instructions');
  clients.forEach(s=>s.emit('howto:ready'));await phone.getByRole('button',{name:'Got it',exact:true}).click();await pause();
  await capture('prompt');room.advance();await pause();
  await phone.locator('canvas.draw__canvas').waitFor();
  await phone.locator('canvas.draw__canvas').scrollIntoViewIfNeeded();
  const box=await phone.locator('canvas.draw__canvas').boundingBox();assert.ok(box);
  await phone.mouse.move(box.x+40,box.y+40);await phone.mouse.down();await phone.mouse.move(box.x+150,box.y+140,{steps:12});await phone.mouse.up();
  await phone.getByRole('button',{name:'Undo',exact:true}).click();
  await phone.mouse.move(box.x+80,box.y+60);await phone.mouse.down();await phone.mouse.move(box.x+130,box.y+160,{steps:10});await phone.mouse.up();
  await capture('draw');await phone.getByRole('button',{name:'Submit drawing',exact:true}).click();
  clients.forEach(s=>s.emit('draw:submit',{strokes:[],png:''}));await pause();assert.equal(room.phase,'GALLERY');await capture('gallery');
  room.advance();await pause();await phone.getByLabel('Your clue').fill('The prop is suspicious.');await phone.getByRole('button',{name:'Send',exact:true}).click();await pause();assert.equal(room.chat.length,1);await capture('discussion');
  room.advance();await pause();await capture('vote');
  const r=room.currentRound()!;const human=room.players[0];
  const target=r.imposterId===human.id?room.players[1].id:r.imposterId;
  await phone.locator(`[data-tile="${target}"]`).click();
  for(const p of room.players.slice(1))room.vote(p.id,p.id===r.imposterId?human.id:r.imposterId);
  await pause();assert.equal(room.phase,'UNMASK');await capture('unmask');
  room.advance();await pause();await capture('steal');room.advance();await pause();await capture('verdict');
  for(let i=0;i<7;i++) await phone.getByRole('button',{name:'Next',exact:true}).click();
  await phone.getByRole('button',{name:'Next',exact:true}).isDisabled().then(disabled=>assert.ok(disabled));
  await phone.getByRole('button',{name:'I’ve reviewed the results · Continue'}).click();room.players.slice(1).forEach(p=>room.readyVerdict(p.id));await pause();await capture('scores');
  room.totalRounds=1;room.advance();await pause();assert.equal(await phone.evaluate(() => scrollY),0,'New phase starts at the top');await capture('final');
  assert.equal(await phone.locator('section[aria-label]').count(),1, 'Only the active phase is exposed');
  const download=phone.waitForEvent('download');await phone.getByRole('button',{name:'Save result card'}).click();await (await download).saveAs(`${out}/result-card.png`);
  await desktop.getByRole('button',{name:'Play again',exact:true}).click();await pause();assert.equal(room.phase,'LOBBY');
  await phone.reload();await phone.getByRole('heading',{name:`Room ${code}`}).waitFor();assert.equal(room.players.length,8);
  await phone.evaluate(()=>document.body.style.zoom='2');await phone.screenshot({path:`${out}/zoom-200.png`,fullPage:true}).catch(()=>{});
  assert.deepEqual(errors,[]);await fs.writeFile(`${out}/checks.json`,JSON.stringify({checks,errors,observations:['Pointer drawing and undo','Eight-player vote','All eight verdicts reachable','Result PNG downloaded','Rematch and phone refresh retain seat']},null,2));
  console.log(`PASS: ${checks.length} phase/viewport captures and meaningful interactions`);
} finally { clients.forEach(s=>s.disconnect());await browser.close();for(const r of rooms.values())r.destroy();await new Promise<void>(r=>io.close(()=>r()));server.close(); }
