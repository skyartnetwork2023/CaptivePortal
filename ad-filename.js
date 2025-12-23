// Extract and display image file names for each .ad-card

function extractAdFilenames() {
  document.querySelectorAll('.ad-card').forEach(function(card) {
    // Try to get background-image from inline style or computed style
    let bg = card.style.backgroundImage;
    if (!bg) {
      bg = window.getComputedStyle(card).backgroundImage;
    }
    let fileName = '';
    if (bg && bg !== 'none') {
      // Extract URL from background-image: url("...")
      const match = bg.match(/url\(["']?(.*?)(["']?)\)/);
      if (match && match[1]) {
        const url = match[1];
        fileName = url.split('/').pop().split('?')[0];
      }
    }
    if (fileName) {
      // Create a wrapper if not present
      let wrapper = card.parentElement;
      if (!wrapper.classList.contains('ad-card-wrap')) {
        wrapper = document.createElement('div');
        wrapper.className = 'ad-card-wrap';
        card.parentElement.insertBefore(wrapper, card);
        wrapper.appendChild(card);
      }
      // Remove any previous filename display
      let prev = wrapper.querySelector('.ad-filename');
      if (prev) prev.remove();
      // Add filename below card
      const fileElem = document.createElement('div');
      fileElem.className = 'ad-filename';
      fileElem.textContent = fileName;
      fileElem.style = 'text-align:center; color:#fff; font-size:0.95rem; margin-top:0.5rem; word-break:break-all;';
      wrapper.appendChild(fileElem);
    }
  });
}

// Optionally, expose globally
window.extractAdFilenames = extractAdFilenames;
