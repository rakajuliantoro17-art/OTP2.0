"use strict";
if (sessionStorage.getItem("tim_it_access") !== "1") location.replace("./login.html");
const firebaseConfig={apiKey:"AIzaSyDQBar_tJy19A2ONu8DkxbZzh0Oa11ygfE",authDomain:"otp-2-70d6e.firebaseapp.com",databaseURL:"https://otp-2-70d6e-default-rtdb.firebaseio.com",projectId:"otp-2-70d6e",storageBucket:"otp-2-70d6e.firebasestorage.app",messagingSenderId:"430860703289",appId:"1:430860703289:web:1faa0883b89b443b325fe8",measurementId:"G-2G2QGK2RPD"};
const $=id=>document.getElementById(id);
function hash(str){let h=0;for(let i=0;i<str.length;i++){h=(h<<5)-h+str.charCodeAt(i);h|=0}return Math.abs(h)}
function formatCode(value){const s=String(value).replace(/\D/g,"").padStart(6,"0").slice(-6);return s.slice(0,3)+" "+s.slice(3)}
function currentCode(){const t=Math.floor(Date.now()/1000/60);return formatCode(hash(t+"SOOKO_HEBAT_2026")%1000000)}
function tick(){$("currentOtp").textContent=currentCode();$("countdown").textContent=(60-Math.floor(Date.now()/1000)%60)+" detik";$("updatedAt").textContent="Pembaruan: "+new Date().toLocaleTimeString("id-ID")}
tick();setInterval(tick,1000);
$("logout").addEventListener("click",()=>{sessionStorage.removeItem("tim_it_access");location.replace("./login.html")});
document.querySelectorAll("[data-copy]").forEach(btn=>btn.addEventListener("click",async()=>{const value=$(btn.dataset.copy).textContent.replace(/\s/g,"");if(!/^\d{6}$/.test(value)){btn.textContent="Kode belum tersedia";setTimeout(()=>btn.textContent="Salin "+(btn.dataset.copy==="currentOtp"?"Current OTP":"Master OTP"),1500);return}try{await navigator.clipboard.writeText(value);btn.textContent="Tersalin";setTimeout(()=>btn.textContent="Salin "+(btn.dataset.copy==="currentOtp"?"Current OTP":"Master OTP"),1300)}catch(_){btn.textContent="Gagal menyalin";setTimeout(()=>btn.textContent="Salin kode",1500)}}));
try{if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);const db=firebase.database();
db.ref(".info/connected").on("value",s=>{const ok=s.val()===true;$("connectionDot").classList.toggle("online",ok);$("connectionText").textContent=ok?"Firebase terhubung":"Firebase terputus";});
db.ref("system/masterOtp").on("value",snap=>{const d=snap.val();if(d&&d.status==="active"&&d.code){$("masterOtp").textContent=formatCode(d.code);$("masterStatus").textContent="AKTIF";$("masterHint").textContent="Master OTP aktif · sumber Firebase"}else{$("masterOtp").textContent="— — —";$("masterStatus").textContent="TIDAK AKTIF";$("masterHint").textContent="Tidak ada Master OTP aktif saat ini"}});
db.ref("system/pengawasPin").on("value",snap=>{const d=snap.val();if(d&&d.hash){$("pinStatus").textContent=d.date===new Date().toLocaleDateString("sv-SE")?"Hash PIN hari ini tersedia":"Data hash PIN tersedia";$("pinDetail").textContent="Tanggal data: "+(d.date||"tidak tercatat")+". Nilai PIN asli tidak disimpan dalam Firebase, sehingga tidak dapat ditampilkan kembali."}else{$("pinStatus").textContent="Data PIN belum tersedia";$("pinDetail").textContent="Belum ditemukan data PIN pada sumber yang sudah ada."}});
}catch(e){$("connectionText").textContent="Firebase gagal diinisialisasi";$("pinDetail").textContent="Tidak dapat membaca sumber data: "+e.message}
