import test from 'node:test';
import assert from 'node:assert/strict';
import { io as client, type Socket } from 'socket.io-client';
process.env.PORT = '0'; process.env.AI_MODE = 'off'; process.env.NODE_ENV = 'test';
const { server, io, rooms } = await import('./index');
if (!server.listening) await new Promise<void>(r => server.once('listening', r));
const port = (server.address() as {port:number}).port;
const clients: Socket[] = [];
const connect = async () => { const s = client(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew:true }); clients.push(s); await new Promise<void>((r,j) => {s.once('connect',r);s.once('connect_error',j)}); return s; };
const ack = (s: Socket, e: string, p?: any): Promise<any> => new Promise((r,j) => { const cb = (err:any,res:any) => err ? j(err) : r(res); if (p === undefined) s.timeout(2000).emit(e,cb); else s.timeout(2000).emit(e,p,cb); });
const tick = () => new Promise(r => setTimeout(r, 30));

test('real Socket.IO protocol: creator credentials, read-only watchers, full rooms, reconnect, games/rematches and malformed input', async () => {
  try {
    const creator = await connect(); const created = await ack(creator, 'screen:create'); assert.ok(created.ok); assert.equal(created.hostToken.length, 64);
    const room = rooms.get(created.code)!;
    const watcher = await connect(); assert.ok((await ack(watcher,'screen:watch',{code:created.code})).ok);
    let watched:any; watcher.on('state', s => { watched = s; });
    const players: {s:Socket,id:string,token:string}[] = [];
    for (let i=0;i<8;i++) { const s=await connect(); const joined=await ack(s,'join',{code:created.code,name:`Person ${i}`});assert.ok(joined.ok); players.push({s,id:joined.playerId,token:joined.token}); }
    assert.equal(room.hostId,null,'room code does not grant a player host');
    watcher.emit('host:start'); players[0].s.emit('host:start'); await tick(); assert.equal(room.phase,'LOBBY');
    assert.equal(watched.canHost,false); assert.equal(JSON.stringify(watched).includes(created.hostToken),false);
    const invalid = await connect(); const bad = await ack(invalid,'screen:watch',{code:created.code,hostToken:'f'.repeat(64)});assert.equal(bad.ok,false);
    const full = await ack(invalid,'join',{code:created.code,name:'Overflow'});assert.equal(full.ok,false);
    const malformed = await ack(invalid,'join',null); assert.equal(malformed.ok,false);
    invalid.emit('draw:submit',{strokes:[{points:null}],png:7}); await tick(); assert.equal(room.phase,'LOBBY');
    creator.emit('host:assign',{playerId:players[0].id});await tick();assert.equal(room.hostId,players[0].id);
    creator.disconnect(); const replacement=await connect();assert.ok((await ack(replacement,'screen:watch',{code:created.code,hostToken:created.hostToken})).ok);
    for (let game=0;game<2;game++) {
      if (game) await new Promise(r => setTimeout(r, 10010));
      players[0].s.emit('host:start');await tick();assert.equal(room.phase,'HOW_TO');
      for (const p of players) p.s.emit('howto:ready'); await tick();assert.equal(room.phase,'PROMPT');
      for (let round=0;round<3;round++) {
        room.advance(); assert.equal(room.phase,'DRAW');
        for (const p of players) p.s.emit('draw:submit',{strokes:[],png:''});await tick();assert.equal(room.phase,'GALLERY');
        room.advance();watcher.emit('host:skip');await tick();assert.equal(room.phase,'DISCUSS');
        players[1].s.emit('chat:send',{text:'The prop looks suspicious.'});await tick(); assert.equal(room.chat.length,1);
        replacement.emit('host:skip');await tick();assert.equal(room.phase,'VOTE');
        const r=room.currentRound()!;
        for (const p of players) p.s.emit('vote',{targetId:p.id===r.imposterId?players.find(x=>x.id!==p.id)!.id:r.imposterId});
        await tick();assert.equal(room.phase,'UNMASK');assert.equal(watched.room.rounds[round].realPrompt,'');
        room.advance();assert.equal(room.phase,'STEAL');assert.equal(watched.room.rounds[round].promptPairId,0);
        assert.equal(r.stealOptions.includes(r.decoyPrompt),false);
        room.advance();assert.equal(room.phase,'VERDICT');for(const p of players)p.s.emit('verdict:ready');await tick();assert.equal(room.phase,'SCORES');
        assert.ok(!r.awards.some(a=>['perfect_disguise','judges_favorite'].includes(a.reason)));
        room.advance();
      }
      assert.equal(room.phase,'FINAL');watcher.emit('host:playAgain');await tick();assert.equal(room.phase,'FINAL');
      replacement.emit('host:playAgain');await tick();assert.equal(room.phase,'LOBBY');
    }
    const before=players[1];before.s.disconnect(); await tick();
    const renewed=await connect();const joined=await ack(renewed,'join',{code:created.code,name:'Renamed',token:before.token});assert.equal(joined.playerId,before.id);assert.equal(room.players.length,8);
    const expired=await ack(invalid,'join',{code:created.code,name:'No',token:'e'.repeat(32)});assert.equal(expired.ok,false);
    assert.equal((await fetch(`http://127.0.0.1:${port}/api/studio/content`)).status,503);
  } finally { clients.forEach(s=>s.disconnect());for(const r of rooms.values())r.destroy();await new Promise<void>(r=>io.close(()=>r()));server.close(); }
});
