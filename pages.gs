// pages.gs — אימוני ירי v5.2.0

// =====================================================
// Shared CSS & responsive helpers (single source of truth)
// =====================================================

/**
 * Base CSS shared by all pages. Includes:
 *   reset, body base, .container, .section, .field,
 *   .btn colors, .toast, .spinner, badges
 * Each page adds layout overrides (body padding, btn display/size, etc.)
 */
function getBaseCSS() {
  return '*{box-sizing:border-box;margin:0;padding:0}'
  + 'body{font-family:Segoe UI,Tahoma,Arial,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}'
  + '.container{max-width:100%;margin:0 auto}'
  + '.section{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px 16px;margin-bottom:24px}'
  + 'h1{color:#f8fafc}'
  + '.field{margin-bottom:14px}'
  + '.field label{display:block;color:#94a3b8;font-size:13px;margin-bottom:6px}'
  + '.field input,.field select{width:100%;padding:10px 14px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:15px;font-family:inherit}'
  + '.field input:focus,.field select:focus{outline:none;border-color:#3b82f6}'
  + '.field input[readonly]{opacity:.6;cursor:not-allowed}'
  + '.btn{border-radius:10px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .2s}'
  + '.btn:disabled{opacity:.5;cursor:not-allowed}'
  + '.btn-primary{background:#3b82f6;color:#fff}.btn-primary:hover{background:#2563eb}'
  + '.btn-save{background:#16a34a;color:#fff}.btn-save:hover{background:#15803d}'
  + '.btn-success{background:#16a34a;color:#fff}.btn-success:hover{background:#15803d}'
  + '.btn-danger{background:#dc2626;color:#fff}.btn-danger:hover{background:#b91c1c}'
  + '.btn-new{background:#7c3aed;color:#fff}.btn-new:hover{background:#6d28d9}'
  + '.btn-back{background:#475569;color:#fff}.btn-back:hover{background:#64748b}'
  + '.btn-small{padding:8px 16px;font-size:13px}'
  + '.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;display:none;z-index:999}'
  + '.toast.show{display:block}'
  + '.toast.success{background:#16a34a;color:#fff}'
  + '.toast.error{background:#dc2626;color:#fff}'
  + '.spinner{display:none;text-align:center;padding:20px;color:#60a5fa}'
  + '.spinner.show{display:block}';
}

/**
 * Zoom script for GAS iframe mobile fix + desktop max-width.
 * On mobile (viewport > 1.5x screen width): applies CSS zoom.
 * On desktop: sets container max-width for proper layout.
 *
 * @param {string} desktopMaxWidth — e.g. '520px', '900px', or null for no constraint
 * @param {boolean} adminFlag — if true, sets window._adminZoomed for later unzoom
 * @returns {string} — full <script>...</script> tag
 */
function getZoomScript(desktopMaxWidth, adminFlag) {
  var s = '<script>(function(){var vw=window.innerWidth,sw=screen.width;if(vw>sw*1.5){var z=vw/sw;document.body.style.zoom=z;document.body.style.width=(vw/z)+"px";document.body.style.overflowX="hidden"';
  if (adminFlag) s += ';window._adminZoomed=true';
  s += '}';
  if (desktopMaxWidth) s += 'else{var c=document.querySelector(".container");if(c){c.style.maxWidth="' + desktopMaxWidth + '"}}';
  s += '})()</script>';
  return s;
}

// =====================================================
// Landing Page
// =====================================================

function getLandingHtml() {
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
+'<title>הכשרת ירי</title>'
+'<style>' + getBaseCSS()
+'body{display:flex;align-items:flex-start;justify-content:center;padding:40px 24px 24px}'
+'.container{max-width:600px;width:100%;text-align:center}'
+'h1{font-size:32px;margin-bottom:12px}'
+'p.subtitle{color:#94a3b8;font-size:16px;margin-bottom:48px;line-height:1.6}'
+'.nav-cards{display:grid;grid-template-columns:1fr;gap:16px;margin-bottom:24px}'
+'.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;text-decoration:none;color:inherit;transition:all .3s;display:flex;flex-direction:column;align-items:center;text-align:center}'
+'.card:hover{border-color:#3b82f6;background:#162033;transform:translateY(-2px)}'
+'.card-icon{font-size:48px;margin-bottom:16px}'
+'.card h2{font-size:20px;color:#f8fafc;margin-bottom:8px}'
+'.card p{color:#94a3b8;font-size:14px}'
+'</style></head><body>'
+'<div class="container">'
+'<h1>שלום!</h1>'
+'<p class="subtitle">מערכת ניהול אימוני ירי והשתתפות מתאמנים</p>'
+'<div class="nav-cards">'
+'<a href="' + WEBAPP_URL + '?action=instructor" class="card"><div class="card-icon">👨‍🏫</div><h2>מדריך? כניסה לניהול אימונים</h2><p>צרו אימון חדש, הדפיסו רשימות, וניהלו את ההשתתפויות</p></a>'
+'<a href="' + WEBAPP_URL + '?action=register" class="card"><div class="card-icon">📝</div><h2>מתאמן? רישום</h2><p>רישום חדש או עדכון הרשומה שלך בבסיס הנתונים</p></a>'
+'<a href="' + WEBAPP_URL + '?action=poll" class="card"><div class="card-icon">📋</div><h2>מתאמן? סקר נוכחות</h2><p>סימון הגעה לאימון עם פרטי הנשק</p></a>'
+'</div>'
+'</div>'
+ getZoomScript()
+'</body></html>';
}

// =====================================================
// Register Page — רישום מתאמנים
// =====================================================

function getLookupHtml(prefillTz, adminMode) {
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
  +'<title>\u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</title>'
  +'<style>' + getBaseCSS()
  +'body{padding:24px}'
  +'.container{padding:0 16px}'
  +'h1{font-size:22px;margin-bottom:8px;text-align:center}'
  +'p.sub{color:#94a3b8;font-size:14px;text-align:center;margin-bottom:24px}'
  +'.btn{display:block;width:100%;padding:14px;font-size:16px}'
  +'.btn-save{margin-top:16px}'
  +'.btn-new{margin-top:16px;cursor:pointer}'
  +'.result{margin-top:20px;display:none}'
  +'.result.show{display:block;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px}'
  +'.card{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin-bottom:12px}'
  +'.card h3{color:#60a5fa;font-size:16px;margin-bottom:12px}'
  +'.tool-section{background:#162033;border:1px solid #334155;border-radius:10px;padding:16px;margin-top:12px}'
  +'.tool-section h4{color:#4ade80;font-size:14px;margin-bottom:12px}'
  +'.not-found{text-align:center;padding:20px;color:#fbbf24;font-size:15px}'
  +'.field-hint{color:#64748b;font-size:11px;margin-top:3px}'
+'.field-hint.warn{color:#f59e0b}'
+'a.link{color:#60a5fa;text-decoration:none}a.link:hover{text-decoration:underline}'
+'</style></head><body>'
  +'<div id="toast" class="toast"></div>'
  +'<div class="container">'
  +'<div id="tzArea" class="section" style="max-width:420px;margin:40px auto">'
  +'<h1>\u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</h1>'
  +'<p class="sub">\u05D4\u05D6\u05DF \u05EA.\u05D6. \u05DC\u05D7\u05D9\u05E4\u05D5\u05E9/\u05E2\u05D3\u05DB\u05D5\u05DF \u05E8\u05D9\u05E9\u05D5\u05DD \u05E7\u05D9\u05D9\u05DD, \u05D0\u05D5 \u05DC\u05D7\u05E5 \u05DC\u05E8\u05D9\u05E9\u05D5\u05DD \u05D7\u05D3\u05E9</p>'
  +'<div class="field"><label>\u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D4\u05D5\u05EA</label>'
  +'<input type="text" id="tzInput" placeholder="123456789" inputmode="numeric">'
  +'<div class="field-hint">\u05E1\u05E4\u05E8\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3, 8\u20139 \u05EA\u05D5\u05D5\u05D9\u05DD</div></div>'
  +'<button class="btn btn-primary" id="searchBtn" onclick="doSearch()" style="width:100%">\u05D7\u05E4\u05E9 / \u05E8\u05D9\u05E9\u05D5\u05DD \u05D7\u05D3\u05E9</button>'
  +'<div class="spinner" id="spinner">\u05DE\u05D7\u05E4\u05E9...</div>'
  +'</div>'
  +'<div class="result" id="result"></div>'
  +'</div>'
  +'<script>'
  +'var editMode=false;var currentTz="";'
  +'function showToast(msg,type){var t=document.getElementById("toast");t.textContent=msg;t.className="toast show "+type;setTimeout(function(){t.className="toast"},3500)}'
  +'function withLoading(btn,cb){if(!btn){cb(function(){});return;}btn.disabled=true;btn.dataset.origText=btn.dataset.origText||btn.textContent;btn.textContent="\u05D8\u05D5\u05E2\u05DF...";var done=function(){btn.disabled=false;btn.textContent=btn.dataset.origText;};cb(done);}'

  +'function doSearch(){'
  +'var tz=document.getElementById("tzInput").value.trim();'
  +'if(!tz){alert("\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05EA.\u05D6.");return}'
  +'currentTz=tz;'
  +'document.getElementById("result").className="result";'
  +'var btn=document.getElementById("searchBtn");withLoading(btn,function(done){'
  +'var failHandler=function(e){'
  +'done();'
  +'document.getElementById("result").className="result show";'
  +'document.getElementById("result").innerHTML=\'<div class="not-found">\u05E9\u05D2\u05D9\u05D0\u05D4: \'+e.message+\'</div>\';};'
  +'if(ADMIN_MODE){'
  +'google.script.run.withSuccessHandler(function(r){done();'
  +'if(r&&r.found){showResult({found:true,name:r.name,tz:r.tz,phone:r.phone,tools:r.tools})}else{showResult({found:false})}'
  +'}).withFailureHandler(failHandler).getVerifiedTraineeData(tz)'
  +'}else{'
  +'google.script.run.withSuccessHandler(function(r){done();showResult(r)}).withFailureHandler(failHandler).lookupByTZ(tz)}});}'

  +'function showResult(data){'
  +'var el=document.getElementById("result");'
  +'el.className="result show";'
  +'if(!data.found){'
  // Not found → show new registration form with ת.ז. pre-filled
  +'editMode=false;'
  +'showForm(el,{name:"",tz:currentTz,phone:"",tools:[]},false);'
  +'return}'
  // Suspended trainee (v5.0.0) — can still edit data, show info banner
  +'if(data.suspended){el.insertAdjacentHTML("beforeend",\'<div style="background:#451a03;border:1px solid #d97706;border-radius:10px;padding:16px;margin-bottom:12px;text-align:center"><span style="color:#fbbf24;font-weight:600">\u26A0\uFE0F \u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05DE\u05D5\u05E9\u05E2\u05D4</span><p style="color:#e2e8f0;font-size:13px;margin-top:4px">\u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05D3\u05DB\u05DF \u05E4\u05E8\u05D8\u05D9\u05DD \u05D0\u05D9\u05E9\u05D9\u05D9\u05DD. \u05DC\u05D1\u05D9\u05D8\u05D5\u05DC \u05D4\u05D4\u05E9\u05E2\u05D9\u05D4 \u05E4\u05E0\u05D4 \u05DC\u05DE\u05E0\u05D4\u05DC.</p></div>\');}'
  // OTP needed — trainee has stored email but no Google session
  +'if(data.needsOTP){'
  +'showOTPStep(data.maskedEmail);'
  +'return;}'
  // Email needed — trainee exists but no stored email and no Google session
  +'if(data.needsEmail){'
  +'showEmailStep(data.name);'
  +'return;}'
  // Found → show edit form
  +'editMode=true;'
  +'showForm(el,data,true);}'

  // Shared form builder for both new and edit modes
  +'function showForm(el,data,isEdit){'
  +'while((data.tools||[]).length<4)data.tools.push({license:"",expiry:"",weaponType:"",weaponNum:"",caliber:""});'
  +'var title=isEdit?"\u05E2\u05D3\u05DB\u05D5\u05DF \u05E8\u05D9\u05E9\u05D5\u05DD":"\u05E8\u05D9\u05E9\u05D5\u05DD \u05D7\u05D3\u05E9";'
  +'var h=\'<div class="card"><h3>\'+title+\' - \u05E4\u05E8\u05D8\u05D9\u05DD \u05D0\u05D9\u05E9\u05D9\u05D9\u05DD</h3>\';'
  +'h+=field("\u05E9\u05DD \u05DE\u05DC\u05D0","ed_name",data.name,false,null,"\u05D9\u05E9\u05E8\u05D0\u05DC \u05D9\u05E9\u05E8\u05D0\u05DC\u05D9");'
  +'h+=field("\u05EA.\u05D6.","ed_tz",data.tz,true,"\u05E1\u05E4\u05E8\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3, 8\u20139 \u05EA\u05D5\u05D5\u05D9\u05DD. \u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: 123456789","123456789");'
  +'h+=field("\u05D8\u05DC\u05E4\u05D5\u05DF","ed_phone",data.phone,false,"\u05E1\u05E4\u05E8\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3, 10 \u05EA\u05D5\u05D5\u05D9\u05DD, \u05DE\u05EA\u05D7\u05D9\u05DC \u05D1-0. \u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: 0541234567","0541234567");'
  +'h+=\'</div>\';'
  +'for(var i=0;i<4;i++){'
  +'var t=data.tools[i];var p="ed_t"+i+"_";'
  +'var req=i===0?" (\u05D7\u05D5\u05D1\u05D4)":"";'
  +'h+=\'<div class="tool-section"><h4>\u05DB\u05DC\u05D9 \'+(i+1)+req+\'</h4>\';'
  +'h+=field("\u05DE\u05E1\u05F3 \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF",p+"lic",t.license,false,"\u05E1\u05E4\u05E8\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3. \u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: 9876543","9876543");'
  +'h+=field("\u05D1\u05EA\u05D5\u05E7\u05E3 \u05E2\u05D3 (dd/mm/yyyy)",p+"exp",t.expiry,false,null,"31/12/2026");'
  +'h+=sel("\u05E1\u05D5\u05D2 \u05DB\u05DC\u05D9",p+"type",t.weaponType,["\u05D0\u05E7\u05D3\u05D7","PCC"]);'
  +'h+=field("\u05DE\u05E1\u05F3 \u05DB\u05DC\u05D9",p+"num",t.weaponNum,false,"<span class=\\"warn\\">\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05D1\u05D3\u05D9\u05D5\u05E7 \u05DB\u05E4\u05D9 \u05E9\u05DE\u05D5\u05E4\u05D9\u05E2 \u05D1\u05E8\u05D9\u05E9\u05D9\u05D5\u05DF</span>","AB12345");'
  +'h+=sel("\u05E7\u05D5\u05D8\u05E8",p+"cal",t.caliber,["9x19",".40S&W",".45 ACP"]);'
  +'h+=\'</div>\';}'
  +'var btnLabel=isEdit?"\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD":"\u05E9\u05DC\u05D7 \u05E8\u05D9\u05E9\u05D5\u05DD";'
  +'var btnClass=isEdit?"btn btn-save":"btn btn-new";'
  +'h+=\'<button class="\'+btnClass+\'" id="saveBtn" onclick="doSave()">\'+btnLabel+\'</button>\';'
  +'el.innerHTML=h}'

  +'function field(lbl,id,val,ro,hint,ph){'
  +'var h=\'<div class="field"><label>\'+lbl+\'</label><input type="text" id="\'+id+\'" value="\'+esc(val||"")+\'"\';'
  +'if(ro)h+=" readonly";if(ph)h+=" placeholder=\'"+esc(ph)+"\'";'
  +'h+=\'>\';if(hint)h+=\'<div class="field-hint">\'+hint+\'</div>\';'
  +'h+=\'</div>\';return h}'

  +'function sel(lbl,id,val,opts){'
  +'var h=\'<div class="field"><label>\'+lbl+\'</label><select id="\'+id+\'">\';'
  +'h+=\'<option value=""\'+ (!val ? \' selected\' : \'\') +\'>\u05D1\u05D7\u05E8...</option>\';'
  +'for(var i=0;i<opts.length;i++){h+=\'<option value="\'+opts[i]+\'"\' + (opts[i]===val ? \' selected\' : \'\') + \'>\'+opts[i]+\'</option>\'}'
  +'h+=\'</select></div>\';return h}'

  +'function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}'

  +'function doSave(){'
  +'var btn=document.getElementById("saveBtn");var saveDone=null;'
  +'function fail(msg){if(saveDone)saveDone();showToast(msg,"error")}'
  +'withLoading(btn,function(done){saveDone=done;'
  +'var d={tz:document.getElementById("ed_tz").value.trim(),'
  +'name:document.getElementById("ed_name").value.trim(),'
  +'phone:document.getElementById("ed_phone").value.trim(),'
  +'tools:[]};'
  // Validate all trainee fields are filled
  +'if(!d.name){fail("\u05E9\u05DD \u05DE\u05DC\u05D0 \u05D4\u05D5\u05D0 \u05E9\u05D3\u05D4 \u05D7\u05D5\u05D1\u05D4");return}'
  +'if(!d.tz){fail("\u05EA.\u05D6. \u05D4\u05D5\u05D0 \u05E9\u05D3\u05D4 \u05D7\u05D5\u05D1\u05D4");return}'
  +'if(!/^\\d{8,9}$/.test(d.tz)){fail("\u05EA.\u05D6. \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05DB\u05D9\u05DC 8\u20139 \u05E1\u05E4\u05E8\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3");return}'
  +'if(!d.phone){fail("\u05D8\u05DC\u05E4\u05D5\u05DF \u05D4\u05D5\u05D0 \u05E9\u05D3\u05D4 \u05D7\u05D5\u05D1\u05D4");return}'
  +'if(!/^0\\d{9}$/.test(d.phone)){fail("\u05D8\u05DC\u05E4\u05D5\u05DF \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05DB\u05D9\u05DC 10 \u05E1\u05E4\u05E8\u05D5\u05EA, \u05DE\u05EA\u05D7\u05D9\u05DC \u05D1-0, \u05DC\u05DC\u05D0 \u05E8\u05D5\u05D5\u05D7\u05D9\u05DD");return}'
  // Build tools and validate completeness
  +'for(var i=0;i<4;i++){'
  +'var p="ed_t"+i+"_";'
  +'var lic=document.getElementById(p+"lic").value.trim();'
  +'var exp=document.getElementById(p+"exp").value.trim();'
  +'var typ=document.getElementById(p+"type").value;'
  +'var num=document.getElementById(p+"num").value.trim();'
  +'var cal=document.getElementById(p+"cal").value;'
  +'var fields=[lic,exp,typ,num,cal];'
  +'var filled=fields.filter(function(f){return f!==""}).length;'
  +'if(filled>0&&filled<5){fail("\u05DB\u05DC\u05D9 "+(i+1)+": \u05D9\u05E9 \u05DC\u05DE\u05DC\u05D0 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E9\u05D3\u05D5\u05EA \u05D0\u05D5 \u05DC\u05E0\u05E7\u05D5\u05EA \u05D4\u05DB\u05DC");return}'
  +'if(lic&&!/^\\d+$/.test(lic)){fail("\u05DB\u05DC\u05D9 "+(i+1)+": \u05DE\u05E1\u05F3 \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05DB\u05D9\u05DC \u05E1\u05E4\u05E8\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3");return}'
  +'d.tools.push({license:lic,expiry:exp,weaponType:typ,weaponNum:num,caliber:cal})}'
  +'if(!d.tools[0].license){fail("\u05DB\u05DC\u05D9 1 \u05D4\u05D5\u05D0 \u05E9\u05D3\u05D4 \u05D7\u05D5\u05D1\u05D4");return}'
  +'var fn=editMode?"updateTraineeData":"addTraineeData";'
  +'google.script.run.withSuccessHandler(function(r){'
  +'saveDone();'
  +'if(r.success){showToast(r.message,"success");if(!editMode){editMode=true;btn.dataset.origText="\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD";btn.textContent="\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD";btn.className="btn btn-save"}}else{showToast(r.message,"error")}'
  +'}).withFailureHandler(function(e){'
  +'saveDone();'
  +'showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'})[fn](d)});}'

  +'function showOTPStep(maskedEmail){'
  +'var el=document.getElementById("result");'
  +'el.className="result show";'
  +'var h=\'<div class="card"><h3>\u05D0\u05D9\u05DE\u05D5\u05EA \u05D6\u05D4\u05D5\u05EA</h3>\';'
  +'h+=\'<p style="color:#94a3b8;margin-bottom:16px;text-align:center">\u05E0\u05E9\u05DC\u05D7 \u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA \u05DC: \'+maskedEmail+\'</p>\';'
  +'h+=\'<div class="field"><label>\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA</label>\';'
  +'h+=\'<input type="text" id="otpCode" placeholder="123456" inputmode="numeric" maxlength="6"></div>\';'
  +'h+=\'<button class="btn btn-primary" id="otpBtn" onclick="doVerifyOTP()" style="width:100%">\u05D0\u05DE\u05EA</button>\';'
  +'h+=\'<p style="color:#64748b;font-size:12px;margin-top:12px;text-align:center">\u05DC\u05D0 \u05E7\u05D9\u05D1\u05DC\u05EA? <a href="javascript:void(0)" onclick="doResendOTP()" style="color:#60a5fa">\u05E9\u05DC\u05D7 \u05E9\u05D5\u05D1</a></p>\';'
  +'h+=\'</div>\';'
  +'el.innerHTML=h;'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(!r.success){showToast(r.message,"error")}'
  +'}).withFailureHandler(function(e){'
  +'showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).requestOTP(currentTz);}'

  +'function doVerifyOTP(){'
  +'var code=document.getElementById("otpCode").value.trim();'
  +'if(!code){showToast("\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E7\u05D5\u05D3","error");return;}'
  +'var btn=document.getElementById("otpBtn");withLoading(btn,function(done){'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(r.success&&r.found){'
  +'done();editMode=true;'
  +'var el=document.getElementById("result");'
  +'showForm(el,r,true);'
  +'}else{done();showToast(r.message||"\u05E7\u05D5\u05D3 \u05E9\u05D2\u05D5\u05D9","error")}'
  +'}).withFailureHandler(function(e){'
  +'done();showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).verifyOTP(currentTz,code)});}'

  +'function doResendOTP(){'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(r.success){showToast("\u05E7\u05D5\u05D3 \u05D7\u05D3\u05E9 \u05E0\u05E9\u05DC\u05D7","success")}else{showToast(r.message,"error")}'
  +'}).withFailureHandler(function(e){'
  +'showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).requestOTP(currentTz);}'

  +'function showEmailStep(name){'
  +'var el=document.getElementById("result");'
  +'el.className="result show";'
  +'var h=\'<div class="card"><h3>\u05E9\u05DC\u05D5\u05DD, \'+esc(name)+\'</h3>\';'
  +'h+=\'<p style="color:#94a3b8;margin-bottom:16px;text-align:center">\u05DC\u05D0\u05D9\u05DE\u05D5\u05EA \u05D6\u05D4\u05D5\u05EA\u05DA, \u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC</p>\';'
  +'h+=\'<div class="field"><label>\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC</label>\';'
  +'h+=\'<input type="email" id="newEmail" placeholder="your@email.com"></div>\';'
  +'h+=\'<button class="btn btn-primary" id="emailBtn" onclick="doSendEmailOTP()" style="width:100%">\u05E9\u05DC\u05D7 \u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA</button>\';'
  +'h+=\'</div>\';'
  +'el.innerHTML=h;}'

  +'function doSendEmailOTP(){'
  +'var email=document.getElementById("newEmail").value.trim();'
  +'if(!email){showToast("\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC","error");return;}'
  +'var btn=document.getElementById("emailBtn");withLoading(btn,function(done){'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(r.success){done();showOTPStep(r.maskedEmail)}else{done();showToast(r.message,"error")}'
  +'}).withFailureHandler(function(e){'
  +'done();showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).requestOTPForEmail(currentTz,email)});}'

  +'document.getElementById("tzInput").addEventListener("keydown",function(e){if(e.key==="Enter")doSearch()});'
  // Auto-search if tz parameter was passed via URL (injected server-side)
  +'var PREFILL_TZ="' + (prefillTz || '') + '";'
  +'var ADMIN_MODE=' + (adminMode ? 'true' : 'false') + ';'
  +'if(ADMIN_MODE){document.querySelector("h1").textContent="\u05E2\u05E8\u05D9\u05DB\u05EA \u05E4\u05E8\u05D8\u05D9 \u05DE\u05EA\u05D0\u05DE\u05DF (\u05DE\u05E0\u05D4\u05DC)";document.querySelector("p.sub").textContent="\u05DE\u05E6\u05D1 \u05E2\u05E8\u05D9\u05DB\u05D4 \u05E2\u05DC \u05D9\u05D3\u05D9 \u05DE\u05E0\u05D4\u05DC";}'
  +'if(PREFILL_TZ){document.getElementById("tzInput").value=PREFILL_TZ;doSearch()}'
  +'<\/script>' + getZoomScript('520px')
  +'</body></html>';
}

// =====================================================
// Attendance Poll (HTML replacement for Google Forms poll)
// =====================================================

// Look up existing poll response for a trainee by name
function getPollHtml(sessionId) {
  var registerUrl = REGISTER_URL;
  var activeSessions = getActiveSessions();
  var sessionsJson = JSON.stringify(activeSessions).replace(/'/g, "\\'").replace(/<\//g, '<\\/');
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
  +'<title>\u05E1\u05E7\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA</title>'
  +'<style>' + getBaseCSS()
  +'body{padding:24px}'
  +'.container{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px 16px;max-width:100%;width:100%;margin:0 auto}'
  +''
  +'h1{font-size:22px;margin-bottom:8px;text-align:center}'
  +'p.sub{color:#94a3b8;font-size:14px;text-align:center;margin-bottom:24px}'
  +'.field{margin-bottom:16px}'
  +'.field input,.field select,.field textarea{padding:12px 14px}'
  +'.field textarea{resize:vertical;min-height:60px}'
  +'.radio-group{display:flex;gap:12px;margin-top:6px}'
  +'.radio-group label{display:flex;align-items:center;gap:8px;padding:12px 20px;border-radius:10px;border:2px solid #475569;cursor:pointer;font-size:16px;font-weight:600;transition:all .2s;flex:1;justify-content:center}'
  +'.radio-group input{display:none}'
  +'.radio-group .yes{border-color:#16a34a;background:#16a34a22;color:#4ade80}'
  +'.radio-group .no{border-color:#dc2626;background:#dc262622;color:#f87171}'
  +'.radio-group label:has(input:checked).yes{background:#16a34a;color:#fff}'
  +'.radio-group label:has(input:checked).no{background:#dc2626;color:#fff}'
  +'.btn{display:block;width:100%;padding:14px;font-size:16px}'
  +'.btn-primary{margin-top:8px}'
  +'.btn-register{background:#7c3aed;color:#fff;margin-top:16px;text-decoration:none;text-align:center;display:block;padding:14px;border-radius:10px;font-size:16px;font-weight:600}'
  +'.btn-register:hover{background:#6d28d9}'
  +'.success-msg{text-align:center;padding:30px;color:#4ade80;font-size:18px;font-weight:600}'
  +'.not-found{text-align:center;padding:24px;color:#fbbf24;font-size:15px;line-height:1.6}'
  +'.trainee-name{text-align:center;color:#4ade80;font-size:18px;font-weight:600;margin-bottom:16px}'
  +'.existing-notice{background:#fbbf2422;border:1px solid #fbbf24;border-radius:10px;padding:14px;margin-bottom:16px;color:#fbbf24;font-size:14px;line-height:1.6;text-align:center}'
  +'.existing-notice strong{color:#fde68a}'
  +'.expired-overlay{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:1000;align-items:center;justify-content:center}'
  +'.expired-overlay.show{display:flex}'
  +'.expired-box{background:#1e293b;border:3px solid #dc2626;border-radius:16px;padding:40px;max-width:440px;width:90%;text-align:center;box-shadow:0 0 40px rgba(220,38,38,.5)}'
  +'.expired-icon{font-size:64px;margin-bottom:16px}'
  +'.expired-title{color:#f87171;font-size:24px;font-weight:700;margin-bottom:12px}'
  +'.expired-msg{color:#fca5a5;font-size:16px;line-height:1.7;margin-bottom:24px}'
  +'.expired-detail{color:#94a3b8;font-size:14px;margin-bottom:20px}'
  +'.btn-back{background:#475569;color:#fff;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;border:none;cursor:pointer}'
  +'.btn-back:hover{background:#64748b}'
+'.btn-edit-link{display:inline-block;margin-top:8px;color:#60a5fa;font-size:13px;text-decoration:none;border:1px solid #475569;border-radius:8px;padding:6px 14px;transition:all .2s}'
+'.btn-edit-link:hover{background:#334155;border-color:#60a5fa}'
+'.session-picker{margin-bottom:20px}'
+'.session-picker select{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:15px;font-family:inherit}'
+'.session-picker select:focus{outline:none;border-color:#3b82f6}'
+'.no-sessions{text-align:center;padding:30px;color:#fbbf24;font-size:16px;line-height:1.8}'
+'.session-info{text-align:center;color:#60a5fa;font-size:14px;margin-bottom:16px;padding:8px;background:#1e3a5f;border-radius:8px}'
  +'</style></head><body>'
  +'<div id="expiredOverlay" class="expired-overlay">'
  +'<div class="expired-box">'
  +'<div class="expired-icon">\u26D4</div>'
  +'<div class="expired-title">\u05E8\u05D9\u05E9\u05D9\u05D5\u05DF \u05E4\u05D2 \u05EA\u05D5\u05E7\u05E3!</div>'
  +'<div class="expired-msg">\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05E9\u05EA\u05EA\u05E3 \u05D1\u05D0\u05D9\u05DE\u05D5\u05DF \u05E2\u05DD \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF \u05E9\u05E4\u05D2 \u05EA\u05D5\u05E7\u05E4\u05D5.<br>\u05D9\u05E9 \u05DC\u05D7\u05D3\u05E9 \u05D0\u05EA \u05D4\u05E8\u05D9\u05E9\u05D9\u05D5\u05DF \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D0\u05D9\u05DE\u05D5\u05DF.</div>'
  +'<div class="expired-detail" id="expiredDetail"></div>'
  +'<button class="btn-back" onclick="closeExpired()">\u05D7\u05D6\u05D5\u05E8</button>'
  +'</div></div>'
  +'<div id="toast" class="toast"></div>'
  +'<div class="container">'
  +'<h1>\u05E1\u05E7\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA</h1>'
  +'<div id="sessionPickerArea" class="session-picker" style="display:none">'
  +'<div class="field"><label>\u05D1\u05D7\u05E8 \u05D0\u05D9\u05DE\u05D5\u05DF</label>'
  +'<select id="sessionSelect" onchange="onSessionSelected()"><option value="">\u05D1\u05D7\u05E8 \u05D0\u05D9\u05DE\u05D5\u05DF...</option></select></div></div>'
  +'<div id="noSessionsArea" class="no-sessions" style="display:none">\u05D0\u05D9\u05DF \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD \u05E4\u05EA\u05D5\u05D7\u05D9\u05DD \u05DB\u05E8\u05D2\u05E2.<br>\u05E4\u05E0\u05D4/\u05D9 \u05DC\u05DE\u05D3\u05E8\u05D9\u05DA.</div>'
  +'<div id="sessionInfoBar" class="session-info" style="display:none"></div>'
  +'<p class="sub" id="subText" style="display:none">\u05D4\u05D6\u05DF \u05EA.\u05D6. \u05DC\u05D6\u05D9\u05D4\u05D5\u05D9 \u05D5\u05D3\u05D9\u05D5\u05D5\u05D7 \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA</p>'
  +'<div id="tzArea" style="display:none">'
  +'<div class="field"><label>\u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D4\u05D5\u05EA</label>'
  +'<input type="text" id="tzInput" placeholder="\u05D4\u05D6\u05DF \u05EA.\u05D6." inputmode="numeric"></div>'
  +'<button class="btn btn-primary" id="searchBtn" onclick="doLookup()" style="width:100%">\u05D4\u05DE\u05E9\u05DA</button>'
  +'</div>'
  +'<div class="spinner" id="spinner">\u05DE\u05D7\u05E4\u05E9...</div>'
  +'<div id="formArea"></div>'
  +'</div>'
  +'<script>'
  +'var REGISTER_URL="' + registerUrl + '";var SESSION_ID="' + (sessionId || '') + '";'
  +'var ACTIVE_SESSIONS=' + sessionsJson + ';'
  +'var traineeData=null;var currentTz=null;'

  +'function initSessionPicker(){'
  +'if(SESSION_ID){'
  // URL has session param — check if it's valid
  +'var found=false;for(var i=0;i<ACTIVE_SESSIONS.length;i++){if(ACTIVE_SESSIONS[i].sessionId===SESSION_ID){found=true;'
  +'document.getElementById("sessionInfoBar").textContent="\u05D0\u05D9\u05DE\u05D5\u05DF: "+ACTIVE_SESSIONS[i].date+" | "+ACTIVE_SESSIONS[i].instructorName;'
  +'document.getElementById("sessionInfoBar").style.display="block";break}}'
  +'if(found){document.getElementById("subText").style.display="block";document.getElementById("tzArea").style.display="block";return}'
  // Session ID from URL not found among active sessions
  +'SESSION_ID=""}'
  // No session param or invalid — check active sessions
  +'if(ACTIVE_SESSIONS.length===0){document.getElementById("noSessionsArea").style.display="block";return}'
  +'if(ACTIVE_SESSIONS.length===1){'
  // Only one active session — auto-select
  +'SESSION_ID=ACTIVE_SESSIONS[0].sessionId;'
  +'document.getElementById("sessionInfoBar").textContent="\u05D0\u05D9\u05DE\u05D5\u05DF: "+ACTIVE_SESSIONS[0].date+" | "+ACTIVE_SESSIONS[0].instructorName;'
  +'document.getElementById("sessionInfoBar").style.display="block";'
  +'document.getElementById("subText").style.display="block";document.getElementById("tzArea").style.display="block";return}'
  // Multiple sessions — show picker
  +'var sel=document.getElementById("sessionSelect");'
  +'for(var i=0;i<ACTIVE_SESSIONS.length;i++){var o=document.createElement("option");o.value=ACTIVE_SESSIONS[i].sessionId;o.textContent=ACTIVE_SESSIONS[i].date+" - "+ACTIVE_SESSIONS[i].instructorName+(ACTIVE_SESSIONS[i].notes?" ("+ACTIVE_SESSIONS[i].notes+")":"");sel.appendChild(o)}'
  +'document.getElementById("sessionPickerArea").style.display="block"}'

  +'function onSessionSelected(){'
  +'var sel=document.getElementById("sessionSelect");'
  +'SESSION_ID=sel.value;'
  +'if(SESSION_ID){document.getElementById("subText").style.display="block";document.getElementById("tzArea").style.display="block"}'
  +'else{document.getElementById("subText").style.display="none";document.getElementById("tzArea").style.display="none"}}'

  +'initSessionPicker();'

  +'function showToast(msg,type){var t=document.getElementById("toast");t.textContent=msg;t.className="toast show "+type;setTimeout(function(){t.className="toast"},3500)}'

  +'function withLoading(btn,cb){if(!btn){cb(function(){});return;}btn.disabled=true;btn.dataset.origText=btn.dataset.origText||btn.textContent;btn.textContent="\u05D8\u05D5\u05E2\u05DF...";var done=function(){btn.disabled=false;btn.textContent=btn.dataset.origText;};cb(done);}'

  +'function esc(s){return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}'

  +'function parseExpiry(s){if(!s)return null;var p=s.split("/");if(p.length!==3)return null;return new Date(parseInt(p[2],10),parseInt(p[1],10)-1,parseInt(p[0],10))}'

  +'function checkExpiry(){'
  +'if(!traineeData||!traineeData.tools||!traineeData.tools.length)return;'
  +'var selEl=document.getElementById("selectedTool");'
  +'var idx=selEl?parseInt(selEl.value,10)||0:0;'
  +'var tool=traineeData.tools[idx]||{};'
  +'var exp=parseExpiry(tool.expiry);'
  +'if(!exp)return;'
  +'var today=new Date();today.setHours(0,0,0,0);'
  +'if(exp<today){'
  +'document.getElementById("expiredDetail").textContent="\u05DB\u05DC\u05D9: "+(tool.weaponType||"")+" - "+(tool.license||"")+"  |  \u05EA\u05D5\u05E7\u05E3: "+tool.expiry;'
  +'document.getElementById("expiredOverlay").className="expired-overlay show"}'
  +'}'

  +'function closeExpired(){document.getElementById("expiredOverlay").className="expired-overlay"}'

  +'function doLookup(){'
  +'var tz=document.getElementById("tzInput").value.trim();'
  +'if(!tz){showToast("\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05EA.\u05D6.","error");return}'
  +'currentTz=tz;'
  +'document.getElementById("formArea").innerHTML="";'
  +'var btn=document.getElementById("searchBtn");withLoading(btn,function(done){'
  +'google.script.run.withSuccessHandler(function(data){done();showLookupResult(data);}).withFailureHandler(function(e){'
  +'done();showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).lookupByTZ(tz)});}'

  +'function showLookupResult(data){'
  +'var area=document.getElementById("formArea");'
  +'if(!data.found){'
  // Not found → show message + link to registration
  +'area.innerHTML=\'<div class="not-found">\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05E8\u05D9\u05E9\u05D5\u05DD \u05E2\u05D1\u05D5\u05E8 \u05EA.\u05D6. \u05D6\u05D5.<br>\u05D9\u05E9 \u05DC\u05D4\u05D9\u05E8\u05E9\u05DD \u05EA\u05D7\u05D9\u05DC\u05D4.</div>'
  +'<a class="btn-register" href="\'+REGISTER_URL+\'" target="_blank">\u05DC\u05D3\u05E3 \u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</a>\';'
  +'return}'
  // Suspended trainee (v5.0.0)
  +'if(data.suspended){area.innerHTML=\'<div style="background:#451a03;border:1px solid #d97706;border-radius:12px;padding:24px;text-align:center;margin:16px 0"><div style="font-size:24px;margin-bottom:8px">\u26A0\uFE0F</div><h3 style="color:#fbbf24;margin-bottom:8px">\u05D4\u05D7\u05E9\u05D1\u05D5\u05DF \u05E9\u05DC\u05DA \u05DE\u05D5\u05E9\u05E2\u05D4</h3><p style="color:#e2e8f0;margin-bottom:8px">\u05E1\u05D9\u05D1\u05D4: \'+(data.suspensionReason||"\u05DC\u05D0 \u05E6\u05D5\u05D9\u05E0\u05D4")+\'</p><p style="color:#94a3b8;font-size:14px">\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D3\u05D5\u05D5\u05D7 \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA \u05D1\u05D6\u05DE\u05DF \u05D4\u05E9\u05E2\u05D9\u05D4.<br>\u05DC\u05D1\u05D9\u05D8\u05D5\u05DC \u05D4\u05D4\u05E9\u05E2\u05D9\u05D4 \u05E4\u05E0\u05D4 \u05DC\u05DE\u05E0\u05D4\u05DC.</p><a class="btn-register" href="\'+REGISTER_URL+"&tz="+encodeURIComponent(currentTz)+\'" target="_blank">\u05E2\u05E8\u05D9\u05DB\u05EA \u05E4\u05E8\u05D8\u05D9\u05DD \u05D0\u05D9\u05E9\u05D9\u05D9\u05DD \u2192</a></div>\';return}'
  // OTP needed — trainee has stored email but no Google session
  +'if(data.needsOTP){showOTPStep(data.maskedEmail);return;}'
  // Email needed — trainee exists but no stored email and no Google session
  +'if(data.needsEmail){showEmailStep(data.name);return;}'
  // Found → save data and show tool selector + attendance form
  +'traineeData=data;'
  +'document.getElementById("tzArea").style.display="none";'
  +'var editUrl=REGISTER_URL+"&tz="+encodeURIComponent(data.tz||"");'
  +'var h=\'<div class="trainee-name">\u05E9\u05DC\u05D5\u05DD, \'+esc(data.name)+\'</div>\';'
  +'h+=\'<div style="text-align:center;margin-bottom:12px"><a class="btn-edit-link" href="\'+editUrl+\'" target="_blank">\u270F\uFE0F \u05E2\u05E8\u05D9\u05DB\u05EA \u05E4\u05E8\u05D8\u05D9\u05DD \u05D0\u05D9\u05E9\u05D9\u05D9\u05DD</a></div>\';'
  +'h+=\'<div id="existingNotice"></div>\';'
  // Tool selector — if one tool, auto-select; if multiple, show radio/select
  +'var tools=data.tools||[];'
  +'if(tools.length===1){'
  +'h+=\'<input type="hidden" id="selectedTool" value="0">\';'
  +'h+=\'<div class="field"><label>\u05DB\u05DC\u05D9</label><input type="text" value="\'+esc(tools[0].weaponType+" - "+tools[0].license)+\'" readonly style="opacity:.7;cursor:default"></div>\';'
  +'}else if(tools.length>1){'
  +'h+=\'<div class="field"><label>\u05D1\u05D7\u05E8 \u05DB\u05DC\u05D9</label><select id="selectedTool" onchange="checkExpiry()">\';'
  +'for(var i=0;i<tools.length;i++){'
  +'h+=\'<option value="\'+i+\'">\'+esc(tools[i].weaponType+" - "+tools[i].license)+\'</option>\'}'
  +'h+=\'</select></div>\';}'
  // Attending yes/no
  +'h+=\'<div class="field"><label>\u05D4\u05D0\u05DD \u05D0\u05EA/\u05D4 \u05DE\u05D2\u05D9\u05E2/\u05D4?</label>\';'
  +'h+=\'<div class="radio-group">\';'
  +'h+=\'<label class="yes" onclick="this.querySelector(\\\'input\\\').checked=true"><input type="radio" name="attending" value="yes"><span>\u05DB\u05DF</span></label>\';'
  +'h+=\'<label class="no" onclick="this.querySelector(\\\'input\\\').checked=true"><input type="radio" name="attending" value="no"><span>\u05DC\u05D0</span></label>\';'
  +'h+=\'</div></div>\';'
  // Bullets
  +'h+=\'<div class="field"><label>\u05DB\u05DE\u05D5\u05EA \u05DB\u05D3\u05D5\u05E8\u05D9\u05DD</label><input type="number" id="bullets" placeholder="\u05DB\u05DE\u05D5\u05EA" min="0" inputmode="numeric"></div>\';'
  // Notes
  +'h+=\'<div class="field"><label>\u05D4\u05E2\u05E8\u05D5\u05EA</label><textarea id="notes" placeholder="\u05D0\u05D5\u05E4\u05E6\u05D9\u05D5\u05E0\u05DC\u05D9"></textarea></div>\';'
  +'h+=\'<button class="btn btn-primary" id="submitBtn" onclick="doSubmit()" style="width:100%" disabled>\u05D8\u05D5\u05E2\u05DF...</button>\';'
  +'area.innerHTML=h;'
  +'checkExpiry();'
  // Load existing poll response to pre-fill form
  +'google.script.run.withSuccessHandler(prefillExisting).withFailureHandler(function(){var b=document.getElementById("submitBtn");if(b){b.disabled=false;b.textContent="\u05E9\u05DC\u05D7"}}).getExistingPollResponse(data.name,SESSION_ID)}'

  +'function prefillExisting(resp){'
  +'var btn=document.getElementById("submitBtn");if(btn){btn.disabled=false;btn.textContent="\u05E9\u05DC\u05D7"}'
  +'if(!resp||!resp.found)return;'
  +'var notice=document.getElementById("existingNotice");'
  // Pre-select the tool that was previously chosen (by matching license)
  +'if(resp.license&&traineeData.tools.length>1){'
  +'var selEl=document.getElementById("selectedTool");'
  +'if(selEl){for(var i=0;i<traineeData.tools.length;i++){if(traineeData.tools[i].license===resp.license){selEl.value=i;break}}}}'
  // Pre-fill attending radio
  +'var val=resp.attending?"yes":"no";'
  +'var radios=document.querySelectorAll(\'input[name="attending"]\');'
  +'for(var i=0;i<radios.length;i++){if(radios[i].value===val)radios[i].checked=true}'
  // Pre-fill bullets and notes
  +'if(resp.bullets){var bEl=document.getElementById("bullets");if(bEl)bEl.value=resp.bullets}'
  +'if(resp.notes){var nEl=document.getElementById("notes");if(nEl)nEl.value=resp.notes}'
  // Show notice
  +'if(resp.attending){'
  +'notice.innerHTML=\'<div class="existing-notice">\u2705 \u05DB\u05D1\u05E8 \u05D3\u05D9\u05D5\u05D5\u05D7\u05EA \u05D4\u05D2\u05E2\u05D4 \u05DC\u05D0\u05D9\u05DE\u05D5\u05DF \u05D6\u05D4.<br>\u05DC\u05D1\u05D9\u05D8\u05D5\u05DC \u05D4\u05D2\u05E2\u05D4 \u2014 \u05E9\u05E0\u05D4/\u05D9 \u05DC<strong>\u05DC\u05D0</strong> \u05D5\u05DC\u05D7\u05E6/\u05D9 "\u05E9\u05DC\u05D7".</div>\''
  +'}else{'
  +'notice.innerHTML=\'<div class="existing-notice">\u05DB\u05D1\u05E8 \u05D3\u05D9\u05D5\u05D5\u05D7\u05EA \u05D0\u05D9 \u05D4\u05D2\u05E2\u05D4 \u05DC\u05D0\u05D9\u05DE\u05D5\u05DF \u05D6\u05D4.<br>\u05DC\u05E9\u05D9\u05E0\u05D5\u05D9 \u2014 \u05E2\u05D3\u05DB\u05DF/\u05D9 \u05D0\u05EA \u05D4\u05D1\u05D7\u05D9\u05E8\u05D4 \u05D5\u05DC\u05D7\u05E6/\u05D9 "\u05E9\u05DC\u05D7".</div>\''
  +'}checkExpiry()}'

  +'function doSubmit(){'
  +'var radios=document.querySelectorAll(\'input[name="attending"]\');'
  +'var att=null;for(var i=0;i<radios.length;i++){if(radios[i].checked)att=radios[i].value}'
  +'if(!att){showToast("\u05D9\u05E9 \u05DC\u05D1\u05D7\u05D5\u05E8 \u05DB\u05DF/\u05DC\u05D0","error");return}'
  +'var toolIdx=0;var selEl=document.getElementById("selectedTool");'
  +'if(selEl)toolIdx=parseInt(selEl.value,10)||0;'
  +'var tool=traineeData.tools[toolIdx]||{};'
  +'var exp=parseExpiry(tool.expiry);'
  +'if(exp){var today=new Date();today.setHours(0,0,0,0);if(exp<today){checkExpiry();return}}'
  +'var traineeLabel=traineeData.name+" - "+(tool.license||"");'
  +'var btn=document.getElementById("submitBtn");withLoading(btn,function(done){'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(r.success){document.getElementById("formArea").innerHTML=\'<div class="success-msg">\u05EA\u05D5\u05D3\u05D4! \'+r.message+\'</div>\'}'
  +'else{done();showToast(r.message,"error")}'
  +'}).withFailureHandler(function(e){'
  +'done();showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).submitPollResponse({trainee:traineeLabel,attending:att==="yes",bullets:(document.getElementById("bullets")||{}).value||"",notes:(document.getElementById("notes")||{}).value||"",sessionId:SESSION_ID})});}'

  +'function showOTPStep(maskedEmail){'
  +'var area=document.getElementById("formArea");'
  +'document.getElementById("tzArea").style.display="none";'
  +'var h=\'<div style="text-align:center;padding:20px"><h3 style="color:#f8fafc;margin-bottom:16px">\u05D0\u05D9\u05DE\u05D5\u05EA \u05D6\u05D4\u05D5\u05EA</h3>\';'
  +'h+=\'<p style="color:#94a3b8;margin-bottom:16px">\u05E0\u05E9\u05DC\u05D7 \u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA \u05DC: \'+maskedEmail+\'</p>\';'
  +'h+=\'<div class="field"><label>\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA</label>\';'
  +'h+=\'<input type="text" id="otpCode" placeholder="123456" inputmode="numeric" maxlength="6"></div>\';'
  +'h+=\'<button class="btn btn-primary" id="otpBtn" onclick="doVerifyOTP()" style="width:100%">\u05D0\u05DE\u05EA</button>\';'
  +'h+=\'<p style="color:#64748b;font-size:12px;margin-top:12px;text-align:center">\u05DC\u05D0 \u05E7\u05D9\u05D1\u05DC\u05EA? <a href="javascript:void(0)" onclick="doResendOTP()" style="color:#60a5fa">\u05E9\u05DC\u05D7 \u05E9\u05D5\u05D1</a></p>\';'
  +'h+=\'</div>\';'
  +'area.innerHTML=h;'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(!r.success){showToast(r.message,"error")}'
  +'}).withFailureHandler(function(e){'
  +'showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).requestOTP(currentTz);}'

  +'function doVerifyOTP(){'
  +'var code=document.getElementById("otpCode").value.trim();'
  +'if(!code){showToast("\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E7\u05D5\u05D3","error");return;}'
  +'var btn=document.getElementById("otpBtn");withLoading(btn,function(done){'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(r.success&&r.found){done();showLookupResult(r)}'
  +'else{done();showToast(r.message||"\u05E7\u05D5\u05D3 \u05E9\u05D2\u05D5\u05D9","error")}'
  +'}).withFailureHandler(function(e){'
  +'done();showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).verifyOTP(currentTz,code)});}'

  +'function doResendOTP(){'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(r.success){showToast("\u05E7\u05D5\u05D3 \u05D7\u05D3\u05E9 \u05E0\u05E9\u05DC\u05D7","success")}else{showToast(r.message,"error")}'
  +'}).withFailureHandler(function(e){'
  +'showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).requestOTP(currentTz);}'

  +'function showEmailStep(name){'
  +'var area=document.getElementById("formArea");'
  +'document.getElementById("tzArea").style.display="none";'
  +'var h=\'<div style="text-align:center;padding:20px"><h3 style="color:#f8fafc;margin-bottom:16px">\u05E9\u05DC\u05D5\u05DD, \'+esc(name)+\'</h3>\';'
  +'h+=\'<p style="color:#94a3b8;margin-bottom:16px">\u05DC\u05D0\u05D9\u05DE\u05D5\u05EA \u05D6\u05D4\u05D5\u05EA\u05DA, \u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC</p>\';'
  +'h+=\'<div class="field"><label>\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC</label>\';'
  +'h+=\'<input type="email" id="newEmail" placeholder="your@email.com"></div>\';'
  +'h+=\'<button class="btn btn-primary" id="emailBtn" onclick="doSendEmailOTP()" style="width:100%">\u05E9\u05DC\u05D7 \u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA</button>\';'
  +'h+=\'</div>\';'
  +'area.innerHTML=h;}'

  +'function doSendEmailOTP(){'
  +'var email=document.getElementById("newEmail").value.trim();'
  +'if(!email){showToast("\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC","error");return;}'
  +'var btn=document.getElementById("emailBtn");withLoading(btn,function(done){'
  +'google.script.run.withSuccessHandler(function(r){'
  +'if(r.success){done();showOTPStep(r.maskedEmail)}else{done();showToast(r.message,"error")}'
  +'}).withFailureHandler(function(e){'
  +'done();showToast("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message,"error")'
  +'}).requestOTPForEmail(currentTz,email)});}'

  +'document.getElementById("tzInput").addEventListener("keydown",function(e){if(e.key==="Enter")doLookup()})'
  +'<\/script>' + getZoomScript('520px')
  +'</body></html>';
}

// =====================================================
// Print page — יומן רישום מתאמנים, A4 landscape, thermal-printer optimized
// =====================================================
function getPrintHtml(sessionId) {
  // Look up session info from sessions sheet
  var sessionInfo = {};
  try {
    var ss = SpreadsheetApp.openById(SESSIONS_SHEET_ID);
    var sheet = ss.getSheets()[0];
    if (sheet && sheet.getLastRow() > 1) {
      var cols = Math.max(sheet.getLastColumn(), 9);
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
      for (var si = 0; si < data.length; si++) {
        if (String(data[si][0] || '').trim() === sessionId) {
          var dateVal = data[si][1];
          sessionInfo.date = (dateVal instanceof Date)
            ? Utilities.formatDate(dateVal, 'Asia/Jerusalem', 'dd/MM/yyyy')
            : String(dateVal).trim();
          sessionInfo.instructorTz = String(data[si][2] || '').trim();
          sessionInfo.instructorName = String(data[si][3] || '').trim();
          sessionInfo.deputy1Tz = data[si].length > 7 ? String(data[si][7] || '').trim() : '';
          sessionInfo.deputy2Tz = data[si].length > 8 ? String(data[si][8] || '').trim() : '';
          break;
        }
      }
    }
  } catch(e) { Logger.log('getPrintHtml session lookup error: ' + e.message); }
  var dateStr = sessionInfo.date || Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd/MM/yyyy');
  var instructor = getInstructorData(sessionInfo.instructorTz || '');
  var deputy1 = sessionInfo.deputy1Tz ? getInstructorData(sessionInfo.deputy1Tz) : null;
  var deputy2 = sessionInfo.deputy2Tz ? getInstructorData(sessionInfo.deputy2Tz) : null;

  // Get trainee data and poll responses (same logic as doRefreshAttending)
  var trainees = getTraineeData();
  var licenseMap = {};
  var traineeNames = Object.keys(trainees);
  for (var tn = 0; tn < traineeNames.length; tn++) {
    var trainee = trainees[traineeNames[tn]];
    for (var ti = 0; ti < trainee.tools.length; ti++) {
      var lic = normalizeId(trainee.tools[ti].license);
      if (lic) licenseMap[lic] = {trainee: trainee, tool: trainee.tools[ti]};
    }
  }

  // Read poll responses
  var ss = SpreadsheetApp.openById(RESPONSE_SHEET_ID);
  var sheets = ss.getSheets();
  var pollSheet = null;
  for (var ps = 0; ps < sheets.length; ps++) {
    if (sheets[ps].getName() === POLL_SHEET_NAME) { pollSheet = sheets[ps]; break; }
  }
  var rows = [];
  if (pollSheet && pollSheet.getLastRow() > 1) {
    var pollData = pollSheet.getRange(2, 1, pollSheet.getLastRow() - 1, Math.max(pollSheet.getLastColumn(), 5)).getValues();
    for (var i = 0; i < pollData.length; i++) {
      var name = String(pollData[i][1] || '');
      var answer = String(pollData[i][2] || '');
      var bullets = String(pollData[i][3] || '');
      var sid = String(pollData[i][5] || '').trim();
      if (answer.indexOf('\u05DB\u05DF') === -1 || sid !== sessionId) continue; // skip "לא"
      var actualName = name, selectedLicense = '';
      if (name.indexOf(' - ') > -1) {
        var parts = name.split(' - ');
        actualName = parts[0].trim();
        selectedLicense = normalizeId(parts[1]);
      }
      var match = selectedLicense ? licenseMap[selectedLicense] : null;
      if (!match) {
        var t = trainees[actualName];
        if (t) match = {trainee: t, tool: t.tools[0] || {}};
      }
      var tr = match ? match.trainee : {};
      var tool = match ? match.tool : {};
      rows.push({
        name: tr.name || actualName,
        tz: tr.tz || '',
        phone: tr.phone || '',
        license: tool.license || '',
        expiry: tool.expiry || '',
        weaponType: tool.weaponType || '',
        weaponNum: tool.weaponNum || '',
        caliber: tool.caliber || '',
        bullets: bullets
      });
    }
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Build HTML table rows — 10 columns matching the sheet exactly
  var tableRows = '';
  for (var r = 0; r < rows.length; r++) {
    var d = rows[r];
    tableRows += '<tr>'
      + '<td>' + (r + 1) + '</td>'
      + '<td>' + esc(d.name) + '</td>'
      + '<td class="ltr">' + esc(d.tz) + '</td>'
      + '<td class="ltr">' + esc(d.phone) + '</td>'
      + '<td class="ltr">' + esc(d.license) + '</td>'
      + '<td class="ltr">' + esc(d.expiry) + '</td>'
      + '<td>' + esc(d.weaponType) + '</td>'
      + '<td class="ltr">' + esc(d.weaponNum) + '</td>'
      + '<td class="ltr">' + esc(d.caliber) + '</td>'
      + '<td>' + esc(d.bullets) + '</td>'
      + '</tr>';
  }
  // Add empty rows for manual additions (up to 9 total)
  var totalRows = Math.max(9, rows.length + 3);
  for (var e2 = rows.length; e2 < totalRows; e2++) {
    tableRows += '<tr>'
      + '<td>' + (e2 + 1) + '</td>'
      + '<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>'
      + '</tr>';
  }

  // Logo height = 3 table rows (each row ~28px = 84px)
  var logoDataUri = 'data:image/jpeg;base64,' + LOGO_BASE64;

  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<title>\u05D9\u05D5\u05DE\u05DF \u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</title>'
    + '<style>'
    + '@page{size:A4 landscape;margin:8mm}'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:Arial,Tahoma,sans-serif;font-size:12px;color:#000;background:#fff;padding:8mm}'
    // Print controls
    + '.no-print{text-align:center;padding:12px;background:#555;margin-bottom:16px;border-radius:8px}'
    + '.no-print button{font-size:16px;padding:12px 32px;border:none;border-radius:8px;cursor:pointer;font-weight:700;margin:0 8px}'
    + '.btn-print{background:#333;color:#fff}'
    + '.btn-back{background:#666;color:#fff}'
    + '@media print{.no-print{display:none}body{padding:0}}'
    // Header area: logo left, text right
    + '.header-area{display:flex;flex-direction:row-reverse;justify-content:space-between;align-items:flex-start;margin-bottom:6px}'
    + '.header-text{text-align:right}'
    + '.header-text .doc-title{font-size:18px;font-weight:700;margin-bottom:2px}'
    + '.header-text .doc-meta{font-size:12px;margin-bottom:1px}'
    + '.header-text .doc-meta b{font-weight:700}'
    + '.header-logo img{height:84px;width:auto;display:block}'
    // Table — B&W optimized
    + 'table{width:100%;border-collapse:collapse;margin-top:4px}'
    + 'th,td{border:1px solid #000;padding:4px 6px;text-align:center;vertical-align:middle;font-size:11px;height:28px}'
    + 'th{background:#e0e0e0;color:#000;font-weight:700;font-size:13px}'
    + 'td.ltr{direction:ltr;text-align:center}'
    + '</style></head><body>'
    // Print controls (hidden in print)
    + '<div class="no-print">'
    + '<button class="btn-print" onclick="window.print()">\uD83D\uDDA8 \u05D4\u05D3\u05E4\u05E1</button>'
    + '<button class="btn-back" onclick="window.history.back()">\u05D7\u05D6\u05D5\u05E8</button>'
    + '</div>'
    // Header area: doc title + meta on right, logo on left
    + '<div class="header-area">'
    + '<div class="header-text">'
    + '<div class="doc-title">\u05D9\u05D5\u05DE\u05DF \u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</div>'
    + '<div class="doc-meta">\u05EA\u05D0\u05E8\u05D9\u05DA \u05D0\u05D9\u05DE\u05D5\u05DF: <b>' + esc(dateStr) + '</b></div>'
    + '<div class="doc-meta">\u05DE\u05D3\u05E8\u05D9\u05DA: <b>' + esc(instructor.name) + '</b> (' + esc(instructor.license) + ')'
    + (deputy1 ? ' | \u05DE"\u05DE 1: <b>' + esc(deputy1.name) + '</b>' : '')
    + (deputy2 ? ' | \u05DE"\u05DE 2: <b>' + esc(deputy2.name) + '</b>' : '')
    + '</div>'
    + '</div>'
    + '<div class="header-logo"><img src="' + logoDataUri + '" alt="logo"></div>'
    + '</div>'
    // Table — 10 columns matching the sheet
    + '<table>'
    + '<thead><tr>'
    + '<th>\u05DE\u05E1\'</th>'
    + '<th>\u05E9\u05DD \u05DE\u05DC\u05D0</th>'
    + '<th>\u05EA.\u05D6.</th>'
    + '<th>\u05D8\u05DC\u05E4\u05D5\u05DF</th>'
    + '<th>\u05DE\u05E1\' \u05E8\u05D9\u05E9\u05D9\u05D5\u05DF</th>'
    + '<th>\u05EA\u05D5\u05E7\u05E3</th>'
    + '<th>\u05E1\u05D5\u05D2 \u05DB\u05DC\u05D9</th>'
    + '<th>\u05DE\u05E1\' \u05DB\u05DC\u05D9</th>'
    + '<th>\u05E7\u05D5\u05D8\u05E8</th>'
    + '<th>\u05DB\u05DE\u05D5\u05EA \u05DB\u05D3\u05D5\u05E8\u05D9\u05DD</th>'
    + '</tr></thead><tbody>'
    + tableRows
    + '</tbody></table>'
    + '</body></html>';
}
function getInstructorDashboardHtml() {
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
+'<title>לוח מדריך</title>'
+'<style>' + getBaseCSS()
+'body{padding:24px}'
+'.container{max-width:100%;margin:0 auto;padding:0 16px}'
+''
+'h1{margin-bottom:8px}'
+'p.subtitle{color:#94a3b8;margin-bottom:24px}'
+'.section{padding:20px 16px}'
+'.section h2{color:#60a5fa;margin-bottom:16px;font-size:18px}'
+'.field input{padding:10px 14px}'
+'.btn{display:inline-block;padding:14px 28px;font-size:15px}'
+'.btn-new{background:#7c3aed;color:#fff}.btn-new:hover{background:#6d28d9}'
+'.sessions-list{display:grid;gap:12px}'
+'.session-card{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:10px}'
+'.session-info h3{color:#f8fafc;margin-bottom:4px}'
+'.session-info p{color:#94a3b8;font-size:13px}'
+'.status-badge{display:inline-block;padding:4px 12px;border-radius:6px;font-size:12px;font-weight:600}'
+'.status-active{background:#16a34a22;color:#4ade80}'
+'.status-closed{background:#64748b22;color:#cbd5e1}'
+'.btn-small{padding:10px 14px;font-size:13px;white-space:nowrap}'
+'.btn-share{background:#0ea5e9;color:#fff}.btn-share:hover{background:#0284c7}'
+'.btn-success{background:#16a34a;color:#fff}.btn-success:hover{background:#15803d}'
+'.resp-badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;background:#16a34a22;color:#4ade80}'
+'.resp-badge.zero{background:#64748b22;color:#94a3b8}'
+'.session-actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}'
+'.top-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:8px}'
+'.deputy-badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;background:#7c3aed22;color:#a78bfa;margin-right:6px}'
+'.field select{width:100%;padding:10px 14px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:15px}'
+'.field select:focus{outline:none;border-color:#3b82f6}'
+'.att-panel{margin-top:16px}'
+'.att-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}'
+'.att-header h3{color:#f8fafc;font-size:16px}'
+'.att-row{display:flex;align-items:center;gap:12px;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:12px 16px;margin-bottom:8px}'
+'.att-row .att-name{flex:1;color:#e2e8f0;font-size:14px;min-width:100px}'
+'.att-row label.att-check{display:flex;align-items:center;gap:6px;color:#94a3b8;font-size:13px;cursor:pointer}'
+'.att-row input[type=checkbox]{width:18px;height:18px;accent-color:#3b82f6;cursor:pointer}'
+'.att-row input.att-input{width:80px;padding:6px 10px;border-radius:8px;border:1px solid #475569;background:#1e293b;color:#e2e8f0;font-size:14px;text-align:center}'
+'.att-row input.att-input:focus{outline:none;border-color:#3b82f6}'
+'.att-row .att-changed{border-color:#f59e0b !important}'
+'.att-empty{color:#94a3b8;text-align:center;padding:20px;font-size:14px}'
+'.att-actions{display:flex;gap:8px;margin-top:14px}'
+'.btn-back{background:#475569;color:#fff}.btn-back:hover{background:#64748b}'
+'.btn-save{background:#16a34a;color:#fff}.btn-save:hover{background:#15803d}'
+'.btn-att{background:#8b5cf6;color:#fff}.btn-att:hover{background:#7c3aed}'
+''
+'</style></head><body>'
+'<div id="toast" class="toast"></div>'
+'<div class="container">'
+'<div id="pageHeader" style="display:none"><h1>\u05DC\u05D5\u05D7 \u05DE\u05D3\u05E8\u05D9\u05DA</h1>'
+'<p class="subtitle">\u05E0\u05D9\u05D4\u05D5\u05DC \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9 \u05D9\u05E8\u05D9 \u05E9\u05DC\u05DA</p></div>'
+'<div id="loginArea" class="section" style="max-width:420px;margin:80px auto">'
+'<h2 style="text-align:center">\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05DC\u05D5\u05D7 \u05DE\u05D3\u05E8\u05D9\u05DA</h2>'
+'<div class="field"><label>\u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D4\u05D5\u05EA (\u05EA.\u05D6.)</label><input type="text" id="tzInput" placeholder="\u05D4\u05D6\u05DF \u05EA.\u05D6." inputmode="numeric"></div>'
+'<button class="btn btn-primary" onclick="doLogin()" style="width:100%">\u05DB\u05E0\u05D9\u05E1\u05D4</button>'
+'</div>'
+'<div id="otpArea" class="section" style="max-width:420px;margin:80px auto;display:none">'
+'<h2 style="text-align:center">\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA</h2>'
+'<p id="otpMsg" style="color:#94a3b8;text-align:center;margin-bottom:16px"></p>'
+'<div class="field"><label>\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA (6 \u05E1\u05E4\u05E8\u05D5\u05EA)</label><input type="text" id="otpInput" placeholder="\u05D4\u05D6\u05DF \u05E7\u05D5\u05D3" inputmode="numeric" maxlength="6"></div>'
+'<button class="btn btn-primary" onclick="doVerifyOtp()" style="width:100%">\u05D0\u05DE\u05EA</button>'
+'<button class="btn btn-small" onclick="doResendOtp()" style="background:#475569;color:#e2e8f0;margin-top:8px">\u05E9\u05DC\u05D7 \u05E9\u05D5\u05D1</button>'
+'</div>'
+'<div id="dashboardArea" style="display:none">'
+'<div class="section">'
+'<h2 id="welcomeMsg"></h2>'
+'<div class="top-actions"><button class="btn btn-new" onclick="showCreateSession()">\u2795 \u05D0\u05D9\u05DE\u05D5\u05DF \u05D7\u05D3\u05E9</button><span id="adminLinkSlot"></span></div>'
+'<div id="createForm" style="display:none;margin-top:16px">'
+'<div class="field"><label>תאריך האימון</label><input type="date" id="sessionDate"></div>'
+'<div class="field"><label>הערות (אופציונלי)</label><input type="text" id="sessionNotes" placeholder="מיקום, שעה, הערות"></div>'
+'<div class="field"><label>מ"מ 1 (אופציונלי)</label><select id="deputy1"><option value="">-- ללא --</option></select></div>'
+'<div class="field"><label>מ"מ 2 (אופציונלי)</label><select id="deputy2"><option value="">-- ללא --</option></select></div>'
+'<button class="btn btn-primary" onclick="doCreateSession()">צור אימון</button>'
+'</div>'
+'</div>'
+'<div class="section">'
+'<h2>האימונים שלי</h2>'
+'<div class="sessions-list" id="sessionsList"></div>'
+'</div>'
+'</div>'
+'<script>'
+'var POLL_URL="' + WEBAPP_URL + '?action=poll&session=";'
+'var currentInstructor={};var allInstructors=[];'

+'function showToast(msg){var t=document.getElementById("toast");t.textContent=msg;t.className="toast show success";setTimeout(function(){t.className="toast"},3000)}'

+'function withLoading(btn,cb){if(!btn){cb(function(){});return;}btn.disabled=true;btn.dataset.origText=btn.dataset.origText||btn.textContent;btn.textContent="\u05D8\u05D5\u05E2\u05DF...";var done=function(){btn.disabled=false;btn.textContent=btn.dataset.origText;};cb(done);}'

+'function doLogin(){var tz=document.getElementById("tzInput").value.trim();if(!tz){alert("\u05D4\u05D6\u05DF \u05EA.\u05D6.");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(inst){if(!inst.name){done();alert("\u05DE\u05D3\u05E8\u05D9\u05DA \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0");return;}currentInstructor=inst;google.script.run.withSuccessHandler(function(auth){done();if(auth.authenticated){enterDashboard();}else if(auth.needsOtp){sendInstructorOtp();}else{alert(auth.message||"\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4");}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).checkInstructorAuth(tz);}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).getInstructorData(tz);});}'

+'function enterDashboard(){document.getElementById("loginArea").style.display="none";document.getElementById("otpArea").style.display="none";document.getElementById("pageHeader").style.display="block";document.getElementById("dashboardArea").style.display="block";document.getElementById("welcomeMsg").textContent="\u05E9\u05DC\u05D5\u05DD, "+currentInstructor.name;if(currentInstructor.admin){var slot=document.getElementById("adminLinkSlot");slot.innerHTML=\'<a href="' + WEBAPP_URL + '?action=admin" target="_blank" class="btn btn-new" style="text-decoration:none">\u05DC\u05D5\u05D7 \u05E0\u05D9\u05D4\u05D5\u05DC \u2192</a>\';}loadDeputyOptions();loadSessions();}'

+'function sendInstructorOtp(){google.script.run.withSuccessHandler(function(r){if(r.success){document.getElementById("loginArea").style.display="none";document.getElementById("otpArea").style.display="block";document.getElementById("otpMsg").textContent="\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA \u05E0\u05E9\u05DC\u05D7 \u05DC: "+r.maskedEmail;document.getElementById("otpInput").value="";document.getElementById("otpInput").focus();}else{alert(r.message);}}).withFailureHandler(function(e){alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).requestInstructorOTP(currentInstructor.tz);}'

+'function doVerifyOtp(){var code=document.getElementById("otpInput").value.trim();if(!code){alert("\u05D4\u05D6\u05DF \u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){enterDashboard();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).verifyInstructorOTP(currentInstructor.tz,code);});}'

+'function doResendOtp(){sendInstructorOtp();}'

+'function loadDeputyOptions(){google.script.run.withSuccessHandler(function(list){allInstructors=list;var s1=document.getElementById("deputy1");var s2=document.getElementById("deputy2");for(var i=0;i<list.length;i++){if(list[i].tz===currentInstructor.tz)continue;var o1=document.createElement("option");o1.value=list[i].tz;o1.textContent=list[i].name;s1.appendChild(o1);var o2=document.createElement("option");o2.value=list[i].tz;o2.textContent=list[i].name;s2.appendChild(o2)}}).getAllInstructors()}'

+'function getInstructorName(tz){if(!tz)return"";for(var i=0;i<allInstructors.length;i++){if(allInstructors[i].tz===tz)return allInstructors[i].name}return tz}'

+'function showCreateSession(){var f=document.getElementById("createForm");f.style.display=f.style.display==="none"?"block":"none";if(f.style.display==="block"){var d=new Date();var m=String(d.getMonth()+1).padStart(2,"0");var day=String(d.getDate()).padStart(2,"0");document.getElementById("sessionDate").value=d.getFullYear()+"-"+m+"-"+day}}'

+'function doCreateSession(){var dateVal=document.getElementById("sessionDate").value;if(!dateVal){alert("\u05D1\u05D7\u05E8 \u05EA\u05D0\u05E8\u05D9\u05DA");return}var notes=document.getElementById("sessionNotes").value;var d1=document.getElementById("deputy1").value;var d2=document.getElementById("deputy2").value;var parts=dateVal.split("-");var dateStr=parts[2]+"/"+parts[1]+"/"+parts[0];var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){alert("\u05D0\u05D9\u05DE\u05D5\u05DF \u05E0\u05D5\u05E6\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4");document.getElementById("createForm").style.display="none";document.getElementById("sessionDate").value="";document.getElementById("sessionNotes").value="";document.getElementById("deputy1").value="";document.getElementById("deputy2").value="";loadSessions()}else{alert(r.message)}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message)}).createSession(dateStr,currentInstructor.tz,notes,d1,d2);});}'

+'function loadSessions(){google.script.run.withSuccessHandler(function(sessions){var html="";if(sessions.length===0){html=\'<p style="color:#94a3b8">\u05D0\u05D9\u05DF \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD \u05E2\u05D3\u05D9\u05D9\u05DF</p>\'}'
+'else{for(var i=0;i<sessions.length;i++){var s=sessions[i];var sc=s.status==="\u05E4\u05E2\u05D9\u05DC"?"status-active":"status-closed";'
+'var isDeputy=s.role==="deputy";'
+'var btns="";if(isDeputy&&s.status==="\u05E4\u05E2\u05D9\u05DC"){'
+'btns=\'<div class="session-actions">'
+'<button class="btn btn-att btn-small" data-sid="\'+s.sessionId+\'" onclick="showAttendanceList(this.dataset.sid)">\u270F\uFE0F \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD</button>'
+'<button class="btn btn-primary btn-small" data-sid="\'+s.sessionId+\'" onclick="doPrint(this.dataset.sid)">\uD83D\uDDA8\uFE0F \u05D4\u05D3\u05E4\u05E1\u05D4</button>'
+'</div>\''
+'}else if(isDeputy){'
+'btns=\'<div class="session-actions">'
+'<button class="btn btn-primary btn-small" data-sid="\'+s.sessionId+\'" onclick="doPrint(this.dataset.sid)">\uD83D\uDDA8\uFE0F \u05D4\u05D3\u05E4\u05E1\u05D4</button>'
+'</div>\''
+'}else if(s.status==="\u05E4\u05E2\u05D9\u05DC"){'
+'btns=\'<div class="session-actions">'
+'<button class="btn btn-share btn-small" data-sid="\'+s.sessionId+\'" data-date="\'+s.date+\'" onclick="doShare(this.dataset.sid,this.dataset.date)">\uD83D\uDD17 \u05E9\u05D9\u05EA\u05D5\u05E3</button>'
+'<button class="btn btn-success btn-small" data-sid="\'+s.sessionId+\'" data-date="\'+s.date+\'" onclick="doWhatsApp(this.dataset.sid,this.dataset.date)">\uD83D\uDCF2 \u05D5\u05D5\u05D8\u05E1\u05D0\u05E4</button>'
+'<button class="btn btn-att btn-small" data-sid="\'+s.sessionId+\'" onclick="showAttendanceList(this.dataset.sid)">\u270F\uFE0F \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD</button>'
+'<button class="btn btn-primary btn-small" data-sid="\'+s.sessionId+\'" onclick="doPrint(this.dataset.sid)">\uD83D\uDDA8\uFE0F \u05D4\u05D3\u05E4\u05E1\u05D4</button>'
+'<button class="btn btn-small" data-sid="\'+s.sessionId+\'" onclick="doClose(this.dataset.sid,this)" style="background:#64748b;color:#fff">\u05E1\u05D2\u05D5\u05E8</button>'
+'</div>\'}else{'
+'btns=\'<div class="session-actions">'
+'<button class="btn btn-primary btn-small" data-sid="\'+s.sessionId+\'" onclick="doPrint(this.dataset.sid)">\uD83D\uDDA8\uFE0F \u05D4\u05D3\u05E4\u05E1\u05D4</button>'
+'</div>\'}'
+'var deputyInfo="";if(s.deputy1Tz){deputyInfo+=\' | \u05DE"\u05DE 1: \'+getInstructorName(s.deputy1Tz);}if(s.deputy2Tz){deputyInfo+=\' | \u05DE"\u05DE 2: \'+getInstructorName(s.deputy2Tz);}'
+'var roleTag=isDeputy?\'<span class="deputy-badge">\u05DE"\u05DE</span>\':"";'
+'html+=\'<div class="session-card"><div class="session-info"><h3>\'+roleTag+s.date+\' <span class="status-badge \'+sc+\'">\'+s.status+\'</span> <span class="resp-badge zero" id="resp-\'+s.sessionId+\'" style="font-size:13px"></span></h3><p>\u05DE\u05D3\u05E8\u05D9\u05DA: \'+s.instructorName+deputyInfo+\'</p>\'+(s.notes?\'<p>\'+s.notes+\'</p>\':\'\')+\'</div><div>\'+btns+\'</div></div>\'}}'
+'document.getElementById("sessionsList").innerHTML=html;'
+'for(var j=0;j<sessions.length;j++){loadStatus(sessions[j].sessionId)}'
+'}).withFailureHandler(function(e){alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message)}).getInstructorSessions(currentInstructor.tz)}'

+'function loadStatus(sid){google.script.run.withSuccessHandler(function(r){var el=document.getElementById("resp-"+sid);if(el){var cls=r.attending>0?"resp-badge":"resp-badge zero";el.className=cls;el.textContent="(\u05DE\u05D2\u05D9\u05E2\u05D9\u05DD: "+r.attending+" / "+r.total+")"}}).doGetStatus(sid)}'

+'function buildShareMsg(sessionId,dateStr){var url=POLL_URL+encodeURIComponent(sessionId);return{url:url,msg:"\u05E9\u05DC\u05D5\u05DD \u05DC\u05DB\u05D5\u05DC\u05DD!\\n\\n\uD83C\uDFAF \u05E0\u05E4\u05EA\u05D7 \u05E1\u05E7\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA \u05DC\u05D0\u05D9\u05DE\u05D5\u05DF \u05D9\u05E8\u05D9"+(dateStr?" \u05DC\u05EA\u05D0\u05E8\u05D9\u05DA "+dateStr:"")+".\\n\\n\u05E0\u05D0 \u05DE\u05DC\u05D0\u05D5 \u05D0\u05EA \u05D4\u05E1\u05E7\u05E8 \u05D1\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D1\u05D0:\\n"+url+"\\n\\n\u05EA\u05D5\u05D3\u05D4!"}}'
+'function doShare(sessionId,dateStr){var m=buildShareMsg(sessionId,dateStr);if(navigator.clipboard){navigator.clipboard.writeText(m.msg).then(function(){showToast("\u05D4\u05D5\u05D3\u05E2\u05D4 \u05D4\u05D5\u05E2\u05EA\u05E7\u05D4 \u05DC\u05DC\u05D5\u05D7")}).catch(function(){prompt("\u05D4\u05E2\u05EA\u05E7 \u05D0\u05EA \u05D4\u05D4\u05D5\u05D3\u05E2\u05D4:",m.msg)})}else{prompt("\u05D4\u05E2\u05EA\u05E7 \u05D0\u05EA \u05D4\u05D4\u05D5\u05D3\u05E2\u05D4:",m.msg)}}'
+'function doWhatsApp(sessionId,dateStr){var m=buildShareMsg(sessionId,dateStr);window.open("https://wa.me/?text="+encodeURIComponent(m.msg),"_blank")}'

+'function doPrint(sessionId){google.script.run.withSuccessHandler(function(r){if(r.success){window.open("' + WEBAPP_URL + '?action=printVerified&session="+encodeURIComponent(sessionId)+"&token="+encodeURIComponent(r.token),"_blank");}else{window.open("' + WEBAPP_URL + '?action=print&session="+encodeURIComponent(sessionId),"_blank");}}).withFailureHandler(function(){window.open("' + WEBAPP_URL + '?action=print&session="+encodeURIComponent(sessionId),"_blank");}).issuePrintToken(currentInstructor.tz,sessionId);}'

+'function doClose(sessionId,btn){if(!confirm("\u05E1\u05D2\u05D5\u05E8 \u05D0\u05D9\u05DE\u05D5\u05DF \u05D6\u05D4?")){return;}withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){loadSessions();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).closeSession(sessionId);});}'

+'function showAttendanceList(sessionId){var da=document.getElementById("dashboardArea");var sections=da.querySelectorAll(".section");for(var i=0;i<sections.length;i++){sections[i].style.display="none";}var existing=document.getElementById("attPanel");if(existing){existing.remove();}var panel=document.createElement("div");panel.id="attPanel";panel.className="section att-panel";panel.innerHTML="<div class=\\"att-header\\"><h3>\u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD</h3></div><div class=\\"att-empty\\">\u05D8\u05D5\u05E2\u05DF...</div>";da.appendChild(panel);google.script.run.withSuccessHandler(function(rows){renderAttendanceList(sessionId,rows);}).withFailureHandler(function(e){panel.innerHTML="<div class=\\"att-empty\\">\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message+"</div>";}).getSessionResponses(sessionId);}'

+'function renderAttendanceList(sessionId,rows){var panel=document.getElementById("attPanel");if(!panel){return;}if(!rows||rows.length===0){panel.innerHTML="<div class=\\"att-header\\"><h3>\u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD</h3></div><div class=\\"att-empty\\">\u05D0\u05D9\u05DF \u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05DC\u05D0\u05D9\u05DE\u05D5\u05DF \u05D6\u05D4</div><div class=\\"att-actions\\"><button class=\\"btn btn-back btn-small\\" onclick=\\"hideAttendanceList()\\">\u2190 \u05D7\u05D6\u05E8\u05D4</button></div>";return;}var h="<div class=\\"att-header\\"><h3>\u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD ("+rows.length+")</h3></div><div id=\\"attRows\\">";for(var i=0;i<rows.length;i++){var r=rows[i];var chk=r.attending?"checked":"";h+="<div class=\\"att-row\\" data-trainee=\\""+r.trainee.replace(/"/g,"&quot;")+"\\" data-orig-att=\\""+(r.attending?"1":"0")+"\\" data-orig-bul=\\""+r.bullets.replace(/"/g,"&quot;")+"\\"><span class=\\"att-name\\">"+r.name+"</span><label class=\\"att-check\\"><input type=\\"checkbox\\" "+chk+" onchange=\\"markAttChanged(this)\\"> \u05DE\u05D2\u05D9\u05E2</label><input type=\\"text\\" class=\\"att-input\\" value=\\""+r.bullets.replace(/"/g,"&quot;")+"\\" placeholder=\\"0\\" onchange=\\"markAttChanged(this)\\"></div>";}h+="</div><div class=\\"att-actions\\"><button class=\\"btn btn-save btn-small\\" onclick=\\"saveAttendanceChanges(\'"+sessionId+"\')\\">\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD</button><button class=\\"btn btn-back btn-small\\" onclick=\\"hideAttendanceList()\\">\u2190 \u05D7\u05D6\u05E8\u05D4</button></div>";panel.innerHTML=h;}'

+'function markAttChanged(el){var row=el.closest(".att-row");if(!row){return;}var cb=row.querySelector("input[type=checkbox]");var inp=row.querySelector("input.att-input");var origAtt=row.getAttribute("data-orig-att")==="1";var origBul=row.getAttribute("data-orig-bul");var changed=(cb.checked!==origAtt)||(inp.value!==origBul);if(changed){inp.classList.add("att-changed");}else{inp.classList.remove("att-changed");}}'

+'function saveAttendanceChanges(sessionId){var rows=document.querySelectorAll("#attRows .att-row");var changes=[];for(var i=0;i<rows.length;i++){var row=rows[i];var cb=row.querySelector("input[type=checkbox]");var inp=row.querySelector("input.att-input");var origAtt=row.getAttribute("data-orig-att")==="1";var origBul=row.getAttribute("data-orig-bul");if(cb.checked!==origAtt||inp.value!==origBul){changes.push({trainee:row.getAttribute("data-trainee"),attending:cb.checked,bullets:inp.value});}}if(changes.length===0){showToast("\u05D0\u05D9\u05DF \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD");return;}var btn=document.querySelector(".btn-save");if(btn){btn.disabled=true;btn.dataset.origText=btn.textContent;btn.textContent="\u05D8\u05D5\u05E2\u05DF...";}var saved=0;var errors=0;var total=changes.length;for(var j=0;j<changes.length;j++){(function(c){google.script.run.withSuccessHandler(function(r){if(r.success){saved++;}else{errors++;}if(saved+errors===total){if(errors>0){showToast("\u05E0\u05E9\u05DE\u05E8\u05D5 "+saved+", \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA: "+errors);}else{showToast("\u05E0\u05E9\u05DE\u05E8\u05D5 "+saved+" \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD");}showAttendanceList(sessionId);}}).withFailureHandler(function(){errors++;if(saved+errors===total){showToast("\u05E0\u05E9\u05DE\u05E8\u05D5 "+saved+", \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA: "+errors);showAttendanceList(sessionId);}}).updateSessionResponse(sessionId,c.trainee,c.attending,c.bullets);})(changes[j]);}}'

+'function hideAttendanceList(){var panel=document.getElementById("attPanel");if(panel){panel.remove();}var da=document.getElementById("dashboardArea");var sections=da.querySelectorAll(".section");for(var i=0;i<sections.length;i++){sections[i].style.display="block";}}'
+'</script>' + getZoomScript('900px')
+'</body></html>';
}

function getPrintOtpGateHtml(sessionId) {
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
+'<title>אימות — הדפסה</title>'
+'<style>'
+'*{box-sizing:border-box;margin:0;padding:0}'
+'body{font-family:Segoe UI,Tahoma,Arial,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}'
+'.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;max-width:420px;width:100%}'
+'.card h2{color:#60a5fa;margin-bottom:16px;font-size:18px}'
+'.field{margin-bottom:14px}'
+'.field label{display:block;color:#94a3b8;font-size:13px;margin-bottom:6px}'
+'.field input{width:100%;padding:10px 14px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:15px}'
+'.field input:focus{outline:none;border-color:#3b82f6}'
+'.btn{display:inline-block;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .2s}'
+'.btn-primary{background:#3b82f6;color:#fff}.btn-primary:hover{background:#2563eb}'
+'.btn:disabled{opacity:.5;cursor:not-allowed}'
+'.btn-small{padding:8px 16px;font-size:13px}'
+'.info{color:#94a3b8;margin-bottom:14px;font-size:14px}'
+'</style></head><body>'
+'<div class="card">'
+'<div id="step1">'
+'<h2>אימות מדריך — הדפסה</h2>'
+'<p class="info">יש לאמת את זהותך כדי לצפות בדף ההדפסה.</p>'
+'<div class="field"><label>תעודת זהות (ת.ז.)</label><input type="text" id="tzInput" placeholder="הזן ת.ז." inputmode="numeric"></div>'
+'<button class="btn btn-primary" onclick="doStep1()" style="width:100%">\u05E9\u05DC\u05D7 \u05E7\u05D5\u05D3</button>'
+'</div>'
+'<div id="step2" style="display:none">'
+'<h2>הזן קוד אימות</h2>'
+'<p class="info" id="otpMsg"></p>'
+'<div class="field"><label>קוד אימות (6 ספרות)</label><input type="text" id="otpInput" placeholder="הזן קוד" inputmode="numeric" maxlength="6"></div>'
+'<button class="btn btn-primary" onclick="doStep2()" style="width:100%">\u05D0\u05DE\u05EA</button>'
+'<button class="btn btn-small" onclick="doResend()" style="background:#475569;color:#e2e8f0;margin-top:8px">\u05E9\u05DC\u05D7 \u05E9\u05D5\u05D1</button>'
+'</div>'
+'</div>'
+'<script>'
+'var SESSION_ID="' + sessionId + '";'
+'var WEBAPP="' + WEBAPP_URL + '";'
+'var savedTz="";'

+'function withLoading(btn,cb){if(!btn){cb(function(){});return;}btn.disabled=true;btn.dataset.origText=btn.dataset.origText||btn.textContent;btn.textContent="\u05D8\u05D5\u05E2\u05DF...";var done=function(){btn.disabled=false;btn.textContent=btn.dataset.origText;};cb(done);}'

+'function doStep1(){var tz=document.getElementById("tzInput").value.trim();if(!tz){alert("\u05D4\u05D6\u05DF \u05EA.\u05D6.");return;}savedTz=tz;var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(ok){if(!ok){done();alert("\u05D0\u05D9\u05DF \u05DC\u05DA \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DC\u05D0\u05D9\u05DE\u05D5\u05DF \u05D6\u05D4");return;}google.script.run.withSuccessHandler(function(r){done();if(r.success){document.getElementById("step1").style.display="none";document.getElementById("step2").style.display="block";document.getElementById("otpMsg").textContent="\u05E7\u05D5\u05D3 \u05E0\u05E9\u05DC\u05D7 \u05DC: "+r.maskedEmail;document.getElementById("otpInput").focus();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).requestInstructorOTP(tz);}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).isSessionAuthorizedByTz(tz,SESSION_ID);});}'

+'function doStep2(){var code=document.getElementById("otpInput").value.trim();if(!code){alert("\u05D4\u05D6\u05DF \u05E7\u05D5\u05D3");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){window.location.href=WEBAPP+"?action=printVerified&session="+encodeURIComponent(SESSION_ID)+"&token="+encodeURIComponent(r.printToken);}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).verifyInstructorOTP(savedTz,code);});}'

+'function doResend(){google.script.run.withSuccessHandler(function(r){if(r.success){document.getElementById("otpMsg").textContent="\u05E7\u05D5\u05D3 \u05D7\u05D3\u05E9 \u05E0\u05E9\u05DC\u05D7 \u05DC: "+r.maskedEmail;document.getElementById("otpInput").value="";document.getElementById("otpInput").focus();}else{alert(r.message);}}).withFailureHandler(function(e){alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).requestInstructorOTP(savedTz);}'
+'</script></body></html>';
}

function getAdminDashboardHtml() {
  return '<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">'
+'<title>לוח ניהול</title>'
+'<style>' + getBaseCSS()
+'body{padding:24px}'
+'.container{max-width:900px;margin:0 auto}'
+'h1{margin-bottom:8px;font-size:28px}'
+'p.subtitle{color:#94a3b8;margin-bottom:24px}'
+'.section{padding:32px}'
+'.section h2{color:#60a5fa;margin-bottom:16px;font-size:18px}'
+'.field input,.field select{padding:10px 14px}'
+'.field input[type=checkbox]{width:auto}'
+'.btn{display:inline-block;padding:12px 24px;font-size:15px}'
+'.btn-danger{background:#dc2626;color:#fff}.btn-danger:hover{background:#b91c1c}'
+'.btn-success{background:#16a34a;color:#fff}.btn-success:hover{background:#15803d}'
+'.btn-small{padding:8px 16px;font-size:13px}'
+'.active-list{list-style:none;padding:0;margin:0}'
+'.active-item{display:flex;align-items:center;justify-content:space-between;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:14px 18px;margin-bottom:10px;flex-wrap:wrap;gap:8px}'
+'.active-item .item-info{display:flex;gap:16px;align-items:center;flex-wrap:wrap}'
+'.active-item .item-date{color:#4ade80;font-weight:700;font-size:15px}'
+'.active-item .item-instructor{color:#e2e8f0;font-size:14px}'
+'.active-item .item-notes{color:#94a3b8;font-size:13px}'
+'.active-empty{color:#94a3b8;text-align:center;padding:20px;font-size:14px}'
+'.instr-table{width:100%;border-collapse:collapse;margin-top:12px}'
+'.instr-table th,.instr-table td{padding:10px 14px;text-align:right;border-bottom:1px solid #334155;font-size:14px}'
+'.instr-table th{color:#94a3b8;font-weight:600;background:#0f172a}'
+'.instr-table td{color:#e2e8f0}'
+'.badge-admin{background:#7c3aed;color:#fff;font-size:11px;padding:2px 8px;border-radius:8px;margin-right:6px}'
+'.badge-active{background:#16a34a;color:#fff;font-size:11px;padding:2px 8px;border-radius:8px}'
+'.badge-inactive{background:#64748b;color:#fff;font-size:11px;padding:2px 8px;border-radius:8px}'
+'.badge-suspended{background:#d97706;color:#fff;font-size:11px;padding:2px 8px;border-radius:8px}'
+'.inline-form{background:#0f172a;border:1px solid #475569;border-radius:12px;padding:20px;margin-top:16px;display:none}'
+'.inline-form h3{color:#f1f5f9;font-size:16px;margin-bottom:12px}'
+'.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
+'.checkbox-field{display:flex;align-items:center;gap:8px;margin-top:8px}'
+'.checkbox-field input{width:auto}'
+'.checkbox-field label{color:#e2e8f0;font-size:14px}'
+'.search-row{display:flex;gap:12px;align-items:flex-end}'
+'.search-row .field{flex:1;margin-bottom:0}'
+'.trainee-card{background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin-top:16px}'
+'.trainee-card h3{color:#f1f5f9;margin-bottom:12px}'
+'.trainee-info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}'
+'.trainee-info .ti-label{color:#94a3b8;font-size:13px}'
+'.trainee-info .ti-value{color:#e2e8f0;font-size:14px}'
+'.status-section{border-top:1px solid #334155;padding-top:16px;margin-top:16px}'
+'.links-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}'
+'.link-card{display:flex;align-items:center;gap:12px;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:16px;text-decoration:none;color:inherit;transition:all .2s}'
+'.link-card:hover{border-color:#3b82f6;background:#162033}'
+'.link-icon{font-size:28px;flex-shrink:0}'
+'.link-text h3{font-size:15px;color:#f1f5f9;margin-bottom:3px}'
+'.link-text p{font-size:12px;color:#64748b}'
+'.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#4ade80;padding:12px 24px;border-radius:10px;border:1px solid #334155;font-size:14px;opacity:0;transition:opacity .3s;z-index:999;pointer-events:none}'
+'.toast.show{opacity:1}'
+'.footer{text-align:center;color:#475569;font-size:12px;margin-top:24px}'
+'.att-panel{position:relative}'
+'.att-header h3{color:#60a5fa;margin-bottom:12px}'
+'.att-row{display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #334155}'
+'.att-name{flex:1;color:#e2e8f0;font-size:14px}'
+'.att-check{color:#94a3b8;font-size:13px;display:flex;align-items:center;gap:4px}'
+'.att-input{width:70px;padding:6px 8px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:13px;text-align:center}'
+'.att-input.att-changed{border-color:#f59e0b}'
+'.att-empty{color:#94a3b8;text-align:center;padding:16px}'
+'.att-actions{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}'
+'.btn-back{background:#475569;color:#fff}'
+'.btn-att{background:#7c3aed;color:#fff}'
+'.btn-save{background:#16a34a;color:#fff}'
+'.sessions-table{width:100%;border-collapse:collapse;margin-top:16px}'
+'.sessions-table th,.sessions-table td{padding:10px 14px;text-align:right;border-bottom:1px solid #334155;font-size:14px}'
+'.sessions-table th{color:#94a3b8;font-weight:600;background:#0f172a}'
+'.sessions-table td{color:#e2e8f0}'
+'.status-active-txt{color:#4ade80}.status-closed-txt{color:#94a3b8}'
+'.owner-badge{display:inline-block;background:#f59e0b;color:#0f172a;font-size:11px;font-weight:700;padding:2px 10px;border-radius:8px;margin-right:8px}'
+'</style></head><body>'
+'<div class="container">'
+'<div id="loginArea">'
+'<div class="section" style="max-width:420px;margin:80px auto">'
+'<h2 style="text-align:center">\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05DC\u05D5\u05D7 \u05E0\u05D9\u05D4\u05D5\u05DC</h2>'
+'<div class="field"><label>\u05EA\u05E2\u05D5\u05D3\u05EA \u05D6\u05D4\u05D5\u05EA (\u05EA.\u05D6.)</label><input type="text" id="tzInput" placeholder="\u05D4\u05D6\u05DF \u05EA.\u05D6." inputmode="numeric"></div>'
+'<button class="btn btn-primary" onclick="doAdminLogin()" style="width:100%">\u05DB\u05E0\u05D9\u05E1\u05D4</button>'
+'</div></div>'
+'<div id="otpArea" style="display:none">'
+'<div class="section" style="max-width:420px;margin:80px auto">'
+'<h2 style="text-align:center">\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA</h2>'
+'<p id="otpMsg" style="color:#94a3b8;text-align:center;margin-bottom:16px"></p>'
+'<div class="field"><label>\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA (6 \u05E1\u05E4\u05E8\u05D5\u05EA)</label><input type="text" id="otpInput" placeholder="\u05D4\u05D6\u05DF \u05E7\u05D5\u05D3" inputmode="numeric" maxlength="6"></div>'
+'<button class="btn btn-primary" onclick="doVerifyAdminOtp()" style="width:100%">\u05D0\u05DE\u05EA</button>'
+'<button class="btn btn-small" onclick="doResendAdminOtp()" style="background:#475569;color:#e2e8f0;margin-top:8px">\u05E9\u05DC\u05D7 \u05E9\u05D5\u05D1</button>'
+'</div></div>'
+'<div id="dashboardArea" style="display:none">'
+'<h1>\u05DC\u05D5\u05D7 \u05E0\u05D9\u05D4\u05D5\u05DC</h1>'
+'<p class="subtitle" id="welcomeMsg"></p>'

+'<div class="section">'
+'<h2>\uD83D\uDCCA \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD</h2>'
+'<div id="activeSessionsList"><div class="active-empty">\u05D8\u05D5\u05E2\u05DF...</div></div>'
+'</div>'

+'<div class="section">'
+'<h2>\uD83D\uDC68\u200D\uD83C\uDFEB \u05E0\u05D9\u05D4\u05D5\u05DC \u05DE\u05D3\u05E8\u05D9\u05DB\u05D9\u05DD</h2>'
+'<div id="instructorsList"><div class="active-empty">\u05D8\u05D5\u05E2\u05DF...</div></div>'
+'<button class="btn btn-primary btn-small" onclick="toggleAddInstructor()" style="margin-top:12px">\u05D4\u05D5\u05E1\u05E4\u05EA \u05DE\u05D3\u05E8\u05D9\u05DA +</button>'
+'<div id="addInstrForm" class="inline-form">'
+'<h3>\u05D4\u05D5\u05E1\u05E4\u05EA \u05DE\u05D3\u05E8\u05D9\u05DA \u05D7\u05D3\u05E9</h3>'
+'<div class="form-row"><div class="field"><label>\u05E9\u05DD \u05DE\u05DC\u05D0</label><input type="text" id="newInstrName"></div><div class="field"><label>\u05EA.\u05D6.</label><input type="text" id="newInstrTz" inputmode="numeric"></div></div>'
+'<div class="form-row"><div class="field"><label>\u05DE"\u05DE</label><input type="text" id="newInstrLicense"></div><div class="field"><label>\u05D8\u05DC\u05E4\u05D5\u05DF</label><input type="text" id="newInstrPhone" inputmode="tel"></div></div>'
+'<div class="field"><label>\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC</label><input type="email" id="newInstrEmail"></div>'
+'<div class="checkbox-field"><input type="checkbox" id="newInstrAdmin"><label for="newInstrAdmin">\u05D4\u05E8\u05E9\u05D0\u05EA \u05E0\u05D9\u05D4\u05D5\u05DC</label></div>'
+'<div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-success btn-small" onclick="doAddInstructor()">\u05E9\u05DE\u05D5\u05E8</button><button class="btn btn-small" onclick="toggleAddInstructor()" style="background:#475569;color:#fff">\u05D1\u05D9\u05D8\u05D5\u05DC</button></div>'
+'</div>'
+'<div id="editInstrForm" class="inline-form">'
+'<h3>\u05E2\u05E8\u05D9\u05DB\u05EA \u05DE\u05D3\u05E8\u05D9\u05DA</h3>'
+'<input type="hidden" id="editInstrOrigTz">'
+'<div class="form-row"><div class="field"><label>\u05E9\u05DD \u05DE\u05DC\u05D0</label><input type="text" id="editInstrName"></div><div class="field"><label>\u05EA.\u05D6.</label><input type="text" id="editInstrTz" readonly></div></div>'
+'<div class="form-row"><div class="field"><label>\u05DE"\u05DE</label><input type="text" id="editInstrLicense"></div><div class="field"><label>\u05D8\u05DC\u05E4\u05D5\u05DF</label><input type="text" id="editInstrPhone" inputmode="tel"></div></div>'
+'<div class="field"><label>\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC</label><input type="email" id="editInstrEmail"></div>'
+'<div class="checkbox-field"><input type="checkbox" id="editInstrAdmin"><label for="editInstrAdmin">\u05D4\u05E8\u05E9\u05D0\u05EA \u05E0\u05D9\u05D4\u05D5\u05DC</label></div>'
+'<div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-success btn-small" onclick="doEditInstructor()">\u05E9\u05DE\u05D5\u05E8</button><button class="btn btn-small" onclick="hideEditInstructor()" style="background:#475569;color:#fff">\u05D1\u05D9\u05D8\u05D5\u05DC</button></div>'
+'</div>'
+'</div>'

+'<div class="section">'
+'<h2>\uD83D\uDC65 \u05E0\u05D9\u05D4\u05D5\u05DC \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</h2>'
+'<div class="search-row"><div class="field"><label>\u05D7\u05D9\u05E4\u05D5\u05E9 \u05DC\u05E4\u05D9 \u05E9\u05DD, \u05EA.\u05D6. \u05D0\u05D5 \u05D8\u05DC\u05E4\u05D5\u05DF</label><input type="text" id="traineeSearch" placeholder="\u05D4\u05D6\u05DF \u05DE\u05D9\u05DC\u05EA \u05D7\u05D9\u05E4\u05D5\u05E9..."></div><button class="btn btn-primary btn-small" onclick="doSearchTrainees()" style="margin-bottom:0">\u05D7\u05E4\u05E9</button></div>'
+'<div id="traineeResults" style="margin-top:16px"></div>'
+'<div id="traineeCard" class="trainee-card" style="display:none">'
+'<h3 id="traineeCardName"></h3>'
+'<div class="trainee-info"><div><span class="ti-label">\u05EA.\u05D6.:</span> <span class="ti-value" id="traineeCardTz"></span></div><div><span class="ti-label">\u05D8\u05DC\u05E4\u05D5\u05DF:</span> <span class="ti-value" id="traineeCardPhone"></span></div></div>'
+'<div><a id="traineeEditLink" href="#" target="_blank" class="btn btn-primary btn-small">\u05E2\u05E8\u05D9\u05DB\u05EA \u05E4\u05E8\u05D8\u05D9\u05DD \u2192</a></div>'
+'<div class="status-section">'
+'<h3 style="font-size:15px;margin-bottom:8px">\u05E0\u05D9\u05D4\u05D5\u05DC \u05E1\u05D8\u05D8\u05D5\u05E1</h3>'
+'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">\u05E1\u05D8\u05D8\u05D5\u05E1 \u05E0\u05D5\u05DB\u05D7\u05D9: <span id="traineeCardStatus"></span></div>'
+'<div class="form-row"><div class="field"><label>\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E1\u05D8\u05D8\u05D5\u05E1</label><select id="statusSelect" onchange="onStatusChange()"><option value="\u05E4\u05E2\u05D9\u05DC">\u05E4\u05E2\u05D9\u05DC</option><option value="\u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC">\u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC</option><option value="\u05DE\u05D5\u05E9\u05E2\u05D4">\u05DE\u05D5\u05E9\u05E2\u05D4</option></select></div>'
+'<div class="field" id="reasonField" style="display:none"><label>\u05E1\u05D9\u05D1\u05EA \u05D4\u05E9\u05E2\u05D9\u05D4</label><select id="reasonSelect" onchange="onReasonSelect()"><option value="">-- \u05D1\u05D7\u05E8 \u05E1\u05D9\u05D1\u05D4 --</option></select></div></div>'
+'<div class="field" id="reasonTextFieldWrap" style="display:none"><label>\u05E1\u05D9\u05D1\u05D4 (\u05D8\u05E7\u05E1\u05EA \u05D7\u05D5\u05E4\u05E9\u05D9)</label><input type="text" id="reasonText" placeholder="\u05D4\u05D6\u05DF \u05E1\u05D9\u05D1\u05D4..."></div>'
+'<button class="btn btn-success btn-small" onclick="doUpdateStatus()" style="margin-top:8px">\u05E2\u05D3\u05DB\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1</button>'
+'</div></div>'
+'</div>'

+'<div class="section">'
+'<h2>\u26A0\uFE0F \u05D4\u05E9\u05E2\u05D9\u05D5\u05EA</h2>'
+'<h3 style="color:#fbbf24;font-size:15px;margin-bottom:10px">\u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD \u05DE\u05D5\u05E9\u05E2\u05D9\u05DD</h3>'
+'<div id="suspendedList"><div class="active-empty">\u05D8\u05D5\u05E2\u05DF...</div></div>'
+'<div style="border-top:1px solid #334155;margin-top:20px;padding-top:16px">'
+'<h3 style="color:#94a3b8;font-size:15px;margin-bottom:10px">\u05E0\u05D9\u05D4\u05D5\u05DC \u05E1\u05D9\u05D1\u05D5\u05EA</h3>'
+'<button class="btn btn-primary btn-small" onclick="toggleReasonsPanel()">\u05D4\u05D5\u05E1\u05E4\u05EA \u05E1\u05D9\u05D1\u05D4 / \u05E6\u05E4\u05D4 \u05D1\u05E8\u05E9\u05D9\u05DE\u05D4</button>'
+'<div id="reasonsPanel" style="display:none;margin-top:14px">'
+'<div id="reasonsList" style="margin-bottom:14px"></div>'
+'<div id="addReasonForm" class="inline-form" style="display:none">'
+'<h3>\u05D4\u05D5\u05E1\u05E4\u05EA \u05E1\u05D9\u05D1\u05D4 \u05D7\u05D3\u05E9\u05D4</h3>'
+'<div class="field"><label>\u05E1\u05D9\u05D1\u05D4</label><input type="text" id="newReasonText" placeholder="\u05D4\u05D6\u05DF \u05E1\u05D9\u05D1\u05EA \u05D4\u05E9\u05E2\u05D9\u05D4..."></div>'
+'<div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-success btn-small" onclick="doAddReason()">\u05E9\u05DE\u05D5\u05E8</button><button class="btn btn-small" onclick="toggleAddReason()" style="background:#475569;color:#fff">\u05D1\u05D9\u05D8\u05D5\u05DC</button></div>'
+'</div>'
+'<button class="btn btn-primary btn-small" onclick="toggleAddReason()" style="margin-top:8px">\u05D4\u05D5\u05E1\u05E4\u05EA \u05E1\u05D9\u05D1\u05D4 +</button>'
+'</div>'
+'</div>'
+'</div>'

+'<div class="section">'
+'<h2>\uD83D\uDD17 \u05E7\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD</h2>'
+'<div class="links-grid">'
+'<a href="' + WEBAPP_URL + '?action=register" target="_blank" class="link-card"><div class="link-icon">\uD83D\uDCDD</div><div class="link-text"><h3>\u05E8\u05D9\u05E9\u05D5\u05DD \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</h3><p>\u05E2\u05DE\u05D5\u05D3 \u05E8\u05D9\u05E9\u05D5\u05DD \u05D7\u05D3\u05E9</p></div></a>'
+'<a href="' + WEBAPP_URL + '?action=poll" target="_blank" class="link-card"><div class="link-icon">\uD83D\uDCCB</div><div class="link-text"><h3>\u05E1\u05E7\u05E8 \u05E0\u05D5\u05DB\u05D7\u05D5\u05EA</h3><p>\u05E2\u05DE\u05D5\u05D3 \u05E1\u05E7\u05E8 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D5\u05EA</p></div></a>'
+'<a href="' + WEBAPP_URL + '?action=instructor" target="_blank" class="link-card"><div class="link-icon">\uD83D\uDC68\u200D\uD83C\uDFEB</div><div class="link-text"><h3>\u05DC\u05D5\u05D7 \u05DE\u05D3\u05E8\u05D9\u05DA</h3><p>\u05DB\u05E0\u05D9\u05E1\u05D4 \u05DC\u05E0\u05D9\u05D4\u05D5\u05DC \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD</p></div></a>'
+'</div></div>'

+'<div id="ownerSections" style="display:none">'
+'<div class="section">'
+'<h2>\uD83D\uDCC1 \u05D2\u05D9\u05DC\u05D9\u05D5\u05E0\u05D5\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD <span class="owner-badge">\u05D1\u05E2\u05DC\u05D9\u05DD</span></h2>'
+'<div class="links-grid">'
+'<a href="' + SOURCE_SHEET_URL + '" target="_blank" class="link-card"><div class="link-icon">\uD83D\uDCCB</div><div class="link-text"><h3>\u05DE\u05D0\u05D2\u05E8 \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</h3><p>\u05D1\u05E1\u05D9\u05E1 \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E9\u05DC \u05D4\u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</p></div></a>'
+'<a href="' + RESPONSE_SHEET_URL + '" target="_blank" class="link-card"><div class="link-icon">\uD83D\uDCCA</div><div class="link-text"><h3>\u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05E1\u05E7\u05E8</h3><p>\u05DB\u05DC \u05D4\u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05E9\u05DC \u05D4\u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD</p></div></a>'
+'<a href="' + INSTRUCTOR_SHEET_URL + '" target="_blank" class="link-card"><div class="link-icon">\uD83D\uDC68\u200D\uD83C\uDFEB</div><div class="link-text"><h3>\u05DE\u05D3\u05E8\u05D9\u05DB\u05D9\u05DD</h3><p>\u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05DE\u05D3\u05E8\u05D9\u05DB\u05D9\u05DD \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA</p></div></a>'
+'<a href="' + SESSIONS_SHEET_URL + '" target="_blank" class="link-card"><div class="link-icon">\uD83D\uDCC5</div><div class="link-text"><h3>\u05DC\u05D5\u05D7 \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD</h3><p>\u05E8\u05E9\u05D9\u05DE\u05EA \u05DB\u05DC \u05D4\u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD</p></div></a>'
+'<a href="' + SUSPENSION_REASONS_SHEET_URL + '" target="_blank" class="link-card"><div class="link-icon">\u26A0\uFE0F</div><div class="link-text"><h3>\u05E1\u05D9\u05D1\u05D5\u05EA \u05D4\u05E9\u05E2\u05D9\u05D4</h3><p>\u05E8\u05E9\u05D9\u05DE\u05EA \u05E1\u05D9\u05D1\u05D5\u05EA \u05D4\u05E9\u05E2\u05D9\u05D4</p></div></a>'
+'</div></div>'
+'<div class="section">'
+'<h2>\uD83D\uDCC5 \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD \u05DC\u05E4\u05D9 \u05DE\u05D3\u05E8\u05D9\u05DA <span class="owner-badge">\u05D1\u05E2\u05DC\u05D9\u05DD</span></h2>'
+'<div class="field"><label>\u05D1\u05D7\u05E8 \u05DE\u05D3\u05E8\u05D9\u05DA</label><select id="ownerInstrSelect"><option value="">-- \u05D1\u05D7\u05E8 \u05DE\u05D3\u05E8\u05D9\u05DA --</option></select></div>'
+'<div id="ownerSessionsArea" style="display:none">'
+'<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">'
+'<button class="btn btn-primary btn-small" onclick="ownerFilterSessions(\'all\')">\u05D4\u05DB\u05DC</button>'
+'<button class="btn btn-small" onclick="ownerFilterSessions(\'\u05E4\u05E2\u05D9\u05DC\')" style="background:#16a34a;color:#fff">\u05E4\u05E2\u05D9\u05DC\u05D9\u05DD</button>'
+'<button class="btn btn-small" onclick="ownerFilterSessions(\'\u05E1\u05D2\u05D5\u05E8\')" style="background:#64748b;color:#fff">\u05E1\u05D2\u05D5\u05E8\u05D9\u05DD</button>'
+'</div>'
+'<table class="sessions-table"><thead><tr><th>\u05EA\u05D0\u05E8\u05D9\u05DA</th><th>\u05E1\u05D8\u05D8\u05D5\u05E1</th><th>\u05D4\u05E2\u05E8\u05D5\u05EA</th><th>\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th></tr></thead>'
+'<tbody id="ownerSessionsBody"></tbody></table>'
+'</div></div>'
+'</div>'

+'<div class="footer">v' + SCRIPT_VERSION + ' | \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9 \u05D9\u05E8\u05D9 — \u05DC\u05D5\u05D7 \u05E0\u05D9\u05D4\u05D5\u05DC</div>'
+'</div>'
+'<div id="toast" class="toast"></div>'
+'</div>'
+'<script>'
+'var WEBAPP_URL="' + WEBAPP_URL + '";'
+'var PRINT_URL=WEBAPP_URL+"?action=print&session=";'
+'var currentAdmin={};var allInstructorsList=[];var isOwner=false;'
+'var ownerAllSessions=[];var ownerCurrentFilter="all";'

+'function showToast(msg){var t=document.getElementById("toast");t.textContent=msg;t.className="toast show";setTimeout(function(){t.className="toast"},3000)}'

+'function withLoading(btn,cb){if(!btn){cb(function(){});return;}btn.disabled=true;btn.dataset.origText=btn.dataset.origText||btn.textContent;btn.textContent="\u05D8\u05D5\u05E2\u05DF...";var done=function(){btn.disabled=false;btn.textContent=btn.dataset.origText;};cb(done);}'

+'function doAdminLogin(){var tz=document.getElementById("tzInput").value.trim();if(!tz){alert("\u05D4\u05D6\u05DF \u05EA.\u05D6.");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(inst){if(!inst.name){done();alert("\u05DE\u05D3\u05E8\u05D9\u05DA \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0");return;}if(!inst.admin){done();alert("\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05EA \u05E0\u05D9\u05D4\u05D5\u05DC");return;}currentAdmin=inst;google.script.run.withSuccessHandler(function(auth){done();if(auth.authenticated){enterAdminDashboard();}else if(auth.needsOtp){sendAdminOtp();}else{alert(auth.message||"\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4");}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).checkAdminAuth(tz);}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).getInstructorData(tz);});}'

+'function sendAdminOtp(){google.script.run.withSuccessHandler(function(r){if(r.success){document.getElementById("loginArea").style.display="none";document.getElementById("otpArea").style.display="block";document.getElementById("otpMsg").textContent="\u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA \u05E0\u05E9\u05DC\u05D7 \u05DC: "+r.maskedEmail;document.getElementById("otpInput").value="";document.getElementById("otpInput").focus();}else{alert(r.message);}}).withFailureHandler(function(e){alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).requestAdminOTP(currentAdmin.tz);}'

+'function doVerifyAdminOtp(){var code=document.getElementById("otpInput").value.trim();if(!code){alert("\u05D4\u05D6\u05DF \u05E7\u05D5\u05D3 \u05D0\u05D9\u05DE\u05D5\u05EA");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){enterAdminDashboard();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).verifyAdminOTP(currentAdmin.tz,code);});}'

+'function doResendAdminOtp(){sendAdminOtp();}'

+'function enterAdminDashboard(){if(window._adminZoomed){document.body.style.zoom="";document.body.style.width="";document.body.style.overflowX="";delete window._adminZoomed;}document.getElementById("loginArea").style.display="none";document.getElementById("otpArea").style.display="none";document.getElementById("dashboardArea").style.display="block";document.getElementById("welcomeMsg").textContent="\u05E9\u05DC\u05D5\u05DD, "+currentAdmin.name;loadAdminActiveSessions();loadInstructorsList();loadSuspensionReasons();loadReasonsList();loadSuspendedList();google.script.run.withSuccessHandler(function(result){isOwner=result;if(isOwner){document.getElementById("ownerSections").style.display="block";loadOwnerInstrSelect();}}).isOwnerByTz(currentAdmin.tz);}'

+'function loadAdminActiveSessions(){google.script.run.withSuccessHandler(function(sessions){var c=document.getElementById("activeSessionsList");if(!sessions||sessions.length===0){c.innerHTML="<div class=\\"active-empty\\">\u05D0\u05D9\u05DF \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD</div>";return;}var h="";for(var i=0;i<sessions.length;i++){var s=sessions[i];h+="<div class=\\"active-item\\"><div class=\\"item-info\\"><span class=\\"item-date\\">"+s.date+"</span><span class=\\"item-instructor\\">"+s.instructorName+"</span>"+(s.notes?"<span class=\\"item-notes\\">"+s.notes+"</span>":"")+"</div><div style=\\"display:flex;gap:6px;flex-wrap:wrap\\"><button class=\\"btn btn-att btn-small\\" data-sid=\\""+s.sessionId+"\\" onclick=\\"showAttendanceList(this.dataset.sid)\\">\u270F\uFE0F \u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD</button><button class=\\"btn btn-primary btn-small\\" data-sid=\\""+s.sessionId+"\\" onclick=\\"adminPrint(this.dataset.sid)\\">\uD83D\uDDA8\uFE0F</button><button class=\\"btn btn-danger btn-small\\" data-sid=\\""+s.sessionId+"\\" onclick=\\"adminClose(this.dataset.sid,this)\\">\u05E1\u05D2\u05D5\u05E8</button></div></div>";}c.innerHTML=h;}).getActiveSessions()}'

+'function adminPrint(sid){window.open(WEBAPP_URL+"?action=print&session="+encodeURIComponent(sid),"_blank")}'

+'function adminClose(sid,btn){if(!confirm("\u05D4\u05D0\u05DD \u05DC\u05E1\u05D2\u05D5\u05E8 \u05D0\u05EA \u05D4\u05D0\u05D9\u05DE\u05D5\u05DF?")){return;}withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){loadAdminActiveSessions();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).closeSession(sid);});}'

+'function showAttendanceList(sessionId){var da=document.getElementById("dashboardArea");var sections=da.querySelectorAll(".section");for(var i=0;i<sections.length;i++){sections[i].style.display="none";}var existing=document.getElementById("attPanel");if(existing){existing.remove();}var panel=document.createElement("div");panel.id="attPanel";panel.className="section att-panel";panel.innerHTML="<div class=\\"att-header\\"><h3>\u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD</h3></div><div class=\\"att-empty\\">\u05D8\u05D5\u05E2\u05DF...</div>";da.appendChild(panel);google.script.run.withSuccessHandler(function(rows){renderAttendanceList(sessionId,rows);}).withFailureHandler(function(e){panel.innerHTML="<div class=\\"att-empty\\">\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message+"</div>";}).getSessionResponses(sessionId);}'

+'function renderAttendanceList(sessionId,rows){var panel=document.getElementById("attPanel");if(!panel){return;}if(!rows||rows.length===0){panel.innerHTML="<div class=\\"att-header\\"><h3>\u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD</h3></div><div class=\\"att-empty\\">\u05D0\u05D9\u05DF \u05EA\u05E9\u05D5\u05D1\u05D5\u05EA \u05DC\u05D0\u05D9\u05DE\u05D5\u05DF \u05D6\u05D4</div><div class=\\"att-actions\\"><button class=\\"btn btn-back btn-small\\" onclick=\\"hideAttendanceList()\\">\u2190 \u05D7\u05D6\u05E8\u05D4</button></div>";return;}var h="<div class=\\"att-header\\"><h3>\u05E8\u05E9\u05D9\u05DE\u05EA \u05DE\u05D2\u05D9\u05E2\u05D9\u05DD ("+rows.length+")</h3></div><div id=\\"attRows\\">";for(var i=0;i<rows.length;i++){var r=rows[i];var chk=r.attending?"checked":"";h+="<div class=\\"att-row\\" data-trainee=\\""+r.trainee.replace(/"/g,"&quot;")+"\\" data-orig-att=\\""+(r.attending?"1":"0")+"\\" data-orig-bul=\\""+r.bullets.replace(/"/g,"&quot;")+"\\"><span class=\\"att-name\\">"+r.name+"</span><label class=\\"att-check\\"><input type=\\"checkbox\\" "+chk+" onchange=\\"markAttChanged(this)\\"> \u05DE\u05D2\u05D9\u05E2</label><input type=\\"text\\" class=\\"att-input\\" value=\\""+r.bullets.replace(/"/g,"&quot;")+"\\" placeholder=\\"0\\" onchange=\\"markAttChanged(this)\\"></div>";}h+="</div><div class=\\"att-actions\\"><button class=\\"btn btn-save btn-small\\" onclick=\\"saveAttendanceChanges(\'"+sessionId+"\')\\">\u05E9\u05DE\u05D5\u05E8 \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD</button><button class=\\"btn btn-back btn-small\\" onclick=\\"hideAttendanceList()\\">\u2190 \u05D7\u05D6\u05E8\u05D4</button></div>";panel.innerHTML=h;}'

+'function markAttChanged(el){var row=el.closest(".att-row");if(!row){return;}var cb=row.querySelector("input[type=checkbox]");var inp=row.querySelector("input.att-input");var origAtt=row.getAttribute("data-orig-att")==="1";var origBul=row.getAttribute("data-orig-bul");var changed=(cb.checked!==origAtt)||(inp.value!==origBul);if(changed){inp.classList.add("att-changed");}else{inp.classList.remove("att-changed");}}'

+'function saveAttendanceChanges(sessionId){var rows=document.querySelectorAll("#attRows .att-row");var changes=[];for(var i=0;i<rows.length;i++){var row=rows[i];var cb=row.querySelector("input[type=checkbox]");var inp=row.querySelector("input.att-input");var origAtt=row.getAttribute("data-orig-att")==="1";var origBul=row.getAttribute("data-orig-bul");if(cb.checked!==origAtt||inp.value!==origBul){changes.push({trainee:row.getAttribute("data-trainee"),attending:cb.checked,bullets:inp.value});}}if(changes.length===0){showToast("\u05D0\u05D9\u05DF \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD");return;}var btn=document.querySelector(".btn-save");if(btn){btn.disabled=true;btn.dataset.origText=btn.textContent;btn.textContent="\u05D8\u05D5\u05E2\u05DF...";}var saved=0;var errors=0;var total=changes.length;for(var j=0;j<changes.length;j++){(function(c){google.script.run.withSuccessHandler(function(r){if(r.success){saved++;}else{errors++;}if(saved+errors===total){if(errors>0){showToast("\u05E0\u05E9\u05DE\u05E8\u05D5 "+saved+", \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA: "+errors);}else{showToast("\u05E0\u05E9\u05DE\u05E8\u05D5 "+saved+" \u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD");}showAttendanceList(sessionId);}}).withFailureHandler(function(){errors++;if(saved+errors===total){showToast("\u05E0\u05E9\u05DE\u05E8\u05D5 "+saved+", \u05E9\u05D2\u05D9\u05D0\u05D5\u05EA: "+errors);showAttendanceList(sessionId);}}).updateSessionResponse(sessionId,c.trainee,c.attending,c.bullets);})(changes[j]);}}'

+'function hideAttendanceList(){var panel=document.getElementById("attPanel");if(panel){panel.remove();}var da=document.getElementById("dashboardArea");var sections=da.querySelectorAll(".section");for(var i=0;i<sections.length;i++){sections[i].style.display="block";}}'

+'function loadInstructorsList(){google.script.run.withSuccessHandler(function(list){allInstructorsList=list;var c=document.getElementById("instructorsList");if(!list||list.length===0){c.innerHTML="<div class=\\"active-empty\\">\u05D0\u05D9\u05DF \u05DE\u05D3\u05E8\u05D9\u05DB\u05D9\u05DD</div>";return;}var h="<table class=\\"instr-table\\"><thead><tr><th>\u05E9\u05DD</th><th>\u05EA.\u05D6.</th><th>\u05D8\u05DC\u05E4\u05D5\u05DF</th><th>\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC</th><th>\u05D4\u05E8\u05E9\u05D0\u05D4</th><th></th></tr></thead><tbody>";for(var i=0;i<list.length;i++){var inst=list[i];h+="<tr><td>"+inst.name+"</td><td>"+inst.tz+"</td><td>"+(inst.phone||"-")+"</td><td>"+(inst.email||"-")+"</td><td>"+(inst.admin?"<span class=\\"badge-admin\\">\u05DE\u05E0\u05D4\u05DC</span>":"-")+"</td><td><button class=\\"btn btn-small\\" style=\\"background:#475569;color:#fff\\" onclick=\\"showEditInstructor(\'"+inst.tz+"\')\\">\u05E2\u05E8\u05D9\u05DB\u05D4</button></td></tr>";}h+="</tbody></table>";c.innerHTML=h;}).withFailureHandler(function(e){document.getElementById("instructorsList").innerHTML="<div class=\\"active-empty\\">\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message+"</div>";}).getAllInstructors()}'

+'function toggleAddInstructor(){var f=document.getElementById("addInstrForm");f.style.display=f.style.display==="none"?"block":"none";document.getElementById("editInstrForm").style.display="none";}'

+'function doAddInstructor(){var d={name:document.getElementById("newInstrName").value.trim(),tz:document.getElementById("newInstrTz").value.trim(),license:document.getElementById("newInstrLicense").value.trim(),phone:document.getElementById("newInstrPhone").value.trim(),email:document.getElementById("newInstrEmail").value.trim(),admin:document.getElementById("newInstrAdmin").checked};if(!d.name||!d.tz){alert("\u05E9\u05DD \u05DE\u05DC\u05D0 \u05D5\u05EA.\u05D6. \u05D4\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){showToast(r.message);document.getElementById("addInstrForm").style.display="none";document.getElementById("newInstrName").value="";document.getElementById("newInstrTz").value="";document.getElementById("newInstrLicense").value="";document.getElementById("newInstrPhone").value="";document.getElementById("newInstrEmail").value="";document.getElementById("newInstrAdmin").checked=false;loadInstructorsList();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).addInstructor(d);});}'

+'function showEditInstructor(tz){var inst=null;for(var i=0;i<allInstructorsList.length;i++){if(allInstructorsList[i].tz===tz){inst=allInstructorsList[i];break;}}if(!inst)return;document.getElementById("addInstrForm").style.display="none";document.getElementById("editInstrForm").style.display="block";document.getElementById("editInstrOrigTz").value=inst.tz;document.getElementById("editInstrName").value=inst.name;document.getElementById("editInstrTz").value=inst.tz;document.getElementById("editInstrLicense").value=inst.license||"";document.getElementById("editInstrPhone").value=inst.phone||"";document.getElementById("editInstrEmail").value=inst.email||"";document.getElementById("editInstrAdmin").checked=inst.admin;}'

+'function hideEditInstructor(){document.getElementById("editInstrForm").style.display="none";}'

+'function doEditInstructor(){var origTz=document.getElementById("editInstrOrigTz").value;var d={name:document.getElementById("editInstrName").value.trim(),license:document.getElementById("editInstrLicense").value.trim(),phone:document.getElementById("editInstrPhone").value.trim(),email:document.getElementById("editInstrEmail").value.trim(),admin:document.getElementById("editInstrAdmin").checked};if(!d.name){alert("\u05E9\u05DD \u05DE\u05DC\u05D0 \u05D4\u05D5\u05D0 \u05E9\u05D3\u05D4 \u05D7\u05D5\u05D1\u05D4");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){showToast(r.message);document.getElementById("editInstrForm").style.display="none";loadInstructorsList();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).updateInstructor(origTz,d);});}'

+'function doSearchTrainees(){var q=document.getElementById("traineeSearch").value.trim();if(!q){alert("\u05D4\u05D6\u05DF \u05DE\u05D9\u05DC\u05EA \u05D7\u05D9\u05E4\u05D5\u05E9");return;}document.getElementById("traineeCard").style.display="none";var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(results){done();var c=document.getElementById("traineeResults");if(!results||results.length===0){c.innerHTML="<div class=\\"active-empty\\">\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA</div>";return;}var h="";for(var i=0;i<results.length;i++){var r=results[i];var badge=r.status==="\u05E4\u05E2\u05D9\u05DC"?"badge-active":r.status==="\u05DE\u05D5\u05E9\u05E2\u05D4"?"badge-suspended":"badge-inactive";h+="<div class=\\"active-item\\" style=\\"cursor:pointer\\" onclick=\\"selectTrainee(\'"+r.tz+"\')\\">"+"<div class=\\"item-info\\"><span class=\\"item-date\\">"+r.name+"</span><span class=\\"item-instructor\\">"+r.tz+"</span><span class=\\"item-notes\\">"+r.phone+"</span></div>"+"<span class=\\""+badge+"\\">"+r.status+"</span></div>";}c.innerHTML=h;}).withFailureHandler(function(e){done();document.getElementById("traineeResults").innerHTML="<div class=\\"active-empty\\">\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message+"</div>";}).searchTrainees(q);});}'

+'document.getElementById("traineeSearch").addEventListener("keydown",function(e){if(e.key==="Enter")doSearchTrainees()});'

+'function selectTrainee(tz){document.getElementById("traineeResults").innerHTML="";google.script.run.withSuccessHandler(function(status){google.script.run.withSuccessHandler(function(inst){var card=document.getElementById("traineeCard");card.style.display="block";var name=inst.name||tz;document.getElementById("traineeCardName").textContent=name;document.getElementById("traineeCardTz").textContent=inst.tz||tz;document.getElementById("traineeCardPhone").textContent=inst.phone||"-";document.getElementById("traineeEditLink").href=WEBAPP_URL+"?action=register&tz="+encodeURIComponent(tz)+"&admin=1";card.setAttribute("data-tz",tz);var statusBadge=status.status==="\u05E4\u05E2\u05D9\u05DC"?"badge-active":status.status==="\u05DE\u05D5\u05E9\u05E2\u05D4"?"badge-suspended":"badge-inactive";document.getElementById("traineeCardStatus").innerHTML="<span class=\\""+statusBadge+"\\">"+status.status+"</span>";document.getElementById("statusSelect").value=status.status||"\u05E4\u05E2\u05D9\u05DC";onStatusChange();if(status.reason){document.getElementById("reasonText").value=status.reason;}}).withFailureHandler(function(e){alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).getVerifiedTraineeData(tz);}).withFailureHandler(function(e){alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).getTraineeStatusData(tz);}'

+'function onStatusChange(){var v=document.getElementById("statusSelect").value;var show=v==="\u05DE\u05D5\u05E9\u05E2\u05D4";document.getElementById("reasonField").style.display=show?"block":"none";document.getElementById("reasonTextFieldWrap").style.display=show?"block":"none";}'

+'function loadSuspensionReasons(){google.script.run.withSuccessHandler(function(reasons){var sel=document.getElementById("reasonSelect");while(sel.options.length>1)sel.remove(1);for(var i=0;i<reasons.length;i++){var o=document.createElement("option");o.value=reasons[i];o.textContent=reasons[i];sel.appendChild(o);}}).getSuspensionReasons()}'

+'function onReasonSelect(){var v=document.getElementById("reasonSelect").value;if(v){document.getElementById("reasonText").value=v;}}'

+'function doUpdateStatus(){var card=document.getElementById("traineeCard");var tz=card.getAttribute("data-tz");var status=document.getElementById("statusSelect").value;var reason=status==="\u05DE\u05D5\u05E9\u05E2\u05D4"?document.getElementById("reasonText").value.trim():"";if(status==="\u05DE\u05D5\u05E9\u05E2\u05D4"&&!reason){alert("\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05D9\u05D1\u05EA \u05D4\u05E9\u05E2\u05D9\u05D4");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){showToast(r.message);selectTrainee(tz);loadSuspendedList();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).updateTraineeStatus(tz,status,reason);});}'

+'var allReasonsList=[];var suspendedTrainees=[];'

+'function loadSuspendedList(){google.script.run.withSuccessHandler(function(list){suspendedTrainees=list||[];var c=document.getElementById("suspendedList");if(suspendedTrainees.length===0){c.innerHTML="<div class=\\"active-empty\\" style=\\"color:#4ade80\\">\u2705 \u05D0\u05D9\u05DF \u05DE\u05EA\u05D0\u05DE\u05E0\u05D9\u05DD \u05DE\u05D5\u05E9\u05E2\u05D9\u05DD</div>";return;}var h="";for(var i=0;i<suspendedTrainees.length;i++){var t=suspendedTrainees[i];h+="<div class=\\"active-item\\"><div class=\\"item-info\\"><span class=\\"item-date\\">"+t.name+"</span><span class=\\"item-instructor\\">"+t.tz+"</span><span class=\\"item-notes\\" style=\\"color:#fbbf24\\">"+(t.reason||"\u05DC\u05D0 \u05E6\u05D5\u05D9\u05E0\u05D4")+"</span></div><button class=\\"btn btn-small\\" style=\\"background:#16a34a;color:#fff\\" data-idx=\\""+i+"\\" onclick=\\"doResolveSuspension(this.dataset.idx,this)\\">\u05D4\u05E1\u05E8 \u05D4\u05E9\u05E2\u05D9\u05D4</button></div>";}c.innerHTML=h;}).withFailureHandler(function(e){document.getElementById("suspendedList").innerHTML="<div class=\\"active-empty\\">\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message+"</div>";}).getSuspendedTrainees()}'

+'function doResolveSuspension(idx,btn){var t=suspendedTrainees[idx];if(!t)return;if(!confirm("\u05D4\u05E1\u05E8 \u05D4\u05E9\u05E2\u05D9\u05D4 \u05E2\u05D1\u05D5\u05E8 "+t.name+"?")){return;}withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){showToast(r.message);loadSuspendedList();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).updateTraineeStatus(t.tz,"\u05E4\u05E2\u05D9\u05DC","");});}'

+'function toggleReasonsPanel(){var p=document.getElementById("reasonsPanel");if(p.style.display==="none"){p.style.display="block";loadReasonsList();}else{p.style.display="none";}}'

+'function loadReasonsList(){google.script.run.withSuccessHandler(function(reasons){allReasonsList=reasons||[];var c=document.getElementById("reasonsList");if(allReasonsList.length===0){c.innerHTML="<div class=\\"active-empty\\">\u05D0\u05D9\u05DF \u05E1\u05D9\u05D1\u05D5\u05EA \u05DE\u05D5\u05D2\u05D3\u05E8\u05D5\u05EA</div>";return;}var h="";for(var i=0;i<allReasonsList.length;i++){var r=allReasonsList[i];var badge=r.active?"badge-active":"badge-inactive";var label=r.active?"\u05E4\u05E2\u05D9\u05DC":"\u05DC\u05D0 \u05E4\u05E2\u05D9\u05DC";var btnLabel=r.active?"\u05D4\u05E9\u05D1\u05EA":"\u05D4\u05E4\u05E2\u05DC";var btnStyle=r.active?"background:#64748b;color:#fff":"background:#16a34a;color:#fff";h+="<div class=\\"active-item\\"><div class=\\"item-info\\"><span class=\\"item-date\\">"+r.reason+"</span><span class=\\""+badge+"\\">"+label+"</span></div><button class=\\"btn btn-small\\" style=\\""+btnStyle+"\\" data-idx=\\""+i+"\\" onclick=\\"doToggleReason(this.dataset.idx,this)\\">"+btnLabel+"</button></div>";}c.innerHTML=h;}).withFailureHandler(function(e){document.getElementById("reasonsList").innerHTML="<div class=\\"active-empty\\">\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message+"</div>";}).getAllSuspensionReasons()}'

+'function toggleAddReason(){var f=document.getElementById("addReasonForm");f.style.display=f.style.display==="none"?"block":"none";}'

+'function doAddReason(){var text=document.getElementById("newReasonText").value.trim();if(!text){alert("\u05D9\u05E9 \u05DC\u05D4\u05D6\u05D9\u05DF \u05E1\u05D9\u05D1\u05D4");return;}var btn=event.target.closest("button");withLoading(btn,function(done){google.script.run.withSuccessHandler(function(r){done();if(r.success){showToast(r.message);document.getElementById("newReasonText").value="";document.getElementById("addReasonForm").style.display="none";loadReasonsList();loadSuspensionReasons();}else{alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).addSuspensionReason(text);});}'

+'function doToggleReason(idx,btn){var r=allReasonsList[idx];if(!r)return;withLoading(btn,function(done){google.script.run.withSuccessHandler(function(res){done();if(res.success){showToast(res.message);loadReasonsList();loadSuspensionReasons();}else{alert(res.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).toggleSuspensionReason(r.reason,!r.active);});}'

+'function loadOwnerInstrSelect(){google.script.run.withSuccessHandler(function(list){var sel=document.getElementById("ownerInstrSelect");for(var i=0;i<list.length;i++){var o=document.createElement("option");o.value=list[i].tz;o.textContent=list[i].name+" ("+list[i].tz+")";sel.appendChild(o);}}).getAllInstructors();}'

+'document.getElementById("ownerInstrSelect").addEventListener("change",function(){var tz=this.value;if(!tz){document.getElementById("ownerSessionsArea").style.display="none";return;}google.script.run.withSuccessHandler(function(sessions){ownerAllSessions=sessions;ownerCurrentFilter="all";ownerRenderSessions();document.getElementById("ownerSessionsArea").style.display="block";}).withFailureHandler(function(e){alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).getInstructorSessions(tz);});'

+'function ownerFilterSessions(f){ownerCurrentFilter=f;ownerRenderSessions();}'

+'function ownerRenderSessions(){var tb=document.getElementById("ownerSessionsBody");tb.innerHTML="";var count=0;for(var i=0;i<ownerAllSessions.length;i++){var s=ownerAllSessions[i];if(ownerCurrentFilter!=="all"&&s.status!==ownerCurrentFilter)continue;count++;var tr=document.createElement("tr");var td1=document.createElement("td");td1.textContent=s.date;var td2=document.createElement("td");td2.textContent=s.status;td2.className=s.status==="\u05E4\u05E2\u05D9\u05DC"?"status-active-txt":"status-closed-txt";var td3=document.createElement("td");td3.textContent=s.notes||"-";var td4=document.createElement("td");var pbtn=document.createElement("button");pbtn.className="btn btn-primary btn-small";pbtn.setAttribute("data-sid",s.sessionId);pbtn.textContent="\uD83D\uDDA8\uFE0F";pbtn.onclick=function(){adminPrint(this.getAttribute("data-sid"));};td4.appendChild(pbtn);if(s.status==="\u05E4\u05E2\u05D9\u05DC"){var cbtn=document.createElement("button");cbtn.className="btn btn-danger btn-small";cbtn.style.marginRight="6px";cbtn.setAttribute("data-sid",s.sessionId);cbtn.textContent="\u05E1\u05D2\u05D5\u05E8";cbtn.onclick=function(){var sid=this.getAttribute("data-sid");var self=this;if(!confirm("\u05D4\u05D0\u05DD \u05DC\u05E1\u05D2\u05D5\u05E8 \u05D0\u05EA \u05D4\u05D0\u05D9\u05DE\u05D5\u05DF?")){return;}withLoading(self,function(done){google.script.run.withSuccessHandler(function(r){if(r.success){for(var j=0;j<ownerAllSessions.length;j++){if(ownerAllSessions[j].sessionId===sid){ownerAllSessions[j].status="\u05E1\u05D2\u05D5\u05E8";break;}}ownerRenderSessions();loadAdminActiveSessions();}else{done();alert(r.message);}}).withFailureHandler(function(e){done();alert("\u05E9\u05D2\u05D9\u05D0\u05D4: "+e.message);}).closeSession(sid);});};td4.appendChild(cbtn);}tr.appendChild(td1);tr.appendChild(td2);tr.appendChild(td3);tr.appendChild(td4);tb.appendChild(tr);}if(count===0){var tr2=document.createElement("tr");var td=document.createElement("td");td.colSpan=4;td.style.textAlign="center";td.style.color="#94a3b8";td.textContent="\u05D0\u05D9\u05DF \u05D0\u05D9\u05DE\u05D5\u05E0\u05D9\u05DD";tr2.appendChild(td);tb.appendChild(tr2);}}'

+'</script>' + getZoomScript(null, true)
+'</body></html>';
}
