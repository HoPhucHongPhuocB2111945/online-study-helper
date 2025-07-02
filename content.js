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
      background:#fffbe7;border:1px solid #bbb;padding:10px;border-radius:8px;
      box-shadow:0 2px 8px #0002;max-width:320px;
    `;
    box.innerHTML = `
      <div id="studymate-notes-list" style="max-height:120px;overflow:auto;margin-bottom:8px;"></div>
      <textarea id="studymate-note" placeholder="Thêm ghi chú mới..." style="width:100%;height:50px;border-radius:4px;border:1px solid #ccc;padding:4px;resize:vertical"></textarea>
      <div style="margin-top:6px;text-align:right">
        <button id="studymate-add-note" style="padding:4px 10px;border-radius:4px;border:1px solid #888;background:#ffe066;cursor:pointer">Thêm ghi chú</button>
      </div>
    `;
    document.body.appendChild(box);

    // Hiển thị danh sách ghi chú
    function renderNotes() {
      chrome.storage.local.get('notesList', data => {
        const notes = data.notesList || [];
        const listDiv = document.getElementById('studymate-notes-list');
        if (!listDiv) return;
        if (!notes.length) {
          listDiv.innerHTML = '<i>Chưa có ghi chú nào.</i>';
          return;
        }
        listDiv.innerHTML = notes.map((note, idx) => `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <span class="studymate-note-item" data-idx="${idx}" style="word-break:break-word;max-width:180px;cursor:pointer;">${note}</span>
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
        // Gắn sự kiện sửa
        listDiv.querySelectorAll('.studymate-note-item').forEach(span => {
          span.onclick = () => {
            const idx = Number(span.dataset.idx);
            const input = document.createElement('input');
            input.type = 'text';
            input.value = notes[idx];
            input.style = "width:90%;font-size:14px;padding:2px 4px;border-radius:3px;border:1px solid #bbb";
            span.replaceWith(input);
            input.focus();
            input.onblur = () => renderNotes();
            input.onkeydown = (e) => {
              if (e.key === 'Enter') {
                notes[idx] = input.value.trim();
                chrome.storage.local.set({notesList: notes}, renderNotes);
              }
              if (e.key === 'Escape') renderNotes();
            };
          };
        });
      });
    }

    renderNotes();

    // Thêm ghi chú mới
    document.getElementById('studymate-add-note').onclick = () => {
      const v = document.getElementById('studymate-note').value.trim();
      if (!v) return;
      chrome.storage.local.get('notesList', data => {
        const notes = data.notesList || [];
        notes.push(v);
        chrome.storage.local.set({notesList: notes}, () => {
          document.getElementById('studymate-note').value = '';
          renderNotes();
        });
      });
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