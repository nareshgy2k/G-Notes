import { useState, useEffect } from "react";

const PIN_KEY     = "qnotes_pin";
const NOTES_KEY   = "qnotes_data";
const DARK_KEY    = "qnotes_dark";
const LOCK_KEY    = "qnotes_lock";
const REMINDERS_KEY = "qnotes_reminders_standalone";
const DEFAULT_PIN = "1234";
const CATEGORIES  = ["All","Personal","Shopping","Work","Templates"];
const CAT_COLORS  = {
  Personal:  {bg:"#ede9fe",bgD:"#2e1065",text:"#5b21b6",textD:"#c4b5fd",dot:"#7c3aed"},
  Shopping:  {bg:"#fce7f3",bgD:"#500724",text:"#9d174d",textD:"#f9a8d4",dot:"#ec4899"},
  Work:      {bg:"#dbeafe",bgD:"#1e3a5f",text:"#1e40af",textD:"#93c5fd",dot:"#3b82f6"},
  Templates: {bg:"#d1fae5",bgD:"#064e3b",text:"#065f46",textD:"#6ee7b7",dot:"#10b981"},
  All:       {bg:"#f3f4f6",bgD:"#1f2937",text:"#374151",textD:"#9ca3af",dot:"#6b7280"},
};
const SAMPLE_NOTES = []; // Start empty for new installs

const getDefaultTitle=(notes,type)=>{
  const base=type==="checklist"?"My Checklist":"My Note";
  const ex=notes.map(n=>n.title);
  if(!ex.includes(base))return base;
  let i=2;while(ex.includes(`${base} ${i}`))i++;return `${base} ${i}`;
};
const encodeNote=note=>{try{return btoa(unescape(encodeURIComponent(JSON.stringify({title:note.title,content:note.content,type:note.type,category:note.category,items:note.items.map(i=>({id:i.id,text:i.text,done:false}))}))));}catch{return null;}};
const decodeNote=str=>{try{return JSON.parse(decodeURIComponent(escape(atob(str))));}catch{return null;}};

// ── Days until (FIXED — always shows future days) ─────────────────────────────
const daysUntilDate=(dateStr,type)=>{
  if(!dateStr)return null;
  const now=new Date();
  now.setHours(0,0,0,0);
  const target=new Date(dateStr);
  // For birthday/anniversary always roll to next occurrence
  if(type==="birthday"||type==="anniversary"){
    target.setFullYear(now.getFullYear());
    if(target<=now) target.setFullYear(now.getFullYear()+1);
  }
  const diff=Math.ceil((target-now)/(1000*60*60*24));
  if(diff===0)return"🎉 Today!";
  if(diff===1)return"Tomorrow!";
  return`In ${diff} days`;
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2500);return()=>clearTimeout(t);},[]);
  return<div style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",background:"#1a1a2e",color:"#fff",padding:"10px 20px",borderRadius:24,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>✅ {msg}</div>;
}

// ── Ad Banner ─────────────────────────────────────────────────────────────────
function AdBanner({dark}){
  return(
    <div style={{position:"fixed",bottom:0,left:0,right:0,height:52,background:dark?"#1f2937":"#f8fafc",borderTop:`1px solid ${dark?"#374151":"#e5e7eb"}`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:40}}>
      <div style={{fontSize:11,color:dark?"#6b7280":"#9ca3af",fontStyle:"italic"}}>📢 Advertisement — tap to support QuickNotes</div>
    </div>
  );
}

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle({value,onChange}){
  return(
    <div onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:12,cursor:"pointer",position:"relative",background:value?"#4f46e5":"#9ca3af",transition:"background 0.2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:value?22:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </div>
  );
}

// ── PIN Screen ────────────────────────────────────────────────────────────────
function PinScreen({onUnlock,isSetup}){
  const [digits,setDigits]=useState([]);
  const [shake,setShake]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const stored=localStorage.getItem(PIN_KEY)||DEFAULT_PIN;
  const press=d=>{
    if(digits.length>=4)return;
    const next=[...digits,d];setDigits(next);
    if(next.length===4)setTimeout(()=>{
      if(isSetup){
        if(!confirm){setConfirm(next.join(""));setDigits([]);}
        else if(confirm===next.join("")){localStorage.setItem(PIN_KEY,next.join(""));onUnlock();}
        else{setShake(true);setDigits([]);setConfirm(null);setTimeout(()=>setShake(false),500);}
      }else{
        if(next.join("")===stored)onUnlock();
        else{setShake(true);setDigits([]);setTimeout(()=>setShake(false),500);}
      }
    },100);
  };
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0f0c29,#302b63,#24243e)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontSize:48,marginBottom:8}}>📋</div>
      <h2 style={{color:"#fff",fontWeight:800,fontSize:22,margin:"0 0 4px"}}>QuickNotes</h2>
      <p style={{color:"#a5b4fc",fontSize:13,margin:"0 0 36px"}}>{isSetup?(confirm?"Confirm PIN":"Set 4-digit PIN"):"Enter PIN"}</p>
      <div style={{display:"flex",gap:16,marginBottom:40,animation:shake?"shake 0.4s":"none"}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:16,height:16,borderRadius:"50%",background:i<digits.length?"#818cf8":"transparent",border:"2px solid #818cf8"}}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,72px)",gap:12}}>
        {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
          <button key={i} onClick={()=>k==="⌫"?setDigits(d=>d.slice(0,-1)):k!==""&&press(String(k))} disabled={k===""}
            style={{width:72,height:72,borderRadius:"50%",border:"none",background:k===""?"transparent":k==="⌫"?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.12)",color:"#fff",fontSize:k==="⌫"?20:24,fontWeight:600,cursor:k===""?"default":"pointer"}}>{k}</button>
        ))}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

// ── Settings Screen ───────────────────────────────────────────────────────────
function SettingsScreen({onClose,dark,setDark,lockEnabled,setLockEnabled,globalCopy,setGlobalCopy,notes,setNotes,reminderCount}){
  const [changingPin,setChangingPin]=useState(false);
  const [newPin,setNewPin]=useState("");
  const [confirmPin,setConfirmPin]=useState("");
  const [pinStep,setPinStep]=useState(1);
  const [pinError,setPinError]=useState("");
  const bg=dark?"#111827":"#f5f3ff";
  const card=dark?"#1f2937":"#fff";
  const textColor=dark?"#f9fafb":"#111";
  const subText=dark?"#9ca3af":"#6b7280";
  const border=dark?"#374151":"#e5e7eb";

  const showBackupToast=(opt)=>{
    alert(`Backup frequency set to: ${opt}.\n\nYou'll see a reminder banner in Settings on this schedule. The actual backup is always a one-tap manual action below — no app can silently email files in the background without a paid server.`);
  };

  const doBackupNow=()=>{
    const email=window.prompt("Enter the email address to send this backup to:", localStorage.getItem("qnotes_backup_email")||"");
    if(!email)return;
    if(!email.includes("@")){alert("Please enter a valid email address.");return;}
    localStorage.setItem("qnotes_backup_email",email);

    const backupData={notes,exportedAt:new Date().toISOString(),app:"QuickNotes"};
    const dateStr=new Date().toISOString().split("T")[0];
    const fileName=`quicknotes-backup-${dateStr}.json`;
    const blob=new Blob([JSON.stringify(backupData,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=fileName;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Step 1 done: "${fileName}" downloaded to your device.\n\nNext: Gmail will open addressed to ${email}. Tap the 📎 attach icon in Gmail and pick that file from your Downloads/Files app before hitting send.`);

    setTimeout(()=>{
      const subject=encodeURIComponent("My QuickNotes Backup - "+dateStr);
      const body=encodeURIComponent(`Backup attached.\n\nFile name to attach: ${fileName}\n(Find it in your Downloads or Files app, then tap the paperclip in Gmail to attach it.)`);
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`,"_blank");
    },1200);
  };

  const doLocalBackupOnly=()=>{
    const backupData={notes,exportedAt:new Date().toISOString(),app:"QuickNotes"};
    const dateStr=new Date().toISOString().split("T")[0];
    const fileName=`quicknotes-backup-${dateStr}.json`;
    const blob=new Blob([JSON.stringify(backupData,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download=fileName;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`Saved "${fileName}" to your Downloads. You can restore it anytime using "Restore from backup file" below.`);
  };

  const handleRestoreFile=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=(evt)=>{
      try{
        const parsed=JSON.parse(evt.target.result);
        const restoredNotes=parsed.notes||parsed;
        if(Array.isArray(restoredNotes)){
          if(window.confirm(`Restore ${restoredNotes.length} notes? This will replace your current notes.`)){
            setNotes(restoredNotes);
            alert("Notes restored successfully!");
          }
        } else { alert("Invalid backup file format."); }
      }catch{ alert("Could not read backup file. Make sure it's a valid QuickNotes backup."); }
    };
    reader.readAsText(file);
  };

  const handlePinDigit=(digit,step)=>{
    if(step===1){
      const val=newPin+digit;
      setNewPin(val);
      if(val.length===4){setPinStep(2);setPinError("");}
    } else {
      const val=confirmPin+digit;
      setConfirmPin(val);
      if(val.length===4){
        if(val===newPin){localStorage.setItem(PIN_KEY,val);setChangingPin(false);setNewPin("");setConfirmPin("");setPinStep(1);setPinError("✅ PIN changed successfully!");}
        else{setPinError("PINs don't match. Try again.");setConfirmPin("");setPinStep(1);setNewPin("");}
      }
    }
  };

  const row=(icon,label,sub,right)=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:`1px solid ${border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:22}}>{icon}</span>
        <div>
          <div style={{fontWeight:600,fontSize:14,color:textColor}}>{label}</div>
          {sub&&<div style={{fontSize:12,color:subText,marginTop:2}}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );

  return(
    <div style={{position:"fixed",inset:0,background:bg,zIndex:100,display:"flex",flexDirection:"column"}}>
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#4f46e5)",padding:"20px 16px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#fff"}}>←</button>
          <h2 style={{color:"#fff",margin:0,fontSize:20,fontWeight:800}}>⚙️ Settings</h2>
        </div>
      </div>

      <div style={{flex:1,overflow:"auto",padding:"0 16px 40px"}}>

        {/* Appearance */}
        <div style={{fontSize:11,fontWeight:700,color:subText,textTransform:"uppercase",letterSpacing:1,padding:"16px 0 8px"}}>Appearance</div>
        {row("🌙","Dark Mode","Switch between light and dark theme",<Toggle value={dark} onChange={setDark}/>)}

        {/* Notes */}
        <div style={{fontSize:11,fontWeight:700,color:subText,textTransform:"uppercase",letterSpacing:1,padding:"16px 0 8px"}}>Notes</div>
        {row("📋","Copy Mode","Show copy button on all note cards by default",<Toggle value={globalCopy} onChange={setGlobalCopy}/>)}

        {/* Security */}
        <div style={{fontSize:11,fontWeight:700,color:subText,textTransform:"uppercase",letterSpacing:1,padding:"16px 0 8px"}}>Security</div>
        {row("🔐","PIN Lock","Require PIN when opening the app",<Toggle value={lockEnabled} onChange={v=>{setLockEnabled(v);localStorage.setItem(LOCK_KEY,v);}}/>)}

        {lockEnabled&&(
          <div style={{background:card,borderRadius:12,padding:14,marginTop:8}}>
            {!changingPin?(
              <button onClick={()=>setChangingPin(true)} style={{width:"100%",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",borderRadius:10,padding:12,fontWeight:700,fontSize:14,cursor:"pointer"}}>
                🔑 Change PIN
              </button>
            ):(
              <div>
                <div style={{fontWeight:700,color:textColor,marginBottom:12,textAlign:"center"}}>
                  {pinStep===1?"Enter new 4-digit PIN":"Confirm new PIN"}
                </div>
                <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:16}}>
                  {[0,1,2,3].map(i=>(
                    <div key={i} style={{width:14,height:14,borderRadius:"50%",background:(pinStep===1?newPin:confirmPin).length>i?"#4f46e5":"transparent",border:"2px solid #4f46e5"}}/>
                  ))}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:240,margin:"0 auto"}}>
                  {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=>(
                    <button key={i} onClick={()=>{
                      if(k==="⌫"){if(pinStep===1)setNewPin(p=>p.slice(0,-1));else setConfirmPin(p=>p.slice(0,-1));}
                      else if(k!=="")handlePinDigit(String(k),pinStep);
                    }} disabled={k===""}
                      style={{height:44,borderRadius:10,border:"none",background:k===""?"transparent":dark?"#374151":"#f3f4f6",color:textColor,fontSize:18,fontWeight:600,cursor:k===""?"default":"pointer"}}>
                      {k}
                    </button>
                  ))}
                </div>
                {pinError&&<div style={{textAlign:"center",marginTop:10,fontSize:13,color:pinError.startsWith("✅")?"#10b981":"#ef4444",fontWeight:600}}>{pinError}</div>}
                <button onClick={()=>{setChangingPin(false);setNewPin("");setConfirmPin("");setPinStep(1);setPinError("");}} style={{width:"100%",background:dark?"#374151":"#f3f4f6",color:subText,border:"none",borderRadius:10,padding:10,fontWeight:600,fontSize:13,cursor:"pointer",marginTop:12}}>Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* Reminders */}
        <div style={{fontSize:11,fontWeight:700,color:subText,textTransform:"uppercase",letterSpacing:1,padding:"16px 0 8px"}}>Reminders</div>
        <div style={{background:card,borderRadius:12,padding:14}}>
          <div style={{fontSize:13,color:textColor,fontWeight:600,marginBottom:4}}>🔔 Default reminder time</div>
          <div style={{fontSize:12,color:subText,marginBottom:8}}>Birthday & Anniversary reminders fire at 11:58 PM by default so you can wish at midnight</div>
          <div style={{background:dark?"#374151":"#f3f4f6",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#4f46e5",fontWeight:600}}>⭐ 11:58 PM (fixed for birthdays)</div>
        </div>

        {/* Backup */}
        <div style={{fontSize:11,fontWeight:700,color:subText,textTransform:"uppercase",letterSpacing:1,padding:"16px 0 8px"}}>Backup & Restore</div>
        <div style={{background:card,borderRadius:12,padding:14,marginBottom:8}}>
          <div style={{fontSize:13,color:textColor,fontWeight:600,marginBottom:4}}>📧 Email yourself a backup</div>
          <div style={{fontSize:12,color:subText,marginBottom:10}}>Downloads a backup file, then opens Gmail so you can attach and email it to yourself</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            {["Weekly","Monthly","Manual only"].map(opt=>(
              <button key={opt} onClick={()=>{localStorage.setItem("qnotes_backup_freq",opt);showBackupToast(opt);}}
                style={{padding:"6px 12px",borderRadius:16,border:"none",cursor:"pointer",
                  background:(localStorage.getItem("qnotes_backup_freq")||"Manual only")===opt?"#4f46e5":dark?"#374151":"#f3f4f6",
                  color:(localStorage.getItem("qnotes_backup_freq")||"Manual only")===opt?"#fff":subText,fontWeight:600,fontSize:12}}>
                {opt}
              </button>
            ))}
          </div>
          <button onClick={doBackupNow}
            style={{width:"100%",background:"linear-gradient(135deg,#ea4335,#fbbc04)",color:"#fff",border:"none",borderRadius:10,padding:11,fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:8}}>
            📥 Backup Now & Email
          </button>
          <button onClick={doLocalBackupOnly}
            style={{width:"100%",background:dark?"#374151":"#f3f4f6",color:textColor,border:"none",borderRadius:10,padding:11,fontWeight:700,fontSize:13,cursor:"pointer"}}>
            💾 Save Backup File Only (no email)
          </button>
          <div style={{fontSize:11,color:subText,marginTop:8}}>
            Reminder banner will show in-app on your chosen schedule. True silent background email isn't possible from a browser/PWA without a paid server — both options above are one-tap manual actions.
          </div>
        </div>
        <div style={{background:card,borderRadius:12,padding:14}}>
          <div style={{fontSize:13,color:textColor,fontWeight:600,marginBottom:8}}>📂 Restore from backup file</div>
          <input type="file" accept=".json" onChange={handleRestoreFile} style={{fontSize:12,color:subText,width:"100%"}}/>
        </div>

        {/* Data */}
        <div style={{fontSize:11,fontWeight:700,color:subText,textTransform:"uppercase",letterSpacing:1,padding:"16px 0 8px"}}>Data</div>
        <div style={{background:card,borderRadius:12,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{fontSize:13,color:textColor,fontWeight:600}}>📊 Total notes</span>
            <span style={{fontSize:13,color:"#4f46e5",fontWeight:700}}>{notes.length}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontSize:13,color:textColor,fontWeight:600}}>🔔 Active reminders</span>
            <span style={{fontSize:13,color:"#4f46e5",fontWeight:700}}>{reminderCount}</span>
          </div>
          <button onClick={()=>{if(window.confirm("Delete ALL notes? This cannot be undone.")){setNotes([]);localStorage.removeItem(NOTES_KEY);}}}
            style={{width:"100%",background:"#fff1f2",color:"#ef4444",border:"2px solid #fca5a5",borderRadius:10,padding:10,fontWeight:700,fontSize:13,cursor:"pointer"}}>
            🗑️ Clear All Notes
          </button>
        </div>

        {/* About */}
        <div style={{fontSize:11,fontWeight:700,color:subText,textTransform:"uppercase",letterSpacing:1,padding:"16px 0 8px"}}>About</div>
        <div style={{background:card,borderRadius:12,padding:14,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:6}}>📋</div>
          <div style={{fontWeight:800,fontSize:16,color:textColor}}>QuickNotes</div>
          <div style={{fontSize:12,color:subText,marginTop:4}}>Version 1.0 · Built with ❤️</div>
          <div style={{fontSize:12,color:subText,marginTop:2}}>One-tap copy · Checklists · Reminders · WhatsApp</div>
        </div>
      </div>
    </div>
  );
}

// ── Reminder Modal ────────────────────────────────────────────────────────────
function ReminderModal({note,onSave,onClose,dark}){
  const [type,setType]=useState(note.reminder?.type||"once");
  const [date,setDate]=useState(note.reminder?.date||"");
  const [time,setTime]=useState(note.reminder?.time||"23:58");
  const [phone,setPhone]=useState(note.reminder?.phone||"");
  const [contactName,setContactName]=useState(note.reminder?.contactName||"");
  const [message,setMessage]=useState(note.reminder?.message||`🎉 ${note.title||"Reminder"}!\n\nJust thinking of you today 😊`);
  const [label,setLabel]=useState(note.reminder?.label||note.title||"Reminder");

  const inp={background:dark?"#374151":"#f9fafb",border:`1px solid ${dark?"#4b5563":"#e5e7eb"}`,borderRadius:10,padding:"10px 14px",fontSize:14,color:dark?"#f9fafb":"#111",fontFamily:"inherit",width:"100%",boxSizing:"border-box",outline:"none"};
  const bg=dark?"#1f2937":"#fff";
  const textColor=dark?"#f9fafb":"#111";
  const subText=dark?"#9ca3af":"#6b7280";
  const lbl={display:"block",fontSize:12,fontWeight:700,color:subText,marginBottom:8,textTransform:"uppercase"};

  // Auto set time to 23:58 for birthdays/anniversaries
  useEffect(()=>{
    if(type==="birthday"||type==="anniversary") setTime("23:58");
  },[type]);

  const pickContact=async()=>{
    if("contacts"in navigator&&"ContactsManager"in window){
      try{
        const contacts=await navigator.contacts.select(["name","tel"],{multiple:false});
        if(contacts.length>0){
          setContactName(contacts[0].name?.[0]||"");
          setPhone((contacts[0].tel?.[0]||"").replace(/\s/g,""));
          setLabel(`${contacts[0].name?.[0]||""}'s ${type==="birthday"?"Birthday":"Anniversary"}`);
          setMessage(type==="birthday"
            ?`🎂 Happy Birthday ${contacts[0].name?.[0]||""}! Wishing you a wonderful day! 🎉`
            :`💍 Happy Anniversary ${contacts[0].name?.[0]||""}! Wishing you many more years of love! ❤️`);
        }
      }catch{alert("Contact access not available. Please enter number manually.");}
    }else{
      alert("Contact picker works in the APK version.\nPlease enter the number manually below.");
    }
  };

  const save=()=>{
    if(!date){alert("Please select a date");return;}
    onSave({type,date,time,phone:phone.replace(/\s/g,""),contactName,message,label,active:true});
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:bg,borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:18,fontWeight:800,color:textColor}}>🔔 Set Reminder</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:"#9ca3af"}}>×</button>
        </div>

        <div style={{marginBottom:16}}>
          <label style={lbl}>Type</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["once","⏰ Once"],["birthday","🎂 Birthday"],["anniversary","💍 Anniversary"],["daily","🔁 Daily"],["weekly","📅 Weekly"]].map(([v,l])=>(
              <button key={v} onClick={()=>setType(v)} style={{padding:"7px 14px",borderRadius:20,border:"none",cursor:"pointer",background:type===v?"#4f46e5":dark?"#374151":"#f3f4f6",color:type===v?"#fff":dark?"#d1d5db":"#6b7280",fontWeight:600,fontSize:12}}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={lbl}>Label</label>
          <input value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Mom's Birthday" style={inp}/>
        </div>

        <div style={{marginBottom:16}}>
          <label style={lbl}>Date</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>
          {(type==="birthday"||type==="anniversary")&&(
            <div style={{fontSize:11,color:"#7c3aed",marginTop:4,fontWeight:600}}>
              ⭐ For birthdays/anniversaries the year doesn't matter — reminder repeats every year automatically
            </div>
          )}
        </div>

        <div style={{marginBottom:16}}>
          <label style={lbl}>Reminder Time</label>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inp}/>
          <div style={{fontSize:11,color:"#9ca3af",marginTop:4}}>
            {type==="birthday"||type==="anniversary"?"⭐ 11:58 PM default — wish at midnight!":"Set when you want the notification"}
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label style={lbl}>💬 WhatsApp Contact (optional)</label>
          <button onClick={pickContact} style={{width:"100%",background:"linear-gradient(135deg,#25d366,#128c7e)",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>
            👤 Pick from Contacts
          </button>
          {contactName&&<div style={{fontSize:13,fontWeight:600,color:"#10b981",marginBottom:8}}>✅ {contactName} selected</div>}
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 604 123 4567 (or enter manually)" style={inp}/>
        </div>

        {phone&&(
          <div style={{marginBottom:20}}>
            <label style={lbl}>WhatsApp Message</label>
            <textarea value={message} onChange={e=>setMessage(e.target.value)} rows={3} style={{...inp,resize:"vertical"}}/>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
              {[
                ["🎂 Birthday",`🎂 Happy Birthday ${contactName||""}! Wishing you a wonderful day! 🎉`],
                ["💍 Anniversary",`💍 Happy Anniversary ${contactName||""}! Wishing you many more years of love! ❤️`],
                ["🎉 General",`🎉 Hey ${contactName||""}! Just thinking of you today. Hope you have an amazing day! 😊`],
                ["🙏 Formal",`Dear ${contactName||""},\n\nWishing you a very Happy Birthday! May this year bring you joy and success.\n\nWarm regards`],
              ].map(([l,m])=>(
                <button key={l} onClick={()=>setMessage(m)} style={{padding:"4px 10px",borderRadius:12,border:"none",cursor:"pointer",background:dark?"#374151":"#f3f4f6",color:dark?"#d1d5db":"#374151",fontSize:11,fontWeight:600}}>{l}</button>
              ))}
            </div>
          </div>
        )}

        <button onClick={save} style={{width:"100%",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",borderRadius:12,padding:14,fontWeight:800,fontSize:16,cursor:"pointer"}}>
          🔔 Save Reminder
        </button>
      </div>
    </div>
  );
}

// ── Reminder Card ─────────────────────────────────────────────────────────────
function ReminderCard({note,onEdit,onDismiss,dark}){
  const r=note.reminder;
  const emoji=r.type==="birthday"?"🎂":r.type==="anniversary"?"💍":r.type==="daily"?"🔁":r.type==="weekly"?"📅":"🔔";
  const card=dark?"#1f2937":"#fff";
  const textColor=dark?"#f9fafb":"#111";
  const subText=dark?"#9ca3af":"#6b7280";
  const countdown=daysUntilDate(r.date,r.type);

  return(
    <div style={{background:card,borderRadius:16,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,0.08)",border:`2px solid ${dark?"#4b5563":"#e9d5ff"}`}}>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:40,height:40,borderRadius:12,background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:textColor}}>{r.label}</div>
            <div style={{fontSize:12,color:subText}}>📅 {r.date} at {r.time}</div>
            {countdown&&<div style={{fontSize:12,fontWeight:700,color:"#7c3aed",marginTop:2}}>{countdown}</div>}
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>onEdit(note)} style={{background:dark?"#374151":"#f3f4f6",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:13}}>✏️</button>
            <button onClick={()=>onDismiss(note.id)} style={{background:dark?"#374151":"#f3f4f6",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:13,color:"#10b981",fontWeight:700}}>✓</button>
          </div>
        </div>
      </div>
      {r.phone&&(
        <button onClick={()=>window.open(`https://wa.me/${r.phone.replace(/[^0-9+]/g,"")}?text=${encodeURIComponent(r.message)}`,"_blank")}
          style={{width:"100%",background:"linear-gradient(135deg,#25d366,#128c7e)",color:"#fff",border:"none",padding:"10px",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          💬 Send WhatsApp to {r.contactName||r.phone}
        </button>
      )}
    </div>
  );
}

// ── Note Card ─────────────────────────────────────────────────────────────────
function NoteCard({note,dark,globalCopy,onEdit,onDelete,onPin,onCopy,onShare,onToggleItem}){
  const [expanded,setExpanded]=useState(false);
  const col=CAT_COLORS[note.category]||CAT_COLORS.Personal;
  const card=dark?"#1f2937":"#fff";
  const textColor=dark?"#f9fafb":"#111";
  const subText=dark?"#9ca3af":"#6b7280";
  const borderCol=dark?"#374151":"#f3f4f6";
  const doneCount=note.items.filter(i=>i.done).length;
  const totalCount=note.items.length;
  const isLong=note.type==="copy"?note.content.length>120:totalCount>4;

  return(
    <div style={{background:card,borderRadius:16,marginBottom:12,boxShadow:dark?"0 2px 10px rgba(0,0,0,0.3)":"0 2px 10px rgba(0,0,0,0.06)",border:note.pinned?"2px solid #818cf8":`2px solid ${borderCol}`,overflow:"hidden"}}>
      <div style={{padding:"14px 14px 10px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              {note.pinned&&<span style={{fontSize:12}}>📌</span>}
              {note.reminder?.active&&<span style={{fontSize:12}}>🔔</span>}
              <span style={{fontWeight:700,fontSize:15,color:textColor}}>{note.title}</span>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <span style={{background:dark?col.bgD:col.bg,color:dark?col.textD:col.text,borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:600}}>{note.category}</span>
              <span style={{background:note.type==="checklist"?(dark?"#500724":"#fce7f3"):(dark?"#2e1065":"#ede9fe"),color:note.type==="checklist"?(dark?"#f9a8d4":"#9d174d"):(dark?"#c4b5fd":"#5b21b6"),borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:600}}>
                {note.type==="checklist"?"☑️ Checklist":"📋 Copy"}
              </span>
            </div>
          </div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>onPin(note.id)} style={{background:note.pinned?"#ede9fe":dark?"#374151":"#f9fafb",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:14}}>📌</button>
            <button onClick={()=>onEdit(note)} style={{background:dark?"#374151":"#f9fafb",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:14}}>✏️</button>
            <button onClick={()=>onDelete(note.id)} style={{background:dark?"#450a0a":"#fff1f2",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:14}}>🗑️</button>
          </div>
        </div>
      </div>
      <div style={{padding:"0 14px 10px"}}>
        {note.type==="copy"?(
          <div>
            <div style={{background:dark?"#111827":"#f9fafb",borderRadius:10,padding:"10px 12px",fontSize:13,color:dark?"#d1d5db":"#374151",lineHeight:1.6,whiteSpace:"pre-wrap",maxHeight:expanded?280:"72px",overflowY:expanded?"auto":"hidden",transition:"max-height 0.3s"}}>
              {note.content||<span style={{color:"#9ca3af"}}>Empty note</span>}
            </div>
            {isLong&&<button onClick={()=>setExpanded(p=>!p)} style={{background:"none",border:"none",color:"#4f46e5",fontSize:12,fontWeight:700,cursor:"pointer",padding:"4px 0"}}>{expanded?"▲ Show less":"▼ Show more"}</button>}
          </div>
        ):(
          <div>
            {totalCount>0&&(
              <div style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:12,color:subText}}>Progress</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#4f46e5"}}>{doneCount}/{totalCount}</span>
                </div>
                <div style={{background:dark?"#374151":"#f3f4f6",borderRadius:8,height:6}}>
                  <div style={{height:"100%",borderRadius:8,transition:"width 0.3s",width:`${totalCount>0?(doneCount/totalCount)*100:0}%`,background:doneCount===totalCount?"#10b981":"#818cf8"}}/>
                </div>
              </div>
            )}
            <div style={{maxHeight:expanded?260:"140px",overflowY:expanded?"auto":"hidden",transition:"max-height 0.3s"}}>
              {note.items.map(item=>(
                <div key={item.id} onClick={()=>onToggleItem(note.id,item.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${borderCol}`,cursor:"pointer"}}>
                  <div style={{width:20,height:20,borderRadius:6,flexShrink:0,background:item.done?"#4f46e5":"transparent",border:item.done?"2px solid #4f46e5":`2px solid ${dark?"#4b5563":"#d1d5db"}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {item.done&&<span style={{color:"#fff",fontSize:11,fontWeight:800}}>✓</span>}
                  </div>
                  <span style={{fontSize:14,color:item.done?"#9ca3af":textColor,textDecoration:item.done?"line-through":"none"}}>{item.text}</span>
                </div>
              ))}
            </div>
            {isLong&&<button onClick={()=>setExpanded(p=>!p)} style={{background:"none",border:"none",color:"#4f46e5",fontSize:12,fontWeight:700,cursor:"pointer",padding:"4px 0"}}>{expanded?"▲ Show less":`▼ Show all ${totalCount} items`}</button>}
          </div>
        )}
      </div>
      <div style={{display:"flex"}}>
        {globalCopy&&<button onClick={()=>onCopy(note)} style={{flex:1,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",padding:"12px",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,borderRight:"1px solid rgba(255,255,255,0.2)"}}>📋 Copy</button>}
        <button onClick={()=>onShare(note)} style={{flex:1,background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",border:"none",padding:"12px",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>📤 Share</button>
      </div>
    </div>
  );
}

// ── Note Editor ───────────────────────────────────────────────────────────────
function NoteEditor({note,onSave,onClose,allNotes,dark,isNew}){
  const initType=note?.type||"copy";
  const [title,setTitle]=useState(isNew?getDefaultTitle(allNotes,initType):(note?.title||""));
  const [content,setContent]=useState(note?.content||"");
  const [type,setType]=useState(initType);
  const [category,setCategory]=useState(note?.category||"Personal");
  const [items,setItems]=useState(note?.items||[]);
  const [newItem,setNewItem]=useState("");
  const [showReminder,setShowReminder]=useState(note?._openReminder||false);
  const [reminder,setReminder]=useState(note?.reminder||null);
  useEffect(()=>{if(!note?.id)setTitle(getDefaultTitle(allNotes,type));},[type]);
  const addItem=()=>{if(!newItem.trim())return;setItems(p=>[...p,{id:Date.now(),text:newItem.trim(),done:false}]);setNewItem("");};
  const save=()=>onSave({id:isNew?Date.now():note?.id||Date.now(),title:title.trim()||getDefaultTitle(allNotes,type),content,type,category,items,pinned:note?.pinned||false,created:note?.created||Date.now(),reminder});
  const bg=dark?"#111827":"#fff";const textColor=dark?"#f9fafb":"#111";const borderCol=dark?"#374151":"#e5e7eb";const subText=dark?"#9ca3af":"#6b7280";

  return(
    <div style={{position:"fixed",inset:0,background:bg,zIndex:100,display:"flex",flexDirection:"column"}}>
      {showReminder&&<ReminderModal note={{title,reminder}} onSave={r=>{setReminder(r);setShowReminder(false);}} onClose={()=>setShowReminder(false)} dark={dark}/>}
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:`1px solid ${borderCol}`}}>
        <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:subText}}>←</button>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Note title..." style={{flex:1,border:"none",outline:"none",fontSize:17,fontWeight:700,color:textColor,fontFamily:"inherit",background:"transparent"}}/>
        <button onClick={()=>setShowReminder(true)} style={{background:reminder?"#4f46e5":dark?"#374151":"#f3f4f6",border:"none",borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:16}} title="Set Reminder">🔔</button>
        <button onClick={save} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:10,padding:"8px 18px",fontWeight:700,fontSize:14,cursor:"pointer"}}>Save</button>
      </div>
      {reminder&&(
        <div style={{background:"#ede9fe",padding:"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:"#5b21b6",fontWeight:600}}>🔔 {reminder.label} · {reminder.date} at {reminder.time}</span>
          <button onClick={()=>setReminder(null)} style={{background:"none",border:"none",color:"#9ca3af",cursor:"pointer",fontSize:16}}>×</button>
        </div>
      )}
      <div style={{flex:1,overflow:"auto",padding:16}}>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          {["copy","checklist"].map(t=>(
            <button key={t} onClick={()=>setType(t)} style={{padding:"7px 16px",borderRadius:20,border:"none",cursor:"pointer",background:type===t?"#4f46e5":dark?"#374151":"#f3f4f6",color:type===t?"#fff":subText,fontWeight:600,fontSize:13}}>
              {t==="copy"?"📋 Copy mode":"☑️ Checklist"}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
          {CATEGORIES.filter(c=>c!=="All").map(c=>{const col=CAT_COLORS[c];return<button key={c} onClick={()=>setCategory(c)} style={{padding:"5px 12px",borderRadius:20,border:"none",cursor:"pointer",background:category===c?col.dot:dark?col.bgD:col.bg,color:category===c?"#fff":dark?col.textD:col.text,fontWeight:600,fontSize:12}}>{c}</button>;})}
        </div>
        {type==="copy"
          ?<textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Write your note here..." rows={10} style={{width:"100%",boxSizing:"border-box",border:`2px solid ${borderCol}`,borderRadius:12,padding:14,fontSize:15,fontFamily:"inherit",resize:"vertical",outline:"none",color:textColor,lineHeight:1.6,background:dark?"#1f2937":"#fff"}}/>
          :<div>
            {items.map((item,idx)=>(
              <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${borderCol}`}}>
                <span style={{color:subText,fontSize:13,width:20,textAlign:"center"}}>{idx+1}</span>
                <input value={item.text} onChange={e=>setItems(p=>p.map(i=>i.id===item.id?{...i,text:e.target.value}:i))} style={{flex:1,border:"none",outline:"none",fontSize:15,fontFamily:"inherit",color:textColor,background:"transparent"}}/>
                <button onClick={()=>setItems(p=>p.filter(i=>i.id!==item.id))} style={{background:"none",border:"none",color:"#f87171",fontSize:18,cursor:"pointer"}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <input value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addItem()} placeholder="Add item..." style={{flex:1,border:`2px solid ${borderCol}`,borderRadius:10,padding:"10px 14px",fontSize:15,fontFamily:"inherit",outline:"none",color:textColor,background:dark?"#1f2937":"#fff"}}/>
              <button onClick={addItem} style={{background:"#4f46e5",color:"#fff",border:"none",borderRadius:10,padding:"10px 16px",fontSize:18,cursor:"pointer"}}>+</button>
            </div>
          </div>
        }
      </div>
    </div>
  );
}

// ── Import Popup ──────────────────────────────────────────────────────────────
function ImportPopup({note,onAdd,onDismiss,dark}){
  const col=CAT_COLORS[note.category]||CAT_COLORS.Personal;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:dark?"#1f2937":"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:360}}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <div style={{fontSize:48,marginBottom:8}}>📨</div>
          <h2 style={{margin:0,fontSize:20,fontWeight:800,color:dark?"#f9fafb":"#111"}}>Note Received!</h2>
        </div>
        <div style={{background:dark?col.bgD:col.bg,border:`2px solid ${col.dot}`,borderRadius:14,padding:16,marginBottom:20}}>
          <div style={{fontWeight:700,fontSize:15,color:dark?"#f9fafb":"#111",marginBottom:6}}>{note.title}</div>
          {note.type==="copy"?<div style={{fontSize:13,color:dark?"#d1d5db":"#374151",lineHeight:1.6,maxHeight:80,overflow:"hidden"}}>{note.content||"Empty"}</div>
            :<div>{note.items.slice(0,3).map((i,idx)=><div key={idx} style={{fontSize:13,color:dark?"#d1d5db":"#374151",padding:"2px 0"}}>○ {i.text}</div>)}{note.items.length>3&&<div style={{fontSize:12,color:"#9ca3af"}}>+{note.items.length-3} more...</div>}</div>}
        </div>
        <button onClick={onAdd} style={{width:"100%",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",border:"none",borderRadius:12,padding:14,fontWeight:800,fontSize:16,cursor:"pointer",marginBottom:10}}>➕ Add to My QuickNotes</button>
        <button onClick={onDismiss} style={{width:"100%",background:dark?"#374151":"#f3f4f6",color:dark?"#d1d5db":"#6b7280",border:"none",borderRadius:12,padding:12,fontWeight:600,fontSize:14,cursor:"pointer"}}>Just View It</button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function QuickNotes(){
  const [lockEnabled,setLockEnabled] =useState(()=>localStorage.getItem(LOCK_KEY)!=="false");
  const [locked,setLocked]           =useState(()=>localStorage.getItem(LOCK_KEY)!=="false");
  const [setupPin,setSetupPin]       =useState(!localStorage.getItem(PIN_KEY));
  const [dark,setDark]               =useState(()=>localStorage.getItem(DARK_KEY)==="true");
  const [notes,setNotes]             =useState(()=>{try{return JSON.parse(localStorage.getItem(NOTES_KEY))||SAMPLE_NOTES;}catch{return SAMPLE_NOTES;}});
  const [standaloneReminders,setStandaloneReminders]=useState(()=>{try{return JSON.parse(localStorage.getItem(REMINDERS_KEY))||[];}catch{return [];}});
  const [toast,setToast]             =useState(null);
  const [search,setSearch]           =useState("");
  const [activeCat,setActiveCat]     =useState("All");
  const [editing,setEditing]         =useState(null);
  const [isNew,setIsNew]             =useState(false);
  const [globalCopy,setGlobalCopy]   =useState(true);
  const [importNote,setImportNote]   =useState(null);
  const [showReminderPanel,setShowReminderPanel]=useState(false);
  const [quickReminder,setQuickReminder]=useState(false);
  const [editingStandaloneReminder,setEditingStandaloneReminder]=useState(null);
  const [fabOpen,setFabOpen]         =useState(false);
  const [showSettings,setShowSettings]=useState(false);

  useEffect(()=>{
    const p=new URLSearchParams(window.location.search);
    const s=p.get("note");
    if(s){const d=decodeNote(s);if(d)setImportNote(d);window.history.replaceState({},"",window.location.pathname);}
  },[]);
  useEffect(()=>{localStorage.setItem(NOTES_KEY,JSON.stringify(notes));},[notes]);
  useEffect(()=>{localStorage.setItem(REMINDERS_KEY,JSON.stringify(standaloneReminders));},[standaloneReminders]);
  useEffect(()=>{localStorage.setItem(DARK_KEY,dark);},[dark]);
  useEffect(()=>{localStorage.setItem(LOCK_KEY,lockEnabled);},[lockEnabled]);

  // Notifications
  useEffect(()=>{
    if("Notification"in window&&Notification.permission==="default")Notification.requestPermission();
    const checkOne=(r)=>{
      if(!r?.active||!r?.date)return;
      const [h,m]=(r.time||"23:58").split(":").map(Number);
      const target=new Date(r.date);
      target.setHours(h,m,0,0);
      const now=new Date();
      if(r.type==="birthday"||r.type==="anniversary"){
        target.setFullYear(now.getFullYear());
        if(target<=now)target.setFullYear(now.getFullYear()+1);
      }
      const diff=target-now;
      if(diff>0&&diff<60000){
        setTimeout(()=>{
          if(Notification.permission==="granted"){
            const n=new Notification(`${r.type==="birthday"?"🎂":"🔔"} ${r.label}`,{body:"Tap to send WhatsApp message",icon:"/icon.svg"});
            if(r.phone)n.onclick=()=>window.open(`https://wa.me/${r.phone.replace(/[^0-9+]/g,"")}?text=${encodeURIComponent(r.message)}`,"_blank");
          }
        },diff);
      }
    };
    const check=()=>{
      notes.forEach(note=>checkOne(note.reminder));
      standaloneReminders.forEach(r=>checkOne(r));
    };
    check();const interval=setInterval(check,30000);return()=>clearInterval(interval);
  },[notes,standaloneReminders]);

  const showToast=msg=>setToast(msg);
  const fallbackCopy=text=>{
    const ta=document.createElement("textarea");ta.value=text;ta.style.cssText="position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);ta.focus();ta.select();
    try{document.execCommand("copy");showToast("Copied!");}catch{showToast("Copy failed");}
    document.body.removeChild(ta);
  };
  const copyNote=note=>{
    const text=note.type==="checklist"?note.items.map(i=>`${i.done?"✓":"○"} ${i.text}`).join("\n"):note.content;
    if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(text).then(()=>showToast("Copied!")).catch(()=>fallbackCopy(text));
    else fallbackCopy(text);
  };
  const shareNote=async note=>{
    const encoded=encodeNote(note);
    const base=window.location.href.split("?")[0];
    const longUrl=encoded?`${base}?note=${encoded}`:null;
    const plainText=note.type==="checklist"?note.items.map(i=>`${i.done?"✓":"○"} ${i.text}`).join("\n"):note.content;
    let shareUrl=longUrl;
    if(longUrl){try{const r=await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);if(r.ok)shareUrl=await r.text();}catch{shareUrl=longUrl;}}
    if(navigator.share&&shareUrl){try{await navigator.share({title:note.title,text:`📋 ${note.title}\n\nTap to add to your QuickNotes 👇`,url:shareUrl});}catch(e){if(e.name!=="AbortError")fallbackCopy(shareUrl);}}
    else if(shareUrl){fallbackCopy(shareUrl);showToast("Link copied!");}
    else{fallbackCopy(plainText);showToast("Copied!");}
  };
  const addImportedNote=()=>{
    const n={...importNote,id:Date.now(),pinned:false,created:Date.now(),reminder:null,items:(importNote.items||[]).map(i=>({...i,done:false}))};
    setNotes(p=>[n,...p]);setImportNote(null);showToast(`"${n.title}" added!`);
  };
  const toggleItem=(nId,iId)=>setNotes(p=>p.map(n=>n.id===nId?{...n,items:n.items.map(i=>i.id===iId?{...i,done:!i.done}:i)}:n));
  const togglePin=id=>setNotes(p=>p.map(n=>n.id===id?{...n,pinned:!n.pinned}:n));
  const deleteNote=id=>setNotes(p=>p.filter(n=>n.id!==id));
  const dismissReminder=id=>{
    if(standaloneReminders.find(r=>r.id===id)){
      setStandaloneReminders(p=>p.filter(r=>r.id!==id));
    } else {
      setNotes(p=>p.map(n=>n.id===id?{...n,reminder:{...n.reminder,active:false}}:n));
    }
  };
  const editReminder=(item)=>{
    if(item._standalone){
      setShowReminderPanel(false);
      setEditingStandaloneReminder(item);
    } else {
      setShowReminderPanel(false);
      setEditing(item);
      setIsNew(false);
    }
  };
  const saveNote=note=>{setNotes(p=>p.find(n=>n.id===note.id)?p.map(n=>n.id===note.id?note:n):[note,...p]);setEditing(null);};

  const noteReminders=notes.filter(n=>n.reminder?.active);
  const activeReminders=[...standaloneReminders.map(r=>({id:r.id,title:r.label,reminder:r,_standalone:true})),...noteReminders];
  const reminderCount=activeReminders.length;
  const filtered=notes
    .filter(n=>activeCat==="All"||n.category===activeCat)
    .filter(n=>!search||n.title.toLowerCase().includes(search.toLowerCase())||n.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
  const bg=dark?"#111827":"#f5f3ff";
  const card=dark?"#1f2937":"#fff";
  const subText=dark?"#9ca3af":"#6b7280";

  if(locked&&lockEnabled)return<PinScreen isSetup={setupPin} onUnlock={()=>{setLocked(false);setSetupPin(false);}}/>;
  if(showSettings)return<SettingsScreen onClose={()=>setShowSettings(false)} dark={dark} setDark={setDark} lockEnabled={lockEnabled} setLockEnabled={setLockEnabled} globalCopy={globalCopy} setGlobalCopy={setGlobalCopy} notes={notes} setNotes={setNotes} reminderCount={reminderCount}/>;
  if(editingStandaloneReminder)return<ReminderModal note={{title:editingStandaloneReminder.title,reminder:editingStandaloneReminder.reminder}} dark={dark}
    onClose={()=>setEditingStandaloneReminder(null)}
    onSave={r=>{
      setStandaloneReminders(p=>p.map(x=>x.id===editingStandaloneReminder.id?{...x,...r}:x));
      setEditingStandaloneReminder(null);
      showToast("Reminder updated!");
    }}/>;
  if(editing!==null)return<NoteEditor note={editing} onSave={saveNote} onClose={()=>setEditing(null)} allNotes={notes} dark={dark} isNew={isNew}/>;

  return(
    <div style={{minHeight:"100vh",background:bg,fontFamily:"'Inter','Segoe UI',sans-serif",transition:"background 0.3s"}}>
      {importNote&&<ImportPopup note={importNote} onAdd={addImportedNote} onDismiss={()=>setImportNote(null)} dark={dark}/>}

      {/* Quick Reminder — opens directly */}
      {quickReminder&&<ReminderModal
        note={{title:"New Reminder",reminder:null}}
        dark={dark}
        onClose={()=>setQuickReminder(false)}
        onSave={r=>{
          const newReminder={id:Date.now(),...r,active:true};
          setStandaloneReminders(p=>[newReminder,...p]);
          setQuickReminder(false);
          showToast(`Reminder "${r.label}" saved!`);
        }}
      />}

      {/* Reminder Panel */}
      {showReminderPanel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:150,display:"flex",alignItems:"flex-end"}} onClick={()=>setShowReminderPanel(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:dark?"#1f2937":"#fff",borderRadius:"20px 20px 0 0",padding:20,width:"100%",maxHeight:"75vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{margin:0,fontSize:18,fontWeight:800,color:dark?"#f9fafb":"#111"}}>🔔 Reminders ({reminderCount})</h3>
              <button onClick={()=>setShowReminderPanel(false)} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",color:"#9ca3af"}}>×</button>
            </div>
            <button onClick={()=>{setShowReminderPanel(false);setQuickReminder(true);}}
              style={{width:"100%",background:"linear-gradient(135deg,#f59e0b,#ef4444)",color:"#fff",border:"none",borderRadius:12,padding:"12px",fontWeight:700,fontSize:15,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              ➕ Create New Reminder
            </button>
            {reminderCount===0
              ?<div style={{textAlign:"center",padding:"20px 0",color:subText}}>
                  <div style={{fontSize:40,marginBottom:8}}>🔔</div>
                  <div style={{fontWeight:600}}>No reminders yet</div>
                  <div style={{fontSize:13,marginTop:4}}>Tap "Create New Reminder" above</div>
                </div>
              :activeReminders.map(item=><ReminderCard key={item.id} note={item} onEdit={editReminder} onDismiss={dismissReminder} dark={dark}/>)
            }
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b 0%,#3730a3 70%,#4f46e5 100%)",padding:"16px 16px 12px",position:"sticky",top:0,zIndex:50}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <h1 style={{color:"#fff",margin:0,fontSize:20,fontWeight:800}}>📋 QuickNotes</h1>
            <p style={{color:"#a5b4fc",margin:0,fontSize:11}}>{notes.length} notes · {reminderCount} reminders</p>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setShowReminderPanel(true)} style={{position:"relative",background:"rgba(255,255,255,0.15)",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
              🔔
              {reminderCount>0&&<span style={{position:"absolute",top:6,right:6,background:"#ef4444",borderRadius:"50%",width:8,height:8}}/>}
            </button>
            <button onClick={()=>setDark(p=>!p)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{dark?"☀️":"🌙"}</button>
            <button onClick={()=>setShowSettings(true)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙️</button>
          </div>
        </div>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notes..." style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,padding:"9px 14px 9px 34px",color:"#fff",fontSize:14,outline:"none",fontFamily:"inherit"}}/>
        </div>
      </div>

      {/* Categories */}
      <div style={{display:"flex",gap:8,padding:"10px 16px",overflowX:"auto"}}>
        {CATEGORIES.map(c=>{
          const col=CAT_COLORS[c];
          const count=c==="All"?notes.length:notes.filter(n=>n.category===c).length;
          return<button key={c} onClick={()=>setActiveCat(c)} style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",whiteSpace:"nowrap",background:activeCat===c?col.dot:card,color:activeCat===c?"#fff":dark?col.textD:col.text,fontWeight:600,fontSize:12,boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
            {c}{count>0&&<span style={{opacity:0.7}}> ({count})</span>}
          </button>;
        })}
      </div>

      {/* Feed */}
      <div style={{padding:"0 16px 110px"}}>
        {activeReminders.length>0&&(
          <>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{flex:1,height:1,background:dark?"#374151":"#e9d5ff"}}/>
              <span style={{fontSize:11,fontWeight:700,color:"#7c3aed",textTransform:"uppercase",letterSpacing:1}}>🔔 Reminders</span>
              <div style={{flex:1,height:1,background:dark?"#374151":"#e9d5ff"}}/>
            </div>
            {activeReminders.map(item=><ReminderCard key={item.id} note={item} onEdit={editReminder} onDismiss={dismissReminder} dark={dark}/>)}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:4}}>
              <div style={{flex:1,height:1,background:dark?"#374151":"#e5e7eb"}}/>
              <span style={{fontSize:11,fontWeight:700,color:subText,textTransform:"uppercase",letterSpacing:1}}>📋 Notes</span>
              <div style={{flex:1,height:1,background:dark?"#374151":"#e5e7eb"}}/>
            </div>
          </>
        )}
        {filtered.length===0&&activeReminders.length===0
          ?<div style={{textAlign:"center",padding:"60px 20px",color:subText}}>
              <div style={{fontSize:48,marginBottom:12}}>📝</div>
              <div style={{fontWeight:600}}>No notes yet</div>
              <div style={{fontSize:13}}>Tap + to create your first note</div>
            </div>
          :filtered.map(note=><NoteCard key={note.id} note={note} dark={dark} globalCopy={globalCopy}
              onEdit={n=>{setEditing(n);setIsNew(false);}} onDelete={deleteNote} onPin={togglePin}
              onCopy={copyNote} onShare={shareNote} onToggleItem={toggleItem}/>)
        }
      </div>

      <AdBanner dark={dark}/>

      {/* FAB Menu */}
      {fabOpen&&<div style={{position:"fixed",inset:0,zIndex:88}} onClick={()=>setFabOpen(false)}/>}
      {fabOpen&&(
        <div style={{position:"fixed",bottom:132,right:20,zIndex:89,display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{background:"rgba(0,0,0,0.75)",color:"#fff",padding:"6px 12px",borderRadius:20,fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>📝 New Note</span>
            <button onClick={()=>{setFabOpen(false);setEditing({type:"copy"});setIsNew(true);}} style={{width:48,height:48,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",fontSize:22,cursor:"pointer",boxShadow:"0 4px 14px rgba(79,70,229,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>📝</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{background:"rgba(0,0,0,0.75)",color:"#fff",padding:"6px 12px",borderRadius:20,fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>☑️ New Checklist</span>
            <button onClick={()=>{setFabOpen(false);setEditing({type:"checklist",items:[],content:"",category:"Personal",pinned:false});setIsNew(true);}} style={{width:48,height:48,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",fontSize:22,cursor:"pointer",boxShadow:"0 4px 14px rgba(5,150,105,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>☑️</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{background:"rgba(0,0,0,0.75)",color:"#fff",padding:"6px 12px",borderRadius:20,fontSize:13,fontWeight:600,whiteSpace:"nowrap"}}>🔔 New Reminder</span>
            <button onClick={()=>{setFabOpen(false);setQuickReminder(true);}} style={{width:48,height:48,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#f59e0b,#ef4444)",color:"#fff",fontSize:22,cursor:"pointer",boxShadow:"0 4px 14px rgba(245,158,11,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>🔔</button>
          </div>
        </div>
      )}
      <button onClick={()=>setFabOpen(p=>!p)} style={{position:"fixed",bottom:64,right:20,width:56,height:56,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",fontSize:28,cursor:"pointer",boxShadow:"0 4px 20px rgba(79,70,229,0.5)",display:"flex",alignItems:"center",justifyContent:"center",transition:"transform 0.2s",transform:fabOpen?"rotate(45deg)":"rotate(0deg)",zIndex:90}}>+</button>

      {toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}
