const MANAGER = "996507668866";
const PRODUCT_SITE = "https://moymarket235.github.io/moy-market/";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let currentStep = 1;
let selectedAmount = "";
let deliveryType = "";
let recordedBlob = null;
let mediaRecorder = null;
let chunks = [];

function money(n) {
  return Number(n).toLocaleString("ru-RU") + " сом";
}

function fail(message) {
  alert(message);
}

function showStep(n) {
  currentStep = n;
  $$(".step").forEach((x) => x.classList.toggle("active", Number(x.dataset.step) === n));
  if ($("#stepNumber")) $("#stepNumber").textContent = n;
  if ($("#progressBar")) $("#progressBar").style.width = (n * 20) + "%";
  if (n === 5) updateChecklist();
  window.scrollTo({ top: $("#kassa").offsetTop - 70, behavior: "smooth" });
}

function fileOK(id) {
  return !!$(id)?.files?.[0];
}

function preview(input, imgId) {
  const file = input.files?.[0];
  const img = $(imgId);
  if (!file || !img) return;
  if (file.type.startsWith("image/")) {
    img.src = URL.createObjectURL(file);
    input.closest(".upload")?.classList.add("has-file");
  }
}

const previewMap = {
  passportFront: "#frontPreview",
  passportBack: "#backPreview",
  selfie: "#selfiePreview",
  receipt: "#receiptPreview"
};

Object.keys(previewMap).forEach((id) => {
  const el = $("#" + id);
  if (el) el.addEventListener("change", (e) => preview(e.target, previewMap[id]));
});

function selectedFiles(...ids) {
  return ids.map((id) => $("#" + id)?.files?.[0]).filter(Boolean);
}

async function shareFiles(files, title, text) {
  if (!files.length) {
    fail("Адегенде керектүү файлды тандаңыз.");
    return false;
  }

  if (navigator.share && navigator.canShare) {
    try {
      if (navigator.canShare({ files })) {
        await navigator.share({ title, text, files });
        return true;
      }
    } catch (e) {
      if (e?.name === "AbortError") return false;
    }
  }

  // Fallback: WhatsApp text link. Files must then be attached manually in WhatsApp.
  window.open("https://wa.me/" + MANAGER + "?text=" + encodeURIComponent(text), "_blank");
  alert("WhatsApp ачылды. Сураныч, файлдарды өзүңүз тиркеп Send басыңыз.");
  return false;
}

function waText(text) {
  window.open("https://wa.me/" + MANAGER + "?text=" + encodeURIComponent(text), "_blank");
}

function baseInfo() {
  return {
    name: $("#fullName")?.value.trim() || "",
    group: $("#groupNumber")?.value.trim() || "",
    amount: selectedAmount || "",
    delivery: deliveryType || ""
  };
}

function applicationText() {
  const x = baseInfo();
  return `🟠 Мой Маркет — ОНЛАЙН КАССА\n\nАты-жөнү: ${x.name}\nГруппа: ${x.group}\nСумма: ${money(x.amount)}\nАлуу жолу: ${x.delivery}\n\nПаспорттун 2 тарабы жана паспорт менен селфи тиркелет.`;
}

// Amounts
$$(".amount").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".amount").forEach((x) => x.classList.remove("selected"));
    button.classList.add("selected");
    if (button.dataset.amount === "other") {
      $("#customAmountWrap")?.classList.remove("hidden");
      selectedAmount = $("#customAmount")?.value || "";
    } else {
      $("#customAmountWrap")?.classList.add("hidden");
      selectedAmount = button.dataset.amount;
    }
    if ($("#amountPreview")) $("#amountPreview").textContent = selectedAmount ? money(selectedAmount) : "—";
    syncVideo();
  });
});

$("#customAmount")?.addEventListener("input", (e) => {
  selectedAmount = e.target.value;
  $("#amountPreview").textContent = selectedAmount ? money(selectedAmount) : "—";
  syncVideo();
});

$$(".next").forEach((button) => {
  button.addEventListener("click", () => {
    const n = currentStep;
    if (n === 1 && (!$("#fullName").value.trim() || !$("#groupNumber").value.trim())) {
      return fail("Аты-жөнүңүздү жана группанын номерин толтуруңуз.");
    }
    if (n === 2 && (!selectedAmount || Number(selectedAmount) <= 0)) {
      return fail("Онлайн кассанын суммасын тандаңыз.");
    }
    if (n === 3 && (!fileOK("#passportFront") || !fileOK("#passportBack"))) {
      return fail("Паспорттун эки тарабын тең тиркеңиз.");
    }
    if (n === 4 && (!fileOK("#selfie") || !$("#confirmDocs").checked)) {
      return fail("Паспорт менен селфини тиркеп, ырастоону белгилеңиз.");
    }
    showStep(Math.min(5, n + 1));
  });
});

$$(".prev").forEach((button) => {
  button.addEventListener("click", () => showStep(Math.max(1, currentStep - 1)));
});

$$(".choice").forEach((button) => {
  button.addEventListener("click", () => {
    $$(".choice").forEach((x) => x.classList.remove("selected"));
    button.classList.add("selected");
    deliveryType = button.dataset.delivery;
    updateChecklist();
  });
});

function checklistData() {
  return [
    ["Аты-жөнү", !!$("#fullName").value.trim()],
    ["Группанын номери", !!$("#groupNumber").value.trim()],
    ["Онлайн кассанын суммасы", !!selectedAmount && Number(selectedAmount) > 0],
    ["Паспорттун 1-тарабы", fileOK("#passportFront")],
    ["Паспорттун 2-тарабы", fileOK("#passportBack")],
    ["Паспорт менен селфи", fileOK("#selfie")],
    ["Маалыматты ырастоо", $("#confirmDocs").checked],
    ["Алуу жолу", !!deliveryType]
  ];
}

function updateChecklist() {
  const list = $("#checklist");
  if (!list) return;
  const data = checklistData();
  list.innerHTML = data.map(([text, ok]) =>
    `<div class="check-row ${ok ? "ok" : ""}"><span>${ok ? "✓" : "○"}</span><b>${text}</b><em>${ok ? "Даяр" : "Толтуруңуз"}</em></div>`
  ).join("");

  const complete = data.every((x) => x[1]);
  $("#sendKassa")?.classList.toggle("disabled", !complete);
  if ($("#sendKassa")) $("#sendKassa").disabled = !complete;
  $("#managerBox")?.classList.toggle("hidden", !complete);
  syncVideo();
}

function syncVideo() {
  if ($("#videoName")) $("#videoName").textContent = $("#fullName")?.value.trim() || "аты-жөнү";
  if ($("#videoGroup")) $("#videoGroup").textContent = $("#groupNumber")?.value.trim() || "группанын номери";
  if ($("#videoAmount")) $("#videoAmount").textContent = selectedAmount ? money(selectedAmount) + "го" : "10 000 сомго";
}

$("#fullName")?.addEventListener("input", syncVideo);
$("#groupNumber")?.addEventListener("input", syncVideo);

// 1. Send passport front + back to WhatsApp via Android share sheet.
$("#sendPassport")?.addEventListener("click", async () => {
  const x = baseInfo();
  const files = selectedFiles("passportFront", "passportBack");
  const text = `📄 Мой Маркет — паспорт\n\nАты-жөнү: ${x.name}\nГруппа: ${x.group}\nСумма: ${money(x.amount)}\n\nПаспорттун эки тарабы тиркелди.`;
  await shareFiles(files, "Мой Маркет — Паспорт", text);
});

// 2. Take/select selfie with passport and send it to WhatsApp.
$("#sendSelfie")?.addEventListener("click", async () => {
  const x = baseInfo();
  const files = selectedFiles("selfie");
  const text = `🤳 Мой Маркет — паспорт менен селфи\n\nАты-жөнү: ${x.name}\nГруппа: ${x.group}\n\nПаспорт менен селфи тиркелди.`;
  await shareFiles(files, "Мой Маркет — Селфи", text);
});

// 3. Final text: read it correctly, then send it to Manager.
$("#sendKassa")?.addEventListener("click", () => {
  if (!checklistData().every((x) => x[1])) {
    return fail("Бардык кадамдарды толук бүтүрүңүз.");
  }
  const text = `🟠 Мой Маркет — ОНЛАЙН КАССА\n\nАты-жөнү: ${baseInfo().name}\nГруппа: ${baseInfo().group}\nСумма: ${money(baseInfo().amount)}\nАлуу жолу: ${baseInfo().delivery}\n\nДокументтер жана селфи WhatsApp аркылуу өзүнчө жөнөтүлдү.`;
  waText(text);
});

// Video recorder
$("#startVideo")?.addEventListener("click", async () => {
  if (deliveryType !== "Магазинге барып алам") {
    return fail("Видеозапись «Магазинге барып алам» тандалганда гана жеткиликтүү.");
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: true
    });

    chunks = [];
    recordedBlob = null;
    let options = {};

    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      options = { mimeType: "video/webm;codecs=vp9,opus" };
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
      options = { mimeType: "video/webm;codecs=vp8,opus" };
    }

    mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recordedBlob = new Blob(chunks, { type: mediaRecorder.mimeType || "video/webm" });
      const video = $("#recordedVideo");
      video.src = URL.createObjectURL(recordedBlob);
      video.classList.remove("hidden");
      $("#sendVideo")?.classList.remove("hidden");
      $("#videoStatus").textContent = "Видео даяр. Эми WhatsApp Managerге жөнөтүңүз.";
      $("#videoStatus").className = "status ok";
    };

    mediaRecorder.start();
    $("#startVideo")?.classList.add("hidden");
    $("#stopVideo")?.classList.remove("hidden");
    $("#videoStatus").textContent = "Видеозапись жүрүп жатат. Экрандагы текстти так окуп бүткөндөн кийин «Токтотуу» басыңыз.";
  } catch (error) {
    console.error(error);
    $("#videoStatus").textContent = "Камера жана микрофонго уруксат бериңиз.";
    $("#videoStatus").className = "status err";
  }
});

$("#stopVideo")?.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  $("#stopVideo")?.classList.add("hidden");
  $("#startVideo")?.classList.remove("hidden");
});

$("#sendVideo")?.addEventListener("click", async () => {
  if (!recordedBlob) return fail("Алгач видеону тартып алыңыз.");
  const x = baseInfo();
  const file = new File([recordedBlob], "moy-market-online-kassa-video.webm", {
    type: recordedBlob.type || "video/webm"
  });
  const text = `🎥 Мой Маркет — ОНЛАЙН КАССА ВИДЕО\n\nАты-жөнү: ${x.name}\nГруппа: ${x.group}\nСумма: ${money(x.amount)}\n\nВидеозапись тиркелди.`;
  await shareFiles([file], "Мой Маркет — Онлайн касса видео", text);
});

// Online payment: share receipt to WhatsApp.
function paymentReady() {
  return $("#payName")?.value.trim() &&
    $("#payGroup")?.value.trim() &&
    $("#payAmount")?.value &&
    fileOK("#receipt");
}

["#payName", "#payGroup", "#payAmount", "#receipt"].forEach((selector) => {
  $(selector)?.addEventListener("input", () => {
    $("#sendPayment")?.classList.toggle("disabled", !paymentReady());
  });
  $(selector)?.addEventListener("change", () => {
    $("#sendPayment")?.classList.toggle("disabled", !paymentReady());
  });
});

$("#sendPayment")?.addEventListener("click", async () => {
  if (!paymentReady()) return fail("Аты-жөнү, группа, сумма жана чек сөзсүз керек.");
  const text = `💳 Мой Маркет — ОНЛАЙН ТӨЛӨӨ\n\nАты-жөнү: ${$("#payName").value.trim()}\nГруппа: ${$("#payGroup").value.trim()}\nСумма: ${money($("#payAmount").value)}\n\nТөлөмдүн чеги тиркелди.`;
  await shareFiles([$("#receipt").files[0]], "Мой Маркет — Төлөм чеги", text);
});

if ($("#productSiteLink")) $("#productSiteLink").href = PRODUCT_SITE;

// Keep the UI in sync.
$("#confirmDocs")?.addEventListener("change", updateChecklist);
["#passportFront", "#passportBack", "#selfie"].forEach((selector) => {
  $(selector)?.addEventListener("change", updateChecklist);
});

updateChecklist();
syncVideo();
