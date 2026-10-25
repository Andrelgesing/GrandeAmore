const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{constructor(){this.children=[];this.textContent='';}append(...items){this.children.push(...items);}replaceChildren(){this.children=[];}setAttribute(){}getAttribute(){return null;}}
const nodes=new Map();const query=s=>{if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);};
const context=vm.createContext({document:{createElement:()=>new Element(),querySelector:query,dispatchEvent(){}},Event:class{},stars:()=>new Element(),openPlayerCard(){}});
vm.runInContext("const players=['Gain','Loss','Neutral','Absent'].map((name,i)=>({name,elo:1200-i,position:'CM',primaryPosition:'CM',rating:4}));let rankedPlayers;const mvpList=document.querySelector('#mvp-list'),mvpToggle=document.querySelector('#mvp-toggle');let mvpLimit=10;const tournamentEloAdjustments={Gain:20,Loss:-40,Neutral:0};",context);
const source=fs.readFileSync(__dirname+'/players.js','utf8');
vm.runInContext(source.slice(source.indexOf('function renderMvp()'),source.indexOf("mvpToggle.addEventListener('click'"))+'renderMvp();',context);
const cells=query('#mvp-list').children.map(row=>row.children.at(-1));
for(const [i,cls,text] of [[0,'elo-gain',' (+20)'],[1,'elo-loss',' (-40)'],[2,'elo-neutral',' (0)']]){assert.equal(cells[i].children[0].className,'elo-adjustment '+cls);assert.equal(cells[i].children[0].textContent,text);}
assert.equal(cells[3].children.length,0);
console.log('Passed: Stats renders signed gains, losses, explicit grey zero, and no annotation for nonparticipants.');
