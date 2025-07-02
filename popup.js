// Tổng hợp chức năng
const status = msg => document.getElementById('status').innerText = msg;

// Hiển thị danh sách ghi chú
function renderNotes() {
  chrome.storage.local.get('notesList', data => {
    const notes = data.notesList || [];
    const listDiv = document.getElementById('notes-list');
    if (!notes.length) {
      listDiv.innerHTML = '<i>Chưa có ghi chú nào.</i>';
      return;
    }
    listDiv.innerHTML = notes.map((note, idx) => `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="word-break:break-word;max-width:200px;">${note}</span>
        <button data-idx="${idx}" style="margin-left:8px;color:#fff;background:#e74c3c;border:none;border-radius:3px;padding:2px 7px;cursor:pointer;">X</button>
      </div>
    `).join('');
    // Gắn sự kiện xóa
    listDiv.querySelectorAll('button[data-idx]').forEach(btn => {
      btn.onclick = () => {
        notes.splice(Number(btn.dataset.idx), 1);
        chrome.storage.local.set({notesList: notes}, renderNotes);
      };
    });
  });
}

// Lưu ghi chú mới
document.getElementById('saveNote').onclick = () => {
  const v = document.getElementById('note').value.trim();
  if (!v) return status("Vui lòng nhập ghi chú!");
  chrome.storage.local.get('notesList', data => {
    const notes = data.notesList || [];
    notes.push(v);
    chrome.storage.local.set({notesList: notes}, () => {
      document.getElementById('note').value = '';
      status("✅ Đã lưu ghi chú!");
      renderNotes();
    });
  });
};

// Hiển thị ghi chú khi mở popup
renderNotes();

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
    const notesText = (d.notesList || []).map((n,i)=>`${i+1}. ${n}`).join('\n');
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
      renderNotes && renderNotes(); // Nếu có hàm renderNotes thì cập nhật lại giao diện
    });
  });
};

document.getElementById('toggleSocial').onclick = () => {
  chrome.tabs.query({active: true, currentWindow: true}, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "toggle_social"});
  });
};