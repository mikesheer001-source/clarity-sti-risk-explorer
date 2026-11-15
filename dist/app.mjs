import {validateCounts,uniqueSexPartners,partnerScenario,hivScenario,percent,routes} from './model.mjs';
const $=id=>document.getElementById(id);
const countIds=['kissed','protected','unprotected','overlap'];
const num=id=>$(id).value.trim()===''?NaN:Number($(id).value);
function state(){return {kissed:num('kissed'),protectedPartners:num('protected'),unprotectedPartners:num('unprotected'),overlap:num('overlap')};}
let previousCalculatorTab='overview';
function setTab(name,focus=false){
  if(name!=='data')previousCalculatorTab=name;
  document.querySelectorAll('[data-tab]').forEach(el=>{const active=el.dataset.tab===name;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));el.tabIndex=active?0:-1;if(active&&focus)el.focus();});
  for(const id of ['overview','hiv','data'])$(id).hidden=id!==name;
}
function setDetail(level){
  const dataTab=$('tab-data');
  const leavingData=level!=='full'&&!$('data').hidden;
  const dataHadFocus=document.activeElement===dataTab || $('data').contains(document.activeElement);
  if(leavingData)setTab(previousCalculatorTab,dataHadFocus);
  $('main-content').dataset.detail=level;
  dataTab.hidden=level!=='full';
  document.querySelector(`[name="detail"][value="${level}"]`).checked=true;
}
document.querySelectorAll('[data-tab]').forEach(el=>{
  el.addEventListener('click',()=>setTab(el.dataset.tab));
  el.addEventListener('keydown',e=>{const tabs=[...document.querySelectorAll('[data-tab]:not([hidden])')],i=tabs.indexOf(el);let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();setTab(tabs[next].dataset.tab,true);}});
});
document.querySelectorAll('[name=detail]').forEach(el=>el.addEventListener('change',()=>{if(el.checked)setDetail(el.value);}));
$('source-link').addEventListener('click',e=>{e.preventDefault();setDetail('full');setTab('data');$('sources').focus({preventScroll:true});$('sources').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});});
setDetail('simple');
document.querySelectorAll('[data-step]').forEach(el=>el.addEventListener('click',()=>{const input=$(el.dataset.for);const n=Number.isFinite(num(input.id))?num(input.id):0;input.value=Math.max(0,Math.min(10000,Math.round(n)+Number(el.dataset.step)));update();}));
document.querySelectorAll('input:not([name=detail]),select').forEach(el=>{el.addEventListener('input',update);el.addEventListener('change',update);});
$('reset').addEventListener('click',()=>{for(const id of countIds)$(id).value='0';$('status').value='unknown';$('route').value='';$('prevalence').value='';$('protected-acts').value='1';$('unprotected-acts').value='1';update();});
function message(title,body){const box=$('hiv-result');box.replaceChildren();const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=body;box.append(h,p);}
function update(){
  const s=state(),error=validateCounts(s);$('input-error').hidden=!error;$('input-error').textContent=error;
  $('custom-wrap').hidden=$('status').value!=='custom';
  if(error){$('sex-total').textContent='—';for(const id of ['hsv1','hsv2','syphilis'])$(id).textContent='—';message('Check your partner counts',error);return;}
  const n=uniqueSexPartners(s);$('sex-total').textContent=n.toLocaleString();
  for(const [id,p,group] of [['hsv1',.64,s.kissed],['hsv2',.13,n],['syphilis',.006,n]]){$(id).textContent=group===0?'—':percent(partnerScenario(p,group));$(id).title=group===0?'Add people to see a reference scenario':'Illustrative partner-status probability, not your probability of infection';}
  const status=$('status').value;
  if(n===0){message('Add sexual partners to explore a scenario','Kissing is not included in the HIV sex model. No sexual partners are entered; this does not assess other routes of HIV transmission.');return;}
  if(status==='unknown'){message('Unknown partners → unknown personal probability','A partner count does not reveal anyone’s HIV status or viral load. Choose an explicit reference scenario above to explore the math. There is no assumed population HIV rate.');return;}
  if(status==='suppressed'){message('0% sexual HIV transmission with maintained viral suppression','U=U: a person with HIV who maintains an undetectable viral load does not transmit HIV through sex. This assumes every partner with HIV was durably suppressed throughout the encounters. It does not apply when viral load is unknown, and it does not prevent other STIs.');return;}
  const route=$('route').value;
  if(!route){message('Choose the type of sex','Per-act HIV risk depends on the act and your role, so the model needs that information.');return;}
  if(route==='oral'){message('Low HIV risk; no reliable percentage','CDC describes oral-sex HIV transmission risk as low or little to none. A dependable per-act number is unavailable. Oral sex can still transmit other STIs.');return;}
  const a=num('protected-acts'),b=num('unprotected-acts');
  if([a,b].some(x=>!Number.isInteger(x)||x<1||x>10000)){message('Check your act counts','Enter whole numbers from 1 to 10,000 per person for each group. A group with no partners contributes no acts.');return;}
  let q=1;
  if(status==='custom'){q=num('prevalence')/100;if(!Number.isFinite(q)||q<0||q>1){message('Enter your transmissible-HIV assumption','Use a percentage from 0 to 100. This value is an assumption about partners with HIV that can be sexually transmitted, not overall HIV prevalence.');return;}}
  const result=hivScenario(s,{route,q,protectedActs:a,unprotectedActs:b});
  const badge=status==='custom'?'Custom assumption · illustrative only':'Every partner has transmissible HIV · reference only';
  const riskLabel=result.risk>0?`About 1 in ${Math.max(1,Math.round(1/result.risk)).toLocaleString()} in this scenario.`:'Zero under the entered assumptions.';
  const ratio=result.baseline>0?100*result.risk/result.baseline:0;
  const box=$('hiv-result');box.innerHTML=`<span class="scenario-badge"></span><div class="hiv-label">Modeled HIV acquisition probability</div><div class="result-number"></div><p class="risk-odds"></p><p class="scenario-summary"></p><div class="comparison"><div class="bar-row"><div class="bar-caption"><span>Same acts, all without condoms</span><strong class="baseline-value"></strong></div><div class="bar-track"><div class="bar baseline" style="width:${result.baseline>0?100:0}%"></div></div></div><div class="bar-row"><div class="bar-caption"><span>With your entered condom use</span><strong class="risk-value"></strong></div><div class="bar-track"><div class="bar" style="width:${ratio}%"></div></div></div><p class="micro">Bars compare these two scenarios; the full bar is not 100% infection risk.</p></div>`;
  box.querySelector('.scenario-badge').textContent=badge;box.querySelector('.result-number').textContent=percent(result.risk);box.querySelector('.risk-odds').textContent=riskLabel;
  box.querySelector('.scenario-summary').textContent=`${n.toLocaleString()} distinct partners · ${result.totalActs.toLocaleString()} acts · ${routes[route].name}. Assumed transmissible HIV: ${Number((q*100).toPrecision(4))}% per partner. Not your probability of currently having HIV.`;
  box.querySelector('.baseline-value').textContent=percent(result.baseline);box.querySelector('.risk-value').textContent=percent(result.risk);
}
update();
