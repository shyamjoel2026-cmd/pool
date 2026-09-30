import { anomalousBids, latestBids, type Bid } from './bids.ts';
import type { Policy } from './policy.ts';
export interface AbuseSignal { kind: 'SHARED_PAYER'|'SHARED_DEVICE'|'JOIN_BURST'|'SIMILAR_BIDS'|'WINNER_ROTATION'|'LOW_BID'; subjects: readonly string[]; explanation: string }
export interface JoinObservation { memberId:string; poolId:string; householdKey:string; payerKey:string; deviceKey?:string; areaKey:string; at:number }
/** Signals request human review, never prove fraud or block buyers/sellers.
 * Competition Act s3(3)(d): https://cci.gov.in/antitrust
 * Detection thresholds are caller-provided heuristics, not legal thresholds.
 */
export function detectJoinAbuse(rows:readonly JoinObservation[], windowMs:number, burstCount:number):AbuseSignal[]{
  if(!Number.isSafeInteger(windowMs)||windowMs<1||!Number.isSafeInteger(burstCount)||burstCount<2)throw new Error('invalid detector threshold');
  const signals:AbuseSignal[]=[];
  for(const field of ['payerKey','deviceKey'] as const){
    const groups=new Map<string,JoinObservation[]>();
    for(const row of rows){const k=row[field];if(k)groups.set(k,[...groups.get(k)??[],row]);}
    for(const [id,group] of groups)if(new Set(group.map(r=>r.householdKey)).size>1||new Set(group.map(r=>r.poolId)).size>1)signals.push({kind:field==='payerKey'?'SHARED_PAYER':'SHARED_DEVICE',subjects:[id],explanation:'Identity appears across households or pools; may be legitimate.'});
  }
  for(const field of ['areaKey','deviceKey'] as const){
    const groups=new Map<string,JoinObservation[]>();for(const r of rows){const k=r[field];if(k)groups.set(k,[...groups.get(k)??[],r]);}
    for(const [id,group]of groups){const sorted=group.sort((a,b)=>a.at-b.at);if(sorted.some((r,i)=>sorted[i+burstCount-1]!==undefined&&sorted[i+burstCount-1]!.at-r.at<=windowMs))signals.push({kind:'JOIN_BURST',subjects:[id],explanation:field+' joins exceed configured window threshold.'});}
  }
  return signals;
}
export function detectBidAbuse(policy:Policy,bids:readonly Bid[],nearBps:number,winners:readonly {poolId:string;sellerId:string;participants:readonly string[]}[]):AbuseSignal[]{
  if(!Number.isSafeInteger(nearBps)||nearBps<0||nearBps>10000)throw new Error('invalid similarity threshold');
  const signals:AbuseSignal[]=[];const current=latestBids(bids);
  const pools=new Set(current.map(b=>b.poolId));
  for(const poolId of pools){const group=current.filter(b=>b.poolId===poolId);
    for(const id of anomalousBids(policy,group))signals.push({kind:'LOW_BID',subjects:[id],explanation:'Price more than configured percentage below median.'});
    for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
      const a=group[i]!,b=group[j]!;if(a.sellerId===b.sellerId||a.uom!==b.uom||a.sellerPrice.currency!==b.sellerPrice.currency)continue;
      if(BigInt(Math.abs(a.sellerPrice.minor-b.sellerPrice.minor))*10000n<=BigInt(Math.max(a.sellerPrice.minor,b.sellerPrice.minor))*BigInt(nearBps))signals.push({kind:'SIMILAR_BIDS',subjects:[a.id,b.id],explanation:'Prices are within the configured tolerance; review terms and evidence.'});
    }
  }
  const unique=[...new Map(winners.map(w=>[w.poolId,w])).values()];
  const cohorts=new Map<string,typeof unique>();for(const w of unique){const k=[...new Set(w.participants)].sort().join('|');cohorts.set(k,[...cohorts.get(k)??[],w]);}
  for(const rows of cohorts.values())if(rows.length>=4&&new Set(rows.map(w=>w.sellerId)).size>=2&&rows.every((w,i)=>i===0||w.sellerId!==rows[i-1]!.sellerId))signals.push({kind:'WINNER_ROTATION',subjects:rows.map(w=>w.poolId),explanation:'Same participant group alternates winners across at least four pools.'});
  return signals;
}
