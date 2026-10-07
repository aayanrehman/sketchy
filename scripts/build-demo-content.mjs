// Authored sketch fixtures paired with built-in ImageGen sample art.
// These are illustrative demo scores, NOT measured OpenAI judge responses.
import fs from 'node:fs';
const ink = '#2B2540';
function sketch(theme, idx) {
  const strokes=[];const d=idx*3;
  const line=(points,color=ink,size=7)=>strokes.push({color,size,points:points.map(([x,y],i)=>({x:x+d+Math.sin(i*2.3+idx)*1.4,y:y+Math.cos(i*1.7+idx)*1.4}))});
  const ellipse=(x,y,rx,ry,color=ink)=>line(Array.from({length:45},(_,i)=>[x+Math.cos(i/44*Math.PI*2)*rx,y+Math.sin(i/44*Math.PI*2)*ry]),color);
  if(theme==='cat') {
    ellipse(247,207,97,86,idx===1?'#0072B2':idx===2?'#CC79A7':'#D55E00');
    line([[164,150],[160,80],[220,130]]);line([[280,130],[337,78],[334,155]]);
    line([[202,193],[217,184],[232,195]]);line([[267,195],[282,184],[297,193]]);
    line([[241,214],[250,220],[259,212]]);line([[250,220],[250,237],[231,245],[215,233]]);line([[250,237],[270,245],[287,232]]);
    line([[170,210],[124,199]]);line([[174,225],[121,230]]);line([[314,210],[365,198]]);line([[314,225],[366,228]]);
    if(idx<3){
      line([[153,194],[150,150],[165,111],[196,90],[250,82],[300,94],[335,131],[344,194]],'#CC79A7',11);
      ellipse(153,199,15,33,'#CC79A7');ellipse(342,199,15,33,'#CC79A7');
      line([[185,275],[163,333],[177,363]]);line([[300,274],[324,336],[304,357]]);
      line([[100,350],[393,350],[410,425],[89,425],[100,350]],'#0072B2');
      ellipse(162,383,48,23);ellipse(333,383,48,23);ellipse(162,383,12,7,'#CC79A7');ellipse(333,383,12,7,'#CC79A7');
      for(let x=227;x<283;x+=17)line([[x,369],[x,402]]);
    }else{
      line([[165,127],[148,92],[125,80],[120,52],[143,34],[169,39],[190,21],[221,22],[245,41],[270,24],[302,30],[319,52],[354,49],[373,73],[351,100],[331,119]],'#0072B2');
      line([[176,284],[164,370],[195,409],[313,409],[332,367],[309,281]]);
      line([[315,311],[356,319],[389,288]]);ellipse(411,267,45,22);line([[375,279],[349,305]]);line([[398,225],[421,198],[444,214],[436,225],[414,227],[398,225]],'#CC79A7');
      ellipse(240,321,4,4);ellipse(240,359,4,4);
    }
  }else{
    ellipse(173,157,48,44,'#009E73');ellipse(287,153,48,44,'#009E73');ellipse(231,214,111,83,'#009E73');
    line([[162,156],[180,168],[194,154]]);line([[270,153],[284,166],[301,151]]);line([[194,220],[209,235],[232,242],[256,233],[272,215]]);
    if(idx<3){
      line([[170,288],[139,338],[172,365]]);line([[290,285],[322,303],[349,321]]);
      ellipse(206,356,75,55,'#CC79A7');ellipse(218,341,20,20);line([[242,320],[364,268],[383,298],[257,363]],'#D55E00');
      for(let j=0;j<3;j++)line([[207,345+j*6],[374,281+j*5]],ink,3);
      line([[180,406],[120,430],[137,450],[229,435],[288,457],[333,442],[302,410]],'#009E73');
    }else{
      line([[140,294],[106,241],[112,163]],'#D55E00');line([[308,291],[356,238],[384,154]],'#D55E00');
      ellipse(175,354,69,24,'#CC79A7');ellipse(324,355,69,24,'#CC79A7');
      line([[106,354],[115,423],[232,423],[244,354]],'#CC79A7');line([[255,355],[263,423],[382,423],[393,355]],'#CC79A7');
      for(let x=122;x<393;x+=51)line([[x,371],[x,413]]);line([[134,423],[113,458]]);line([[350,423],[380,458]]);
    }
  }
  return strokes;
}
for(const [pairId,theme] of [[2,'cat'],[9,'frog']]){
  const entries=Array.from({length:4},(_,i)=>({strokes:sketch(theme,i),glowUrl:`/demo-art/${theme}-${i}.webp`,golden:i===2,match:[88,76,92,34][i],sees:theme==='cat'?(i===3?'a cat cooking a fish':'a cat mixing records'):(i===3?'a frog playing drums':'a frog strumming a guitar'),roast:['Tiny paws. Big stage presence.','The rhythm survived the anatomy.','I would buy this sticker.','Right animal. Wrong gig.'][i]}));
  fs.writeFileSync(`server/data/demo/${pairId}.json`,JSON.stringify({pairId,source:'prepared-sample',real:entries.slice(0,3),decoy:[entries[3]]})+'\n');
}
console.log('Prepared two illustrated demo pairs with authored sketches and example scores.');
