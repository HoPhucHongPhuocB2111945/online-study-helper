// Tổng hợp chức năng
const status = msg => document.getElementById('status').innerText = msg;

// Đọc style từ storage khi mở popup
chrome.storage.local.get(['studymate_theme','studymate_font','studymate_border'], data => {
  if (data.studymate_theme) document.getElementById('popup-theme').value = data.studymate_theme;
  if (data.studymate_font) document.getElementById('popup-font').value = data.studymate_font;
  if (data.studymate_border) document.getElementById('popup-border').value = data.studymate_border;
  applyStyle();
});

// Lưu style vào storage
function saveStyle() {
  chrome.storage.local.set({
    studymate_theme: document.getElementById('popup-theme').value,
    studymate_font: document.getElementById('popup-font').value,
    studymate_border: document.getElementById('popup-border').value
  });
}

// Áp dụng style cho popup
function applyStyle() {
  const theme = document.getElementById('popup-theme').value;
  const font = document.getElementById('popup-font').value;
  const border = document.getElementById('popup-border').value;
  document.body.style.fontFamily = font;
  document.body.style.borderColor = border;
  document.querySelector('textarea').style.borderColor = border;
  switch (theme) {
    case "dark":
      document.body.style.background = "#23272f";
      document.body.style.color = "#eee";
      document.querySelector('textarea').style.background = "#23272f";
      document.querySelector('textarea').style.color = "#eee";
      break;
    case "blue":
      document.body.style.background = "#e3f0ff";
      document.body.style.color = "#1a237e";
      document.querySelector('textarea').style.background = "#e3f0ff";
      document.querySelector('textarea').style.color = "#1a237e";
      break;
    case "pink":
      document.body.style.background = "#ffe3f0";
      document.body.style.color = "#ad1457";
      document.querySelector('textarea').style.background = "#ffe3f0";
      document.querySelector('textarea').style.color = "#ad1457";
      break;
    default:
      document.body.style.background = "#fffbe7";
      document.body.style.color = "#222";
      document.querySelector('textarea').style.background = "#fff";
      document.querySelector('textarea').style.color = "#222";
  }
}

// Sự kiện thay đổi style
document.getElementById('popup-theme').onchange = () => { applyStyle(); saveStyle(); };
document.getElementById('popup-font').onchange = () => { applyStyle(); saveStyle(); };
document.getElementById('popup-border').oninput = () => { applyStyle(); saveStyle(); };

// Tìm kiếm ghi chú và chỉ xem ghi chú đã ghim
let showOnlyPin = false;
let searchText = "";

document.getElementById('popup-search').oninput = e => {
  searchText = e.target.value.trim().toLowerCase();
  renderNotes();
};
document.getElementById('popup-show-pin').onclick = () => {
  showOnlyPin = !showOnlyPin;
  document.getElementById('popup-show-pin').style.background = showOnlyPin ? "#ffd700" : "#ffe066";
  renderNotes();
};

// Hiển thị danh sách ghi chú (lọc theo pin và tìm kiếm, thao tác đúng index gốc)
function renderNotes() {
  chrome.storage.local.get('notesList', data => {
    let notes = data.notesList || [];
    notes = notes.map(n => typeof n === 'object' ? n : {text: n, time: '', pin: false});
    // mapping: index gốc
    let mapping = notes.map((_, i) => i);
    if (showOnlyPin) mapping = mapping.filter(i => notes[i].pin);
    if (searchText) mapping = mapping.filter(i => (notes[i].text || "").toLowerCase().includes(searchText));
    mapping.sort((a, b) => (notes[b].pin ? 1 : 0) - (notes[a].pin ? 1 : 0));
    const listDiv = document.getElementById('notes-list');
    if (!mapping.length) {
      listDiv.innerHTML = '<i>Chưa có ghi chú nào.</i>';
      return;
    }
    listDiv.innerHTML = mapping.map(realIdx => {
      const note = notes[realIdx];
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <span class="studymate-note-item" data-idx="${realIdx}" style="word-break:break-word;max-width:150px;cursor:pointer;">
            ${note.text}
            <span style="color:#aaa;font-size:11px;">${note.time ? ' ('+note.time+')' : ''}</span>
          </span>
          <div>
            <button class="studymate-pin-btn" data-idx="${realIdx}" title="Ghim/Bỏ ghim" style="margin-right:4px;border:none;background:none;cursor:pointer;font-size:16px;">${note.pin ? "📌" : "📍"}</button>
            <button data-idx="${realIdx}" style="color:#fff;background:#e74c3c;border:none;border-radius:3px;padding:2px 7px;cursor:pointer;">X</button>
          </div>
        </div>
      `;
    }).join('');
    // Gắn sự kiện xóa
    listDiv.querySelectorAll('button[data-idx]:not(.studymate-pin-btn)').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        notes.splice(idx, 1);
        chrome.storage.local.set({notesList: notes}, renderNotes);
      };
    });
    // Gắn sự kiện pin
    listDiv.querySelectorAll('.studymate-pin-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        notes[idx].pin = !notes[idx].pin;
        chrome.storage.local.set({notesList: notes}, renderNotes);
      };
    });
    // Gắn sự kiện sửa
    listDiv.querySelectorAll('.studymate-note-item').forEach(span => {
      span.onclick = () => {
        const idx = Number(span.dataset.idx);
        const input = document.createElement('input');
        input.type = 'text';
        input.value = notes[idx].text;
        input.style = "width:90%;font-size:14px;padding:2px 4px;border-radius:3px;border:1px solid #bbb";
        span.replaceWith(input);
        input.focus();
        input.onblur = () => renderNotes();
        input.onkeydown = (e) => {
          if (e.key === 'Enter') {
            notes[idx].text = input.value.trim();
            chrome.storage.local.set({notesList: notes}, renderNotes);
          }
          if (e.key === 'Escape') renderNotes();
        };
      };
    });
  });
}

// Xuất ghi chú ra file TXT
document.getElementById('popup-export').onclick = () => {
  chrome.storage.local.get('notesList', data => {
    const notes = data.notesList || [];
    const txt = notes.map(n => {
      let text = n.text || n;
      let time = n.time ? ` (${n.time})` : '';
      let pin = n.pin ? " [GHIM]" : "";
      return `${text}${time}${pin}`;
    }).join('\n');
    const blob = new Blob([txt], {type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "studymate_notes.txt";
    a.click(); URL.revokeObjectURL(url);
  });
};

// Hiển thị ghi chú khi mở popup
renderNotes();

// Lưu ghi chú mới (có pin, thời gian, nhắc nhở)
document.getElementById('saveNote').onclick = () => {
  const v = document.getElementById('note').value.trim();
  const remind = parseInt(document.getElementById('popup-remind')?.value, 10);
  if (!v) return status("Vui lòng nhập ghi chú!");
  chrome.storage.local.get('notesList', data => {
    const notes = data.notesList || [];
    const noteObj = {
      text: v,
      time: new Date().toLocaleString(),
      pin: false
    };
    notes.push(noteObj);
    chrome.storage.local.set({notesList: notes}, () => {
      document.getElementById('note').value = '';
      if(document.getElementById('popup-remind')) document.getElementById('popup-remind').value = '';
      status("✅ Đã lưu ghi chú!");
      renderNotes();
      // Đặt nhắc nhở nếu có nhập số phút
      if (!isNaN(remind) && remind > 0 && chrome.notifications) {
        setTimeout(() => {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon16.png",
            title: "Nhắc ghi chú",
            message: v
          });
        }, remind * 60000);
      }
    });
  });
};

document.getElementById('saveWordBtn').onclick = ()=>{
  chrome.tabs.query({active:true,currentWindow:true}, tabs=>{
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      func: ()=>window.getSelection().toString().trim()
    }, sel=>{
      const w = sel[0]?.result?.trim();
      if(!w) return;
      chrome.storage.local.get('words', d=>{
        const arr = d.words||[];
        if (!arr.includes(w)) arr.push(w);
        chrome.storage.local.set({words:arr}, ()=>status("✅ Lưu từ: "+w));
      });
    });
  });
};

document.getElementById('export').onclick = () => {
  chrome.storage.local.get(['notesList','words'], d => {
    const notesText = (d.notesList || []).map((n,i)=>{
      let text = n.text || n;
      let time = n.time ? ` (${n.time})` : '';
      return `${i+1}. ${text}${time}`;
    }).join('\n');
    const blob = new Blob([
      "Ghi chú:\n" + notesText + "\n\nTừ đã lưu:\n" + (d.words||[]).join(", ")
    ], {type:"text/plain"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = "studymate_export.txt";
    a.click(); URL.revokeObjectURL(url);

    // Xóa sau khi export
    chrome.storage.local.set({words: [], notesList: []}, () => {
      status("✅ Đã xuất và xóa ghi chú & từ!");
      renderNotes && renderNotes();
    });
  });
};

document.getElementById('toggleSocial').onclick = () => {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "toggle_social"});
  });
};