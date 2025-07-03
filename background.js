chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ notesList: [], words: [], studymate_darkmode: false });
});