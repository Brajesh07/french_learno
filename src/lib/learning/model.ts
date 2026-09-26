export type Profile={name:string;level:string;focus:string;goal:number;largeText:boolean};
export type Mistake={id:string;due:string;stage:number;misses:number};
export type State={version:1;profile:Profile|null;xp:number;coins:number;hearts:number;completed:number[];correct:number;answered:number;mistakes:Mistake[];days:string[];daily:string[];seconds:Record<string,number>};
export const initialState:State={version:1,profile:null,xp:0,coins:0,hearts:5,completed:[],correct:0,answered:0,mistakes:[],days:[],daily:[],seconds:{}};
export function dateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function streak(days:string[],now=new Date()){const cursor=new Date(now);if(!days.includes(dateKey(cursor)))cursor.setDate(cursor.getDate()-1);let count=0;while(days.includes(dateKey(cursor))){count++;cursor.setDate(cursor.getDate()-1);}return count;}
export function normalize(value:string){return value.normalize('NFC').toLocaleLowerCase('fr').replace(/[’']/g,"'").replace(/[.,!?]/g,'').replace(/\s+/g,' ').trim();}
export function isCorrect(value:string,answer:string){return normalize(value)===normalize(answer);}
export function recordAnswer(state:State,id:string,correct:boolean,xp:number,review=false,now=new Date()):State{
 let mistakes=[...state.mistakes];const old=mistakes.find(m=>m.id===id);
 if(!correct){const entry={id,due:dateKey(now),stage:0,misses:(old?.misses||0)+1};mistakes=[...mistakes.filter(m=>m.id!==id),entry];}
 else if(old&&review){const stage=Math.min(old.stage+1,4);const due=new Date(now);due.setDate(due.getDate()+[1,3,7,21][stage-1]);mistakes=mistakes.map(m=>m.id===id?{...m,stage,due:dateKey(due)}:m);}
 return{...state,answered:state.answered+1,correct:state.correct+Number(correct),xp:state.xp+(correct?xp:0),hearts:correct&&review?Math.min(5,state.hearts+1):!correct&&!review?Math.max(0,state.hearts-1):state.hearts,mistakes};
}
export function completeSession(state:State,unit:number,mode:string,correct:number,total:number,seconds:number,now=new Date()):State{
 const today=dateKey(now),first=unit>0&&!state.completed.includes(unit),passed=correct/total>=.7,dailyBonus=mode==='daily'&&!state.daily.includes(today),lessonBonus=mode==='lesson'&&first&&passed&&correct===total?50:0;
 return{...state,xp:state.xp+lessonBonus+(dailyBonus?50:0),coins:state.coins+(mode==='lesson'&&first&&passed?10:0)+(dailyBonus?10:0),completed:mode==='lesson'&&passed?[...new Set([...state.completed,unit])]:state.completed,days:[...new Set([...state.days,today])],daily:mode==='daily'?[...new Set([...state.daily,today])]:state.daily,seconds:{...state.seconds,[today]:(state.seconds[today]||0)+seconds}};
}
/** Validate browser/database snapshots before rendering or writing them. */
export function parseState(raw:string|null):State {
 if (raw === null) return structuredClone(initialState);
 const value: unknown = JSON.parse(raw);
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid progress');
 const s = value as Record<string, unknown>;
 const integer = (v:unknown,max=1_000_000_000):v is number => Number.isSafeInteger(v) && Number(v)>=0 && Number(v)<=max;
 const isDate = (v:unknown):v is string => {
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;
 };
 const dates=(v:unknown):v is string[]=>Array.isArray(v)&&v.length<=36600&&v.every(isDate)&&new Set(v).size===v.length;
 if(s.version!==1||!integer(s.xp)||!integer(s.coins)||!integer(s.hearts,5)||!integer(s.correct)||!integer(s.answered)||s.correct>s.answered)throw Error('Invalid progress totals');
 if(!Array.isArray(s.completed)||s.completed.length>4||s.completed.some(n=>!integer(n,4)||n===0)||new Set(s.completed).size!==s.completed.length)throw Error('Invalid chapters');
 if(s.completed.some(n=>n>1&&!(s.completed as number[]).includes(n-1)))throw Error('Invalid chapter sequence');
 if(!dates(s.days)||!dates(s.daily)||s.daily.some(day=>!(s.days as string[]).includes(day)))throw Error('Invalid activity dates');
 if(!s.seconds||typeof s.seconds!=='object'||Array.isArray(s.seconds)||Object.entries(s.seconds).some(([day,seconds])=>!isDate(day)||!integer(seconds)))throw Error('Invalid learning time');
 if(s.profile!==null){
  if(!s.profile||typeof s.profile!=='object'||Array.isArray(s.profile))throw Error('Invalid profile');
  const p=s.profile as Record<string,unknown>;
  if(typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.level!=='string'||p.level.length>80||typeof p.focus!=='string'||p.focus.length>120||![5,10,15,20].includes(Number(p.goal))||typeof p.goal!=='number'||typeof p.largeText!=='boolean')throw Error('Invalid profile');
 }
 if(!Array.isArray(s.mistakes)||s.mistakes.length>20||s.mistakes.some(m=>!m||typeof m!=='object'||typeof m.id!=='string'||!/^fr-(00[1-9]|01[0-9]|020)$/.test(m.id)||!isDate(m.due)||!integer(m.stage,4)||!integer(m.misses)||m.misses<1)||new Set(s.mistakes.map(m=>m.id)).size!==s.mistakes.length)throw Error('Invalid review');
 return {version:1,profile:s.profile as Profile|null,xp:s.xp,coins:s.coins,hearts:s.hearts,completed:s.completed as number[],correct:s.correct,answered:s.answered,mistakes:s.mistakes as Mistake[],days:s.days,daily:s.daily,seconds:s.seconds as Record<string,number>};
}
