const CONFIG = {
  // Put your deployed Cloudflare Worker URL here.
  apiBaseUrl: "https://YOUR-WORKER.workers.dev",
  // Put the existing product-selection site here.
  productSiteUrl: "https://YOUR-PRODUCT-SITE.example"
};

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let currentStep=1, selectedAmount="", deliveryType="", recordedBlob=null, mediaRecorder=null, chunks=[];

function money(n){return Number(n).toLocaleString("ru-RU")+" сом";}
function fail(m){alert(m);}
function showStep(n){currentStep=n;$$(".step").forEach(x=>x.classList.toggle("active",+x.dataset.step===n));$("#stepNumber").textContent=n;$("#progressBar").style.width=(n*20)+"%";window.scrollTo({top:$("#kassa").offsetTop-80,behavior:"smooth"});if(n===5)updateChecklist();}
function fileOK(id){return !!$(id)?.files?.[0];}
function preview(input,imgId){const f=input.files?.[0],img=$(imgId);if(!f)return;if(f.type.startsWith("image/")){img.src=URL.createObjectURL(f);input.closest(".upload").classList.add("has-file");}}
["passportFront","passportBack","selfie","receipt"].forEach(id=>$("#"+id).addEventListener("change",e=>preview(e.target,"#"+({passportFront:"frontPreview",passportBack:"backPreview",selfie:"selfiePreview",receipt:"receiptPreview"}[id]))));

$$(".amount").forEach(b=>b.onclick=()=>{$$(".amount").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");if(b.dataset.amount==="other"){$("#customAmountWrap").classList.remove("hidden");selectedAmount=$("#customAmount").value;}else{$("#customAmountWrap").classList.add("hidden");selectedAmount=b.dataset.amount;}$("#amountPreview").textContent=selectedAmount?money(selectedAmount):"Башка сумма";syncVideo();});
$("#customAmount").oninput=e=>{selectedAmount=e.target.value;$("#amountPreview").textContent=selectedAmount?money(selectedAmount):"—";syncVideo();};

$$(".next").forEach(b=>b.onclick=()=>{const n=currentStep;
 if(n===1&&(!$("#fullName").value.trim()||!$("#groupNumber").value.trim()))return fail("Аты-жөнүңүздү жана группанын номерин толтуруңуз.");
 if(n===2&&(!selectedAmount||Number(selectedAmount)<=0))return fail("Онлайн кассанын суммасын тандаңыз.");
 if(n===3&&(!fileOK("#passportFront")||!fileOK("#passportBack")))return fail("Паспорттун эки тарабын тең тиркеңиз.");
 if(n===4&&(!fileOK("#selfie")||!$("#confirmDocs").checked))return fail("Паспорт менен сүрөттү тиркеп, ырастоону белгилеңиз.");
 showStep(Math.min(5,n+1));
});
$$(".prev").forEach(b=>b.onclick=()=>showStep(Math.max(1,currentStep-1)));
$$(".choice").forEach(b=>b.onclick=()=>{$$(".choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");deliveryType=b.dataset.delivery;updateChecklist();});

function checklistData(){return[
 ["Аты-жөнү",!!$("#fullName").value.trim()],["Группанын номери",!!$("#groupNumber").value.trim()],
 ["Онлайн кассанын суммасы",!!selectedAmount&&Number(selectedAmount)>0],["Паспорттун 1-бети",fileOK("#passportFront")],
 ["Паспорттун 2-бети",fileOK("#passportBack")],["Паспорт менен селфи",fileOK("#selfie")],
 ["Маалыматты ырастоо",$("#confirmDocs").checked],["Алуу жолу",!!deliveryType]];}
function updateChecklist(){const a=checklistData();$("#checklist").innerHTML=a.map(([t,o])=>`<div class="check-row ${o?"ok":""}"><span>${o?"✓":"○"}</span><b>${t}</b><em>${o?"Даяр":"Толтуруңуз"}</em></div>`).join("");$("#sendKassa").classList.toggle("disabled",!a.every(x=>x[1]));syncVideo();}
function syncVideo(){$("#videoName").textContent=$("#fullName").value.trim()||"аты-жөнү";$("#videoGroup").textContent=$("#groupNumber").value.trim()||"группанын номери";$("#videoAmount").textContent=selectedAmount?money(selectedAmount)+"го":"10 000 сомго";}
$("#fullName").oninput=syncVideo;$("#groupNumber").oninput=syncVideo;
$("#productSiteLink").href=CONFIG.productSiteUrl;

async function api(path,form){const r=await fetch(CONFIG.apiBaseUrl+path,{method:"POST",body:form});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.error||"Серверде ката кетти");return d;}

$("#sendKassa").onclick=async()=>{
 if($("#sendKassa").classList.contains("disabled"))return;
 const fd=new FormData();
 fd.append("fullName",$("#fullName").value.trim());fd.append("groupNumber",$("#groupNumber").value.trim());
 fd.append("amount",selectedAmount);fd.append("deliveryType",deliveryType);
 fd.append("passportFront",$("#passportFront").files[0]);fd.append("passportBack",$("#passportBack").files[0]);fd.append("selfie",$("#selfie").files[0]);
 $("#submitStatus").textContent="Маалыматтар коопсуз серверге жөнөтүлүүдө…";
 try{const d=await api("/api/kassa",fd);$("#submitStatus").textContent=`✓ Катталуу кабыл алынды. Өтүнмө № ${d.caseId}. Менеджерге маалымат жөнөтүлдү.`;$("#submitStatus").className="status ok";$("#sendKassa").disabled=true;}
 catch(e){$("#submitStatus").textContent=e.message;$("#submitStatus").className="status err";}
};

$("#startVideo").onclick=async()=>{
 try{
  const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:true});
  chunks=[];mediaRecorder=new MediaRecorder(stream);mediaRecorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);
  mediaRecorder.onstop=()=>{stream.getTracks().forEach(t=>t.stop());recordedBlob=new Blob(chunks,{type:"video/webm"});$("#recordedVideo").src=URL.createObjectURL(recordedBlob);$("#recordedVideo").classList.remove("hidden");$("#sendVideo").classList.remove("hidden");$("#videoStatus").textContent="Видео даяр. Эми менеджерге жөнөтүңүз.";$("#videoStatus").className="status ok";};
  mediaRecorder.start();$("#startVideo").classList.add("hidden");$("#stopVideo").classList.remove("hidden");$("#videoStatus").textContent="Видеозапись жүрүп жатат. Текстти так айтып бүткөндөн кийин «Токтотуу» басыңыз.";
 }catch(e){$("#videoStatus").textContent="Камера/микрофонго уруксат берилген жок.";$("#videoStatus").className="status err";}
};
$("#stopVideo").onclick=()=>{if(mediaRecorder?.state!=="inactive")mediaRecorder.stop();$("#stopVideo").classList.add("hidden");};
$("#sendVideo").onclick=async()=>{
 if(!recordedBlob)return;
 const fd=new FormData();fd.append("fullName",$("#fullName").value.trim());fd.append("groupNumber",$("#groupNumber").value.trim());fd.append("amount",selectedAmount||"10000");fd.append("video",new File([recordedBlob],"online-kassa-video.webm",{type:"video/webm"}));
 $("#videoStatus").textContent="Видео серверге жүктөлүүдө…";
 try{const d=await api("/api/video",fd);$("#videoStatus").textContent=`✓ Видео кабыл алынды. Өтүнмө № ${d.caseId}`;$("#videoStatus").className="status ok";}catch(e){$("#videoStatus").textContent=e.message;$("#videoStatus").className="status err";}
};

function paymentReady(){return $("#payName").value.trim()&&$("#payGroup").value.trim()&&$("#payAmount").value&&fileOK("#receipt");}
["#payName","#payGroup","#payAmount","#receipt"].forEach(s=>$(s).addEventListener("input",()=>$("#sendPayment").classList.toggle("disabled",!paymentReady())));
$("#sendPayment").onclick=async()=>{
 if(!paymentReady())return fail("Аты-жөнү, группанын номери, сумма жана чек сөзсүз керек.");
 const fd=new FormData();fd.append("fullName",$("#payName").value.trim());fd.append("groupNumber",$("#payGroup").value.trim());fd.append("amount",$("#payAmount").value);fd.append("receipt",$("#receipt").files[0]);
 $("#paymentStatus").textContent="Чек жөнөтүлүүдө…";
 try{const d=await api("/api/payment",fd);$("#paymentStatus").textContent=`✓ Төлөм кабыл алынды. № ${d.caseId}`;$("#paymentStatus").className="status ok";}catch(e){$("#paymentStatus").textContent=e.message;$("#paymentStatus").className="status err";}
};
updateChecklist();
