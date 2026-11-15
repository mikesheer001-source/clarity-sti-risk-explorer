export const reviewed = '27 October 2026';
export const routes = {
  vaginal_insertive: {name:'Vaginal · insertive', rate:4/10000, condomReduction:0.80},
  vaginal_receptive: {name:'Vaginal · receptive', rate:8/10000, condomReduction:0.80},
  anal_insertive: {name:'Anal · insertive', rate:11/10000, condomReduction:0.63},
  anal_receptive: {name:'Anal · receptive', rate:138/10000, condomReduction:0.72},
  oral: {name:'Oral sex', rate:null, condomReduction:null}
};
export function validateCounts({kissed,protectedPartners,unprotectedPartners,overlap}) {
  const vals=[kissed,protectedPartners,unprotectedPartners,overlap];
  if(vals.some(v=>!Number.isInteger(v)||v<0||v>10000)) return 'Enter whole numbers from 0 to 10,000 for each partner count.';
  if(overlap>Math.min(protectedPartners,unprotectedPartners)) return 'The count in both sex groups cannot exceed either sex group.';
  return '';
}
export const uniqueSexPartners = s => s.protectedPartners+s.unprotectedPartners-s.overlap;
export function partnerScenario(prevalence,n) {
  if(n===0||prevalence===0) return 0;
  if(prevalence===1) return 1;
  return -Math.expm1(n*Math.log1p(-prevalence));
}
// Each partner's HIV status is sampled once; repeated acts share that status.
export function hivScenario(s,{route,q,protectedActs,unprotectedActs}) {
  const spec=routes[route];
  if(!spec||spec.rate===null) return null;
  if(!Number.isFinite(q)||q<0||q>1) throw new RangeError('Invalid transmissible HIV probability');
  for(const a of [protectedActs,unprotectedActs]) if(!Number.isInteger(a)||a<1||a>10000) throw new RangeError('Invalid act count');
  if(validateCounts(s)) throw new RangeError('Invalid partner counts');
  const ru=spec.rate, rp=ru*(1-spec.condomReduction);
  const pc=(r,a,b)=>-Math.expm1(a*Math.log1p(-r)+b*Math.log1p(-ru));
  const pProtected=q*pc(rp,protectedActs,0);
  const pUnprotected=q*pc(rp,0,unprotectedActs);
  const pMixed=q*pc(rp,protectedActs,unprotectedActs);
  const groups=[[s.protectedPartners-s.overlap,pProtected],[s.unprotectedPartners-s.overlap,pUnprotected],[s.overlap,pMixed]];
  let survivalLog=0;
  for(const [n,p] of groups) if(n>0) survivalLog+=n*Math.log1p(-p);
  const allNoCondom=[[s.protectedPartners-s.overlap,q*pc(ru,protectedActs,0)],[s.unprotectedPartners-s.overlap,pUnprotected],[s.overlap,q*pc(ru,protectedActs,unprotectedActs)]];
  let baselineLog=0;
  for(const [n,p] of allNoCondom) if(n>0) baselineLog+=n*Math.log1p(-p);
  return {risk:-Math.expm1(survivalLog),baseline:-Math.expm1(baselineLog),baseRate:ru,protectedRate:rp,condomReduction:spec.condomReduction,totalActs:s.protectedPartners*protectedActs+s.unprotectedPartners*unprotectedActs};
}
export function percent(p) {
  if(p===0) return '0%';
  if(p<0.000001) return '<0.0001%';
  if(p>0.999) return '>99.9%';
  if(p>=0.1) return `${Number((p*100).toFixed(1))}%`;
  return `${Number((p*100).toPrecision(2))}%`;
}
