const MANAGER="996507668866";
const $=id=>document.getElementById(id);
let files={front:null,back:null,selfie:null,receipt:null,video:null};
let stream=null,recorder=null,chunks=[];

function info(){return {name:$("fullName").value.trim(),group:$("groupNumber").value.trim(),amount:document.querySelector(".amount.active")?.dataset.amount || $("customAmount").value.trim()};}
function text(kind){
 const x=info(), a=x.amount?`${Number(x.amount).toLocaleString("ru-RU")} сом`:"сумма көрсөтүлгөн эмес";
 const labels={front:"Паспорт — алдыңкы тарабы",back:"Паспорт — арткы тарабы",selfie:"Селфи паспорт менен",video:"Видеозапись",receipt:"Онлайн төлөмдүн чеги"};
 return `Мой Маркет — Онлайн касса\n\n${labels[kind]}\nАты-жөнү: ${x.name||"көрсөтүлгөн эмес"}\nГруппа: ${x.group||"көрсөтүлгөн эмес"}\nСумма: ${a}`;
}
function waText(t){location.href=`https://wa.me/${MANAGER}?text=${encodeURIComponent(t)}`;}

async function share(kind){
 const file=files[kind];
 if(!file){alert("Алгач файлды тандаңыз же тартыңыз.");return}
 const msg=text(kind);
 try{
   if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
     await navigator.share({title:"Мой Маркет — Онлайн касса",text:msg,files:[file]});
     return;
   }
 }catch(e){if(e.name==="AbortError")return}
 waText(msg+"\n\nФайлды WhatsApp'та тиркеп, «Жөнөтүү» басыңыз.");
}
function bindFile(inputId,key,previewId){
 $(inputId).addEventListener("change",e=>{
   const f=e.target.files?.[0]; if(!f)return;
   files[key]=f;
   const p=$(previewId);
   if(f.type.startsWith("image/")){p.innerHTML="";const im=document.createElement("img");im.src=URL.createObjectURL(f);p.appendChild(im)}
   else p.textContent=f.name;
 });
}
["frontGallery","frontCamera"].forEach(x=>bindFile(x,"front","frontPreview"));
["backGallery","backCamera"].forEach(x=>bindFile(x,"back","backPreview"));
["selfieGallery","selfieCamera"].forEach(x=>bindFile(x,"selfie","selfiePreview"));
["receiptGallery","receiptCamera"].forEach(x=>bindFile(x,"receipt","receiptPreview"));

document.querySelectorAll(".amount").forEach(b=>b.onclick=()=>{document.querySelectorAll(".amount").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("customAmount").value=""});
$("customAmount").oninput=()=>document.querySelectorAll(".amount").forEach(x=>x.classList.remove("active"));

$("sendFront").onclick=()=>share("front");
$("sendBack").onclick=()=>share("back");
$("sendSelfie").onclick=()=>share("selfie");
$("sendReceipt").onclick=()=>share("receipt");
$("sendVideo").onclick=()=>share("video");

function stopCamera(){
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
 $("videoPreview").srcObject=null;
 $("videoBox").classList.remove("recording");
 $("closeVideo").disabled=true;
}
async function startRecording(){
 try{
   stopCamera(); chunks=[]; files.video=null;
   $("sendVideo").disabled=true; $("retakeVideo").disabled=true;
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"},audio:true});
   $("videoPreview").srcObject=stream; $("videoBox").classList.add("recording");
   recorder=new MediaRecorder(stream);
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   recorder.onstop=()=>{
     files.video=new File([new Blob(chunks,{type:recorder.mimeType||"video/webm"})],"moy-market-video.webm",{type:recorder.mimeType||"video/webm"});
     $("sendVideo").disabled=false;$("retakeVideo").disabled=false;$("stopVideo").disabled=true;
     stopCamera();$("videoPlaceholder").textContent="Видео даяр. Текшерип, «Менеджерге жөнөтүү» басыңыз.";
   };
   recorder.start();$("startVideo").disabled=true;$("stopVideo").disabled=false;$("closeVideo").disabled=false;
 }catch(e){alert("Камера/микрофонго уруксат бериңиз. Сайт HTTPS аркылуу ачылышы керек.");}
}
$("startVideo").onclick=startRecording;
$("stopVideo").onclick=()=>{if(recorder&&recorder.state!=="inactive")recorder.stop()};
$("retakeVideo").onclick=startRecording;
$("closeVideo").onclick=()=>{if(recorder&&recorder.state!=="inactive")recorder.stop();stopCamera();$("startVideo").disabled=false;$("stopVideo").disabled=true;$("closeVideo").disabled=true};

$("sendAll").onclick=async()=>{
 const x=info();
 if(!x.name||!x.group||!x.amount||!files.front||!files.back||!files.selfie){alert("Аты-жөнү, группа, сумма, паспорттын эки тарабы жана селфи толук болушу керек.");return}
 $("status").innerHTML=`✅ Даяр: ${x.name}<br>Группа: ${x.group}<br>Сумма: ${Number(x.amount).toLocaleString("ru-RU")} сом<br><br>Ар бир файлдын жанындагы «Менеджерге жөнөтүү» баскычы менен өзүнчө жөнөтүңүз.`;
 waText(`Мой Маркет — Онлайн касса\nКардардын маалыматы даяр.\nАты-жөнү: ${x.name}\nГруппа: ${x.group}\nСумма: ${Number(x.amount).toLocaleString("ru-RU")} сом\n\nДокументтер сайттагы өзүнчө «Менеджерге жөнөтүү» баскычтары аркылуу жөнөтүлөт.`);
};
window.addEventListener("beforeunload",stopCamera);
