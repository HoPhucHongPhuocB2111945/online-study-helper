// ==UserScript==
// @name         Studymate
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Tra từ điển và ghi chú
// @author       You
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // Tra từ & popup khi highlight
  document.addEventListener('mouseup', async (e) => {
    const text = window.getSelection().toString().trim();
    if (!text) return;

    document.getElementById('studymate-popup')?.remove();

    // Lấy nghĩa từ Wikipedia (ưu tiên en, sau đó vi)
    async function getWikiExtract(lang, keyword) {
      return fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyword)}`)
        .then(r => r.json())
        .then(d => d.extract)
        .catch(() => null);
    }

    let mean = await getWikiExtract('en', text);
    if (!mean) mean = await getWikiExtract('en', text.charAt(0).toUpperCase() + text.slice(1));
    if (!mean) mean = await getWikiExtract('vi', text);
    if (!mean) mean = await getWikiExtract('vi', text.charAt(0).toUpperCase() + text.slice(1));
    if (!mean) mean = "Không tìm thấy trên Wikipedia.";

    const popup = document.createElement("div");
    popup.id = "studymate-popup";
    popup.innerText = `${text}: ${mean}`;
    Object.assign(popup.style, {
      position: "absolute", top: `${e.pageY+10}px`, left: `${e.pageX+10}px`,
      background: "#ffffcc", padding: "8px", border: "1px solid #999",
      borderRadius: "6px", fontSize: "14px", maxWidth: "350px", zIndex: 9999
    });
    document.body.appendChild(popup);
    setTimeout(()=>popup.remove(), 7000);
  });

  // Thêm nút và textarea ghi chú vào cuối trang
  function createNoteBox() {
    if (document.getElementById('studymate-note-box')) return;
    const box = document.createElement('div');
    box.id = 'studymate-note-box';
    box.style = `
      position:fixed;bottom:20px;right:20px;z-index:99999;
      background:#fffbe7;border:2px solid #bbb;padding:10px;border-radius:10px;
      box-shadow:0 2px 8px #0002;max-width:340px;font-family:sans-serif;
      transition:background 0.2s,color 0.2s,border 0.2s;
    `;
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:6px;">
        <span style="font-weight:bold;">Ghi chú</span>
        <select id="studymate-theme" style="border-radius:4px;">
          <option value="light">Sáng</option>
          <option value="dark">Tối</option>
          <option value="blue">Xanh</option>
          <option value="pink">Hồng</option>
        </select>
        <select id="studymate-font" style="border-radius:4px;">
          <option value="sans-serif">Sans</option>
          <option value="serif">Serif</option>
          <option value="monospace">Mono</option>
        </select>
        <input id="studymate-border" type="color" value="#bbbbbb" title="Màu viền" style="width:28px;height:28px;padding:0;border:none;background:none;">
      </div>
      <div id="studymate-notes-list" style="max-height:120px;overflow:auto;margin-bottom:8px;"></div>
      <textarea id="studymate-note" placeholder="Thêm ghi chú mới..." style="width:100%;height:50px;border-radius:4px;border:1.5px solid #ccc;padding:4px;resize:vertical"></textarea>
      <input id="studymate-remind" type="number" min="0" placeholder="Nhắc sau (phút)" style="width:120px;margin:4px 0 0 0;border-radius:4px;border:1px solid #ccc;padding:3px 6px;font-size:13px;">
      <div style="margin-top:6px;text-align:right">
        <button id="studymate-add-note" style="padding:4px 10px;border-radius:4px;border:1px solid #888;background:#ffe066;cursor:pointer">Thêm ghi chú</button>
      </div>
    `;
    document.body.appendChild(box);

    // Lưu theme/font/border vào storage
    function saveStyle() {
      chrome.storage.local.set({
        studymate_theme: document.getElementById('studymate-theme').value,
        studymate_font: document.getElementById('studymate-font').value,
        studymate_border: document.getElementById('studymate-border').value
      });
    }

    // Áp dụng theme/font/border
    function applyStyle() {
      const theme = document.getElementById('studymate-theme').value;
      const font = document.getElementById('studymate-font').value;
      const border = document.getElementById('studymate-border').value;
      box.style.fontFamily = font;
      box.style.borderColor = border;
      box.querySelector('textarea').style.borderColor = border;
      switch (theme) {
        case "dark":
          box.style.background = "#23272f";
          box.style.color = "#eee";
          box.querySelector('textarea').style.background = "#23272f";
          box.querySelector('textarea').style.color = "#eee";
          break;
        case "blue":
          box.style.background = "#e3f0ff";
          box.style.color = "#1a237e";
          box.querySelector('textarea').style.background = "#e3f0ff";
          box.querySelector('textarea').style.color = "#1a237e";
          break;
        case "pink":
          box.style.background = "#ffe3f0";
          box.style.color = "#ad1457";
          box.querySelector('textarea').style.background = "#ffe3f0";
          box.querySelector('textarea').style.color = "#ad1457";
          break;
        default:
          box.style.background = "#fffbe7";
          box.style.color = "#222";
          box.querySelector('textarea').style.background = "#fff";
          box.querySelector('textarea').style.color = "#222";
      }
    }

    // Đọc style từ storage khi tạo NoteBox
    chrome.storage.local.get(['studymate_theme','studymate_font','studymate_border'], data => {
      if (data.studymate_theme) document.getElementById('studymate-theme').value = data.studymate_theme;
      if (data.studymate_font) document.getElementById('studymate-font').value = data.studymate_font;
      if (data.studymate_border) document.getElementById('studymate-border').value = data.studymate_border;
      applyStyle();
    });

    document.getElementById('studymate-theme').onchange = () => { applyStyle(); saveStyle(); };
    document.getElementById('studymate-font').onchange = () => { applyStyle(); saveStyle(); };
    document.getElementById('studymate-border').oninput = () => { applyStyle(); saveStyle(); };

    // Hiển thị danh sách ghi chú (có pin)
    function renderNotes() {
      chrome.storage.local.get('notesList', data => {
        let notes = data.notesList || [];
        // Đảm bảo mỗi ghi chú là object
        notes = notes.map(n => typeof n === 'object' ? n : {text: n, time: '', pin: false});
        // Sắp xếp: pin=true lên đầu
        notes.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0));
        const listDiv = document.getElementById('studymate-notes-list');
        if (!listDiv) return;
        if (!notes.length) {
          listDiv.innerHTML = '<i>Chưa có ghi chú nào.</i>';
          return;
        }
        listDiv.innerHTML = notes.map((note, idx) => `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <span class="studymate-note-item" data-idx="${idx}" style="word-break:break-word;max-width:150px;cursor:pointer;">
              ${note.text}
              <span style="color:#aaa;font-size:11px;">${note.time ? ' ('+note.time+')' : ''}</span>
            </span>
            <div>
              <button class="studymate-pin-btn" data-idx="${idx}" title="Ghim/Bỏ ghim" style="margin-right:4px;border:none;background:none;cursor:pointer;font-size:16px;">${note.pin ? "📌" : "📍"}</button>
              <button data-idx="${idx}" style="color:#fff;background:#e74c3c;border:none;border-radius:3px;padding:2px 7px;cursor:pointer;">X</button>
            </div>
          </div>
        `).join('');
        // Gắn sự kiện xóa
        listDiv.querySelectorAll('button[data-idx]:not(.studymate-pin-btn)').forEach(btn => {
          btn.onclick = () => {
            notes.splice(Number(btn.dataset.idx), 1);
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

    renderNotes();

    // Thêm ghi chú mới (có pin và nhắc nhở)
    document.getElementById('studymate-add-note').onclick = () => {
      const v = document.getElementById('studymate-note').value.trim();
      const remind = parseInt(document.getElementById('studymate-remind').value, 10);
      if (!v) return;
      chrome.storage.local.get('notesList', data => {
        const notes = data.notesList || [];
        const noteObj = {
          text: v,
          time: new Date().toLocaleString(),
          pin: false
        };
        notes.push(noteObj);
        chrome.storage.local.set({notesList: notes}, () => {
          document.getElementById('studymate-note').value = '';
          document.getElementById('studymate-remind').value = '';
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
      };
    };
  }

  // Tạo nút ghi chú khi bấm Ctrl+Shift+N
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
      createNoteBox();
    }
  });

  // Hoặc tự động hiện ghi chú khi vào trang
  createNoteBox();
})();