const QUESTIONS = [
["Emotional connection","I can be completely myself around my partner."],
["Emotional connection","My partner notices when something is bothering me, even when I don't say it."],
["Emotional connection","I feel emotionally safe and secure in this relationship."],
["Emotional connection","I can share my insecurities without being judged."],
["Emotional connection","I feel appreciated and valued by my partner."],
["Communication","We can discuss uncomfortable topics instead of avoiding them."],
["Communication","We listen to understand, not just to respond."],
["Communication","We try to resolve misunderstandings rather than letting them build up."],
["Communication","We can admit when we're wrong and apologise sincerely."],
["Communication","We respect each other's need for personal space."],
["Romance & affection","We express love in ways that make each other feel loved."],
["Romance & affection","Small thoughtful gestures mean more to me than expensive gifts."],
["Romance & affection","I'm happy with the amount of affection in our relationship."],
["Romance & affection","I enjoy spending time together, even when we're doing nothing special."],
["Romance & affection","I still feel excited about making my partner smile."],
["Everyday life","Our spending and saving habits are reasonably compatible."],
["Everyday life","We enjoy each other's company without needing constant entertainment."],
["Everyday life","We respect each other's friendships and individual interests."],
["Everyday life","We can compromise when our preferences are different."],
["Everyday life","Our expectations about how much time we spend together are compatible."],
["Future & values","We have similar expectations about marriage and commitment."],
["Future & values","We have compatible expectations about financial responsibilities."],
["Future & values","We can find common ground on family involvement in our future."],
["Future & values","We respect each other's career goals and ambitions."],
["Future & values","I can genuinely imagine building a life with my partner."],
["Trust & growth","I trust my partner even when we're physically apart."],
["Trust & growth","When things get difficult, I want us to work through them together."],
["Trust & growth","I accept that my partner will change and grow over time."],
["Trust & growth","I respect my partner as an individual, not only as my romantic partner."],
["Trust & growth","I believe this relationship helps both of us become better people."]
];
const CATEGORIES = ["Emotional connection","Communication","Romance & affection","Everyday life","Future & values","Trust & growth"];
const app = document.getElementById("app");
const cfg = window.APP_CONFIG || {};
const API = (cfg.API_URL || "").replace(/\/$/,"");
const qs = new URLSearchParams(location.search);
const roomFromUrl = qs.get("room");
const roleFromUrl = qs.get("join");
const key = "stc_session_v1";
let session = null, answers = Array(30).fill(0), saveTimer = null, pollTimer = null;

function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function set(html){app.innerHTML=html;}
function btn(label,fn,cls="btn"){return `<button class="${cls}" id="mainBtn">${label}</button>`;}
function loading(msg="One moment…"){set(`<div class="loading"><div class="spinner"></div><p>${msg}</p></div>`);}
async function api(action,data={}){
  if(!API || API.includes("PASTE_YOUR")) throw new Error("The app hasn't been connected to its Supabase backend yet. Follow the SETUP.md instructions.");
  const res=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...data})});
  const body=await res.json().catch(()=>({error:"Unexpected server response"}));
  if(!res.ok) throw new Error(body.error||"Something went wrong.");
  return body;
}
function showError(err){const old=document.querySelector(".toast");if(old)old.textContent=err.message;else app.insertAdjacentHTML("beforeend",`<p class="toast">${esc(err.message)}</p>`);}
function saveSession(s){session=s;localStorage.setItem(key,JSON.stringify(s));}
function getSession(){try{return JSON.parse(localStorage.getItem(key)||"null")}catch{return null}}
function home(){
 set(`<div class="center"><div class="intro-icon">💌</div><span class="pill">YOUR PRIVATE COUPLE ROOM</span><h2 style="margin-top:13px">Two hearts. Two honest answers.</h2><p class="muted">Answer separately, without comparing notes. Your answers stay hidden until you have both completed all 30 questions.</p><div class="notice">♡ This is a reflection exercise, not a scientific relationship diagnosis. There are no right or wrong answers.</div><button class="btn full" id="create">Create our couple room</button><p class="muted" style="margin-top:13px">Already have an invitation? <a href="#" id="joinLink" style="color:#bd668d">Join Tanu's / Suresh's room</a></p><p class="toast" id="homeToast"></p></div>`);
 document.getElementById("create").onclick=createRoom;
 document.getElementById("joinLink").onclick=e=>{e.preventDefault();joinPrompt();};
}
async function createRoom(){
 try{loading("Creating your private room…");const r=await api("create_room");const s={room:r.room,role:"suresh",token:r.token};saveSession(s);showInvite(r.invite_url);}
 catch(e){home();showError(e);}
}
function showInvite(url){
 set(`<div class="center"><div class="intro-icon">💗</div><span class="pill">YOUR ROOM IS READY</span><h2 style="margin-top:13px">Invite Tanu</h2><p class="muted">Your private room has been created. Take your test first, then send Tanu this invitation link.</p><div class="invite" id="inviteText">${esc(url)}</div><button class="btn full" id="copy">Copy invitation link</button><button class="btn secondary full" id="start" style="margin-top:9px">Start my test</button><p class="toast" id="msg"></p></div>`);
 document.getElementById("copy").onclick=async()=>{try{await navigator.clipboard.writeText(url);document.getElementById("msg").textContent="Invitation link copied! Send it to Tanu ❤️"}catch{document.getElementById("msg").textContent="Long-press the link above to copy it."}};
 document.getElementById("start").onclick=()=>renderQuiz();
}
function joinPrompt(){
 set(`<div class="center"><div class="intro-icon">💕</div><h2>Join your couple room</h2><p class="muted">Open the invitation link Suresh shared with you. If you have the room code, enter it below.</p><input class="field" id="roomCode" placeholder="8-character room code" maxlength="8" style="text-transform:uppercase"><button class="btn full" id="join">Join as Tanu</button><button class="btn secondary full" id="back">Back</button></div>`);
 document.getElementById("join").onclick=()=>joinRoom(document.getElementById("roomCode").value.trim().toUpperCase());
 document.getElementById("back").onclick=home;
}
async function joinRoom(code){
 if(!/^[A-Z0-9]{8}$/.test(code)){showError(new Error("Enter the 8-character room code from the invitation."));return;}
 try{loading("Joining your room…");const r=await api("join_room",{room:code});saveSession({room:code,role:"tanu",token:r.token});renderQuiz();}
 catch(e){joinPrompt();showError(e);}
}
function renderQuiz(){
 clearInterval(pollTimer);
 if(!session){home();return;}
 set(`<div><div class="row-head" style="display:flex;justify-content:space-between;align-items:center"><span class="pill">${session.role==="suresh"?"SURESH'S TEST":"TANU'S TEST"}</span><span class="muted" id="count">0 / 30 answered</span></div><h2 style="margin-top:15px">Answer from the heart.</h2><p class="muted">Rate each statement honestly. 1 = strongly disagree · 5 = strongly agree.</p><div class="progress-wrap"><div class="progress" id="progress" style="width:0%"></div></div><div id="questions"></div><div class="notice">Your individual answers are private. The comparison will only unlock after both of you submit.</div><button class="btn full" id="submit" disabled>Submit my answers ♥</button><p class="toast" id="saveState">Your progress is saved as you go.</p></div>`);
 const qbox=document.getElementById("questions");
 qbox.innerHTML=QUESTIONS.map((q,i)=>`<div class="question"><div class="q-meta">${String(i+1).padStart(2,"0")} · ${esc(q[0].toUpperCase())}</div><div class="q-text">${esc(q[1])}</div><div class="scale">${[1,2,3,4,5].map(n=>`<label><input type="radio" name="q${i}" value="${n}"><span>${n}</span></label>`).join("")}</div><div class="scale-caption"><span>Strongly disagree</span><span>Strongly agree</span></div></div>`).join("");
 qbox.addEventListener("change",e=>{if(e.target.matches("input[type=radio]")){const i=Number(e.target.name.slice(1));answers[i]=Number(e.target.value);updateProgress();queueSave();}});
 document.getElementById("submit").onclick=submitAnswers;
 updateProgress();
}
function updateProgress(){
 const n=answers.filter(x=>x>0).length;document.getElementById("count").textContent=`${n} / 30 answered`;document.getElementById("progress").style.width=(n/30*100)+"%";document.getElementById("submit").disabled=n!==30;
}
function queueSave(){
 clearTimeout(saveTimer);document.getElementById("saveState").textContent="Saving your progress…";
 saveTimer=setTimeout(async()=>{try{await api("save_answers",{room:session.room,token:session.token,answers});document.getElementById("saveState").textContent="Progress saved securely ✓"}catch(e){document.getElementById("saveState").textContent=e.message}},500);
}
async function submitAnswers(){
 if(answers.some(x=>x<1))return;
 const b=document.getElementById("submit");b.disabled=true;b.textContent="Submitting…";
 try{await api("submit_answers",{room:session.room,token:session.token,answers});renderWaiting();}
 catch(e){b.disabled=false;b.textContent="Submit my answers ♥";showError(e);}
}
function renderWaiting(){
 set(`<div class="center"><div class="intro-icon">🕊️</div><span class="pill">YOUR ANSWERS ARE LOCKED IN</span><h2 style="margin-top:13px">Your part is complete.</h2><p class="muted">Your answers are safely submitted. The compatibility report will unlock automatically when both of you finish.</p><div class="status-grid"><div class="status-card"><div class="status-dot">💌</div><strong>Suresh</strong><span class="muted" id="sStatus">Checking…</span></div><div class="status-card"><div class="status-dot">🌷</div><strong>Tanu</strong><span class="muted" id="tStatus">Checking…</span></div></div><div class="notice">You won't see either person's individual answers until both submissions are complete.</div><button class="btn secondary full" id="refresh">Check for results</button><p class="toast">This page checks for updates automatically.</p></div>`);
 document.getElementById("refresh").onclick=checkStatus;checkStatus();pollTimer=setInterval(checkStatus,5000);
}
async function checkStatus(){
 try{const r=await api("status",{room:session.room,token:session.token});document.getElementById("sStatus").textContent=r.suresh_submitted?"Completed ✓":"Not finished yet";document.getElementById("tStatus").textContent=r.tanu_submitted?"Completed ✓":"Not finished yet";if(r.both_submitted){clearInterval(pollTimer);renderResults();}}
 catch(e){showError(e);}
}
async function renderResults(){
 loading("Unfolding your compatibility report…");
 try{const r=await api("results",{room:session.room,token:session.token});const a=r.suresh_answers,b=r.tanu_answers;const totalDiff=a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0);const score=Math.round(100-totalDiff/120*100);
 const categories=CATEGORIES.map(cat=>{const ids=QUESTIONS.map((q,i)=>q[0]===cat?i:-1).filter(i=>i>=0);const diff=ids.reduce((s,i)=>s+Math.abs(a[i]-b[i]),0);return {name:cat,score:Math.round(100-diff/(ids.length*4)*100),ids};});
 const interpretation=score>=90?"Exceptionally aligned perspectives":score>=75?"A strong foundation with room to learn":score>=60?"A meaningful mix of similarities and differences":"An opportunity to understand each other more deeply";
 set(`<div class="center"><div class="intro-icon">💞</div><span class="pill">YOUR SHARED REPORT</span><h2 style="margin-top:13px">Look what you discovered.</h2><div class="score">${score}%</div><div class="score-label">ANSWER ALIGNMENT</div><h3 style="margin-top:12px">${interpretation}</h3><p class="muted">This score measures how similarly you rated the same statements. It is not a measure of how much you love each other.</p></div><div style="margin-top:25px"><h3>Your connection, category by category</h3>${categories.map(c=>`<div class="category"><div class="cat-head"><span>${esc(c.name)}</span><span>${c.score}%</span></div><div class="bar"><span style="width:${c.score}%"></span></div></div>`).join("")}</div><div style="margin-top:25px"><h3>Where your perspectives differ</h3><p class="muted">These are conversation starters, not problems or a scorecard.</p><div class="match-list">${QUESTIONS.map((q,i)=>({q:q[1],a:a[i],b:b[i],d:Math.abs(a[i]-b[i])})).sort((x,y)=>y.d-x.d).slice(0,5).map(x=>`<div class="match-row"><strong>${esc(x.q)}</strong><span>You: ${x.a}/5 &nbsp;·&nbsp; Tanu: ${x.b}/5 &nbsp;·&nbsp; Difference: ${x.d}</span></div>`).join("")}</div></div><div class="notice">A difference is not automatically a red flag. Ask what is behind each other's answer, listen without defending, and decide what matters to you both.</div><button class="btn secondary full" id="restart">Back to home</button>`);
 document.getElementById("restart").onclick=()=>{localStorage.removeItem(key);session=null;answers=Array(30).fill(0);home();};
 }catch(e){set(`<h2>Almost there…</h2><p class="muted">${esc(e.message)}</p><button class="btn" id="retry">Try again</button>`);document.getElementById("retry").onclick=renderResults;}
}
async function init(){
 session=getSession();
 if(session){try{const r=await api("status",{room:session.room,token:session.token});if(r.me_submitted){renderWaiting();return;}const saved=await api("get_my_answers",{room:session.room,token:session.token});answers=saved.answers;renderQuiz();return;}catch{localStorage.removeItem(key);session=null;}}
 if(roomFromUrl && roleFromUrl==="tanu"){joinRoom(roomFromUrl.toUpperCase());return;}
 home();
}
init();
