const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const lessons=[
 {id:1,subject:"Mathematics",title:"Fractions",grade:"Class 8",time:"12 min",icon:"½",desc:"Understand parts of a whole, equivalent fractions and addition.",remember:"When adding fractions, first make the denominators the same.",xp:60},
 {id:2,subject:"Mathematics",title:"Types of Triangle",grade:"Class 8",time:"10 min",icon:"△",desc:"Explore triangle types by sides and angles.",remember:"A triangle always has three sides and three angles.",xp:50},
 {id:3,subject:"Science",title:"Life Processes",grade:"Class 8",time:"15 min",icon:"♧",desc:"Learn how living organisms obtain energy and survive.",remember:"Nutrition, respiration, transport and excretion are key life processes.",xp:70},
 {id:4,subject:"Social Science",title:"Our Constitution",grade:"Class 8",time:"14 min",icon:"▤",desc:"Discover the foundations and values of the Indian Constitution.",remember:"The Constitution defines rights, duties and the structure of government.",xp:65},
 {id:5,subject:"Science",title:"Light & Reflection",grade:"Class 8",time:"13 min",icon:"☼",desc:"Learn how light travels and reflects from surfaces.",remember:"The angle of incidence equals the angle of reflection.",xp:55},
 {id:6,subject:"Mathematics",title:"Linear Equations",grade:"Class 8",time:"16 min",icon:"x=",desc:"Solve simple linear equations step by step.",remember:"Do the same operation to both sides to keep an equation balanced.",xp:70}
];
const questions=[
 {q:"Which number is greater?",opts:["1/3","1/4","3/4","1/5"],a:2},
 {q:"What is 1/2 + 1/4?",opts:["1/4","2/4","3/4","1"],a:2},
 {q:"How many sides does a triangle have?",opts:["2","3","4","5"],a:1},
 {q:"Which process helps plants make food?",opts:["Respiration","Photosynthesis","Digestion","Excretion"],a:1},
 {q:"The Constitution is the ______ law of India.",opts:["local","ordinary","supreme","temporary"],a:2}
];
let state=JSON.parse(localStorage.getItem("learnmate_state")||'{"loggedIn":false,"progress":75,"xp":1200,"lessonsDone":32,"quizzesDone":18,"avgScore":85,"downloaded":[1,2,3,4],"lastLesson":1}');
let quizIndex=0, selected=null;
const API_BASE = localStorage.getItem("avyaya_api_base") || (location.protocol.startsWith("http") ? `${location.origin}/api` : "http://localhost:4000/api");
let pendingUsername = "";
async function api(path, options={}){ const token=localStorage.getItem("avyaya_token"); const r=await fetch(API_BASE+path,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(options.headers||{})}}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||"Request failed"); return d; }
function enterApp(user){ state.loggedIn=true; state.user=user; save(); $("#loginScreen").classList.add("hidden"); $("#app").classList.remove("hidden"); playLoginAnimation(); }
function authError(e){ toast(e.message || "Something went wrong"); }

function save(){localStorage.setItem("learnmate_state",JSON.stringify(state));}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function showPage(page){
  if(page==="achievements") page="achievements";
  $$(".page").forEach(p=>p.classList.remove("active-page"));
  const target=$("#page-"+page); if(target) target.classList.add("active-page");
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  if($("#topTitle")) $("#topTitle").textContent=page[0].toUpperCase()+page.slice(1);
  $("#sidebar").classList.remove("open");
  if(page==="learn") renderLessons();
  if(page==="downloads") renderDownloads();
  if(page==="progress") renderProgress();
  if(page==="achievements") renderBadges();
  if(page==="quiz") renderQuiz();
}
function passwordChecks(pw){return {length:pw.length>=8,mixed:/[a-z]/.test(pw)&&/[A-Z]/.test(pw),number:/\d/.test(pw)}}
function updateStrength(pw,bar,rules){
  const c=passwordChecks(pw), score=Object.values(c).filter(Boolean).length+(pw.length>=12?1:0);
  bar.style.width=pw?Math.max(15,score*25)+"%":"0";
  bar.style.background=score>=4?"#8edb9a":score>=3?"var(--gold)":score>=2?"#e0a571":"#e07171";
  if(rules) rules.querySelectorAll("li").forEach(li=>li.classList.toggle("ok",c[li.dataset.rule]));
}
function showAuth(id){["#authLogin","#authRegister","#authPassword"].forEach(s=>$(s).classList.toggle("hidden",s!==id))}
async function login(){
  const username=$("#loginUsername").value.trim(), password=$("#loginPassword").value;
  if(!username||!password){toast("Enter username and password");return}
  try{
    const d=await api("/auth/login",{method:"POST",body:JSON.stringify({username,password})});
    localStorage.setItem("avyaya_token",d.token); $("#loginPassword").value=""; enterApp(d.user);
  }catch(e){authError(e)}
}
function register(){
  const username=$("#registerUsername").value.trim();
  if(!/^[A-Za-z0-9_.]{3,30}$/.test(username)){toast("Username must be 3–30 letters, numbers, dots or underscores");return}
  pendingUsername=username;
  $("#passwordTitle").textContent=`Set a password for @${username.toLowerCase()}.`;
  $("#registerPassword").value=""; $("#registerConfirmPassword").value=""; updateStrength("",$("#strengthBar"),$("#passwordRules"));
  showAuth("#authPassword"); $("#registerPassword").focus();
}
async function createAccount(){
  const password=$("#registerPassword").value, confirmPassword=$("#registerConfirmPassword").value;
  if(!passwordChecks(password).length){toast("Password must be at least 8 characters");return}
  if(password!==confirmPassword){toast("Passwords do not match");return}
  try{
    const d=await api("/auth/register",{method:"POST",body:JSON.stringify({username:pendingUsername,password,confirmPassword})});
    localStorage.setItem("avyaya_token",d.token); enterApp(d.user);
  }catch(e){authError(e)}
}
function togglePasswordCard(open){
  $("#passwordCard").classList.toggle("hidden",!open); $("#profileCard").classList.toggle("hidden",open);
  ["#currentPassword","#newPassword","#newConfirmPassword"].forEach(s=>$(s).value=""); updateStrength("",$("#newStrengthBar"));
  if(open) $("#currentPassword").focus();
}
async function changePassword(){
  const currentPassword=$("#currentPassword").value, newPassword=$("#newPassword").value, confirmPassword=$("#newConfirmPassword").value;
  if(!currentPassword||!newPassword){toast("Fill in all password fields");return}
  if(newPassword.length<8){toast("New password must be at least 8 characters");return}
  if(newPassword!==confirmPassword){toast("New passwords do not match");return}
  try{
    const d=await api("/auth/change-password",{method:"POST",body:JSON.stringify({currentPassword,newPassword,confirmPassword})});
    localStorage.setItem("avyaya_token",d.token); togglePasswordCard(false); toast("Password updated");
  }catch(e){authError(e)}
}

function playLoginAnimation(){
  const overlay=$("#loginAnimation");
  overlay.classList.remove("hidden","exit");
  document.body.style.overflow="hidden";
  setTimeout(()=>{
    overlay.classList.add("exit");
    setTimeout(()=>{
      overlay.classList.add("hidden");
      overlay.classList.remove("exit");
      document.body.style.overflow="";
      showPage("home");
      toast("Login saved on this device");
    },700);
  },3000);
}
function renderLessons(){
  const filter=$("#subjectFilter").value;
  const arr=filter==="All Subjects"?lessons:lessons.filter(x=>x.subject===filter);
  $("#lessonGrid").innerHTML=arr.map(l=>card(l)).join("");
  $("#homeLessons").innerHTML=lessons.slice(0,3).map(l=>card(l,true)).join("");
}
function card(l,small=false){return `<button class="lesson-card" data-lesson="${l.id}"><div><span class="subject">${l.subject.toUpperCase()}</span><h3>${l.title}</h3><p>${l.desc}</p></div><div class="lesson-meta"><span>${l.grade} · ${l.time}</span><span>+${l.xp} XP</span></div></button>`}
function openLesson(id){
 const l=lessons.find(x=>x.id==id);state.lastLesson=l.id;save();
 $("#lessonDetail").innerHTML=`<div class="detail"><div class="lesson-visual">${l.icon}</div><div class="eyebrow" style="margin-top:25px">${l.subject.toUpperCase()} · ${l.grade}</div><h1>${l.title}</h1><p>${l.desc}</p><hr style="border-color:#29445c;margin:25px 0"><h3>Lesson</h3><p>Welcome to <b>${l.title}</b>. This offline lesson contains explanations, examples and a short practice quiz. Students can continue even when the internet is unavailable.</p><div class="remember"><b>Remember</b><br>${l.remember}</div><br><button id="completeLesson" class="primary">MARK LESSON COMPLETE · +${l.xp} XP</button> <button id="lessonQuiz" class="ghost">TAKE QUIZ</button></div>`;
  showPage("lesson");
  $("#completeLesson").onclick=()=>{state.lessonsDone++;state.xp+=l.xp;state.progress=Math.min(100,state.progress+1);save();renderProgress();toast("Lesson completed and saved offline")};
  $("#lessonQuiz").onclick=()=>showPage("quiz");
}
function renderProgress(){
 $("#progressPct").textContent=state.progress+"%";$("#progressBar").style.width=state.progress+"%";$("#homeProgress").textContent=state.progress+"%";
 $("#xp").textContent=state.xp;$("#lessonsDone").textContent=state.lessonsDone;$("#quizzesDone").textContent=state.quizzesDone;$("#avgScore").textContent=state.avgScore+"%";$("#topXp").textContent=state.xp;$("#dashXp").textContent=state.xp;$("#dashLessons").textContent=state.lessonsDone;$("#dashQuizzes").textContent=state.quizzesDone;$("#dashScore").textContent=state.avgScore+"%";
}
function renderDownloads(){
 $("#downloadList").innerHTML=lessons.map(l=>`<div class="download-row"><div class="thumb">${l.icon}</div><div class="info"><b>${l.title}</b><br><small>${l.subject} · ${l.time} · ${l.xp} XP</small></div><span class="check">${state.downloaded.includes(l.id)?"✓":"○"}</span><button class="ghost download-one" data-id="${l.id}">${state.downloaded.includes(l.id)?"Saved":"Download"}</button></div>`).join("");
 $$(".download-one").forEach(b=>b.onclick=()=>{const id=+b.dataset.id;if(!state.downloaded.includes(id)){state.downloaded.push(id);save();renderDownloads();toast("Lesson downloaded for offline use")}});
}
function renderBadges(){
 const badges=[["♙","First Steps","Complete your first lesson"],["★","Consistent Learner","Keep a 7-day streak"],["★","Quiz Master","Complete 10 quizzes"],["✦","Top Performer","Score above 90%"],["★","Quick Learner","Finish 5 lessons"],["♜","Knowledge Seeker","Explore 25 lessons"]];
 $("#badgeGrid").innerHTML=badges.map(b=>`<div class="badge"><div class="badge-icon">${b[0]}</div><h3>${b[1]}</h3><p>${b[2]}</p></div>`).join("");
}
function renderQuiz(){
 const q=questions[quizIndex];selected=null;$("#questionText").textContent=q.q;$("#quizCount").textContent=`Question ${quizIndex+1} of ${questions.length}`;
 $("#quizDots").innerHTML=questions.map((_,i)=>`<i class="${i<=quizIndex?"on":""}"></i>`).join("");
 $("#answers").innerHTML=q.opts.map((o,i)=>`<button class="answer" data-i="${i}"><span>○</span> ${o}</button>`).join("");
 $$(".answer").forEach(b=>b.onclick=()=>{$$(".answer").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");selected=+b.dataset.i});
 $("#nextQuestion").textContent=quizIndex===questions.length-1?"SUBMIT QUIZ":"NEXT QUESTION";
}
$("#nextQuestion").onclick=()=>{
 if(selected===null){toast("Select an answer first");return}
 const correct=selected===questions[quizIndex].a;
 if(correct) toast("Correct! +20 XP");
 else toast("Keep going — answer saved");
 if(quizIndex<questions.length-1){quizIndex++;renderQuiz()}else{state.quizzesDone++;if(correct)state.xp+=20;state.progress=Math.min(100,state.progress+1);save();quizIndex=0;renderProgress();showPage("progress");toast("Quiz completed and saved offline")}
};
$("#loginBtn").onclick=login;
$("#registerBtn").onclick=register;
$("#createAccountBtn").onclick=createAccount;
$("#showRegister").onclick=()=>showAuth("#authRegister");
$("#showLogin").onclick=()=>showAuth("#authLogin");
$("#backToUsername").onclick=()=>showAuth("#authRegister");
$("#loginPassword").onkeydown=e=>{if(e.key==="Enter")login()};
$("#registerUsername").onkeydown=e=>{if(e.key==="Enter")register()};
$("#registerConfirmPassword").onkeydown=e=>{if(e.key==="Enter")createAccount()};
$("#registerPassword").oninput=e=>updateStrength(e.target.value,$("#strengthBar"),$("#passwordRules"));
$("#newPassword").oninput=e=>updateStrength(e.target.value,$("#newStrengthBar"));
$$(".eye").forEach(b=>b.onclick=()=>{const i=$("#"+b.dataset.target);i.type=i.type==="password"?"text":"password";b.classList.toggle("on",i.type==="text")});
$("#openPasswordSettings").onclick=()=>togglePasswordCard(true);
$("#closePasswordSettings").onclick=()=>togglePasswordCard(false);
$("#changePasswordBtn").onclick=changePassword;
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
$("#subjectFilter").onchange=renderLessons;
$("#downloadAll").onclick=()=>{state.downloaded=lessons.map(l=>l.id);save();renderDownloads();toast("All lessons are ready offline")};
$("#logoutBtn").onclick=async()=>{await api("/auth/logout",{method:"POST"}).catch(()=>{});state.loggedIn=false;localStorage.removeItem("avyaya_token");save();location.reload()};
document.addEventListener("click",e=>{
 const p=e.target.closest("[data-page]"), l=e.target.closest("[data-lesson]");
 if(p&&!e.target.closest(".feature-card")) showPage(p.dataset.page);
 if(p&&e.target.closest(".feature-card")) showPage(p.dataset.page);
 if(l) openLesson(l.dataset.lesson);
});
window.addEventListener("online",()=>{ $("#connectionBadge").textContent="● Online — Sync ready";$("#connectionBadge").style.color="#8edb9a";$("#syncStatus").textContent="Online — Local progress ready to sync";toast("Connection restored")});
window.addEventListener("offline",()=>{ $("#connectionBadge").textContent="● Offline-ready";$("#connectionBadge").style.color="#8edb9a";$("#syncStatus").textContent="Offline — Learning Saved";toast("You are offline — learning continues")});
if(localStorage.getItem("avyaya_token") && state.loggedIn){
  $("#loginScreen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  playLoginAnimation();
}
renderLessons();renderProgress();renderDownloads();renderBadges();
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
