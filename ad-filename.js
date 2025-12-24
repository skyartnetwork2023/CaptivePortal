document.addEventListener('DOMContentLoaded', function() {
  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    console.error('Supabase library not loaded!');
    return;
  }

  // Initialize Supabase client if not already defined
  if (typeof window.supabaseClientForAds === 'undefined') {
    const SUPABASE_URL = 'https://bcuupjvxpjaelpmcldnh.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_-U9QwYC4h11W2ITt7NHyQg_XVnkfu8d';
    window.supabaseClientForAds = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  const supabaseClient = window.supabaseClientForAds;

  let mediaFiles = [];
  let currentIndex = 0;

  // Function to fetch media files from Supabase storage
  async function fetchMedia() {
    if (!supabaseClient || typeof supabaseClient.storage === 'undefined') {
      console.error('Supabase client is not initialized properly:', supabaseClient);
      return [];
    }
    try {
      const { data, error } = await supabaseClient.storage.from('media-bucket').list('');
      if (error) {
        console.error('Error fetching media:', error);
        return [];
      }
      // Filter out folders and only allow video/image files
      return (data || []).filter(file => file && file.name && (file.name.match(/\.(mp4|png|jpg|jpeg|gif)$/i)));
    } catch (err) {
      console.error('Unexpected error fetching media:', err);
      return [];
    }
  }

  function showMedia(index) {
    const container = document.getElementById('medium-rectangle');
    if (!container) {
      console.error('Element with ID "medium-rectangle" not found in the DOM.');
      return;
    }
    container.innerHTML = '';
    if (!mediaFiles.length) {
      container.innerHTML = '<p>No media available</p>';
      return;
    }
    const file = mediaFiles[index];
    const isVideo = file.name.match(/\.mp4$/i);
    if (isVideo) {
      // Create a wrapper to enforce 16:9 aspect ratio
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';
      wrapper.style.height = '0';
      wrapper.style.paddingBottom = '56.25%'; // 16:9 aspect ratio
      wrapper.style.background = '#000';
      wrapper.style.display = 'block';
      wrapper.style.overflow = 'hidden';
      const video = document.createElement('video');
      video.src = `https://bcuupjvxpjaelpmcldnh.supabase.co/storage/v1/object/public/media-bucket/${file.name}`;
      video.style.position = 'absolute';
      video.style.top = '0';
      video.style.left = '0';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain'; // Fit inside, no cropping
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      // Prevent click/tap from bubbling to container
      video.addEventListener('click', function(e) { e.stopPropagation(); });
      video.addEventListener('touchend', function(e) { e.stopPropagation(); });
      wrapper.appendChild(video);
      // Add expand (fullscreen) button
      const expandBtn = document.createElement('button');
      expandBtn.innerHTML = '⛶';
      expandBtn.title = 'Expand';
      expandBtn.style.position = 'absolute';
      expandBtn.style.right = '50%';
      expandBtn.style.bottom = '12px';
      expandBtn.style.transform = 'translateX(50%)';
      expandBtn.style.zIndex = '3';
      expandBtn.style.background = 'rgba(0,0,0,0.5)';
      expandBtn.style.color = '#fff';
      expandBtn.style.border = 'none';
      expandBtn.style.borderRadius = '8px';
      expandBtn.style.padding = '6px 12px';
      expandBtn.style.fontSize = '1.2rem';
      expandBtn.style.cursor = 'pointer';
      expandBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (video.requestFullscreen) {
          video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
          video.msRequestFullscreen();
        }
      });
      wrapper.appendChild(expandBtn);
      // Pause lounge audio when video plays with sound, resume when paused
      video.addEventListener('play', function() {
        if (!video.muted) {
          const loungeAudio = document.getElementById('portal-audio');
          if (loungeAudio && !loungeAudio.paused) loungeAudio.pause();
        }
      });
      video.addEventListener('pause', function() {
        if (!video.muted) {
          const loungeAudio = document.getElementById('portal-audio');
          if (loungeAudio && loungeAudio.paused) loungeAudio.play();
        }
      });
      video.addEventListener('volumechange', function() {
        const loungeAudio = document.getElementById('portal-audio');
        if (!video.muted && !video.paused) {
          if (loungeAudio && !loungeAudio.paused) loungeAudio.pause();
        } else if ((video.muted || video.paused) && loungeAudio && loungeAudio.paused) {
          loungeAudio.play();
        }
      });
      // Add 10s backward and forward buttons
      const backBtn = document.createElement('button');
      backBtn.innerHTML = '⏪ 10s';
      backBtn.style.position = 'absolute';
      backBtn.style.left = '12px';
      backBtn.style.bottom = '12px';
      backBtn.style.zIndex = '3';
      backBtn.style.background = 'rgba(0,0,0,0.5)';
      backBtn.style.color = '#fff';
      backBtn.style.border = 'none';
      backBtn.style.borderRadius = '8px';
      backBtn.style.padding = '6px 12px';
      backBtn.style.fontSize = '1rem';
      backBtn.style.cursor = 'pointer';
      backBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        video.currentTime = Math.max(0, video.currentTime - 10);
      });
      const fwdBtn = document.createElement('button');
      fwdBtn.innerHTML = '10s ⏩';
      fwdBtn.style.position = 'absolute';
      fwdBtn.style.right = '12px';
      fwdBtn.style.bottom = '12px';
      fwdBtn.style.zIndex = '3';
      fwdBtn.style.background = 'rgba(0,0,0,0.5)';
      fwdBtn.style.color = '#fff';
      fwdBtn.style.border = 'none';
      fwdBtn.style.borderRadius = '8px';
      fwdBtn.style.padding = '6px 12px';
      fwdBtn.style.fontSize = '1rem';
      fwdBtn.style.cursor = 'pointer';
      fwdBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        video.currentTime = Math.min(video.duration, video.currentTime + 10);
      });
      wrapper.appendChild(backBtn);
      wrapper.appendChild(fwdBtn);
      container.appendChild(wrapper);
    } else {
      // Create a wrapper to enforce 1:1 aspect ratio for images
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';
      wrapper.style.height = '0';
      wrapper.style.paddingBottom = '100%'; // 1:1 aspect ratio
      wrapper.style.background = '#000';
      const img = document.createElement('img');
      img.src = `https://bcuupjvxpjaelpmcldnh.supabase.co/storage/v1/object/public/media-bucket/${file.name}`;
      img.style.position = 'absolute';
      img.style.top = '0';
      img.style.left = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain'; // Fit inside, no cropping
      img.addEventListener('click', function(e) { e.stopPropagation(); });
      img.addEventListener('touchend', function(e) { e.stopPropagation(); });
      wrapper.appendChild(img);
      container.appendChild(wrapper);
    }
    renderMediumRectangleButtons();
  }

  function showNext() {
    if (!mediaFiles.length) return;
    currentIndex = (currentIndex + 1) % mediaFiles.length;
    showMedia(currentIndex);
  }

  function showPrev() {
    if (!mediaFiles.length) return;
    currentIndex = (currentIndex - 1 + mediaFiles.length) % mediaFiles.length;
    showMedia(currentIndex);
  }

  // Touch event handlers for swipe
  let startX = 0;
  let endX = 0;
  function handleTouchStart(e) {
    startX = e.touches[0].clientX;
  }
  function handleTouchMove(e) {
    endX = e.touches[0].clientX;
  }
  function handleTouchEnd() {
    if (startX - endX > 50) {
      showNext();
    } else if (endX - startX > 50) {
      showPrev();
    }
  }

  // Function to render the 300x250 Medium Rectangle component
  async function renderMediumRectangle() {
    mediaFiles = await fetchMedia();
    currentIndex = 0;
    showMedia(currentIndex);
    const container = document.getElementById('medium-rectangle');
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, false);
      container.addEventListener('touchmove', handleTouchMove, false);
      container.addEventListener('touchend', handleTouchEnd, false);
    }
  }

  function renderMediumRectangleButtons() {
    const container = document.getElementById('medium-rectangle');
    if (!container) return;
    // Remove old buttons if any
    const oldPrev = document.getElementById('medium-rectangle-prev');
    const oldNext = document.getElementById('medium-rectangle-next');
    if (oldPrev) oldPrev.remove();
    if (oldNext) oldNext.remove();
    // Create prev button
    const prevBtn = document.createElement('button');
    prevBtn.id = 'medium-rectangle-prev';
    prevBtn.innerHTML = '&#8592;';
    prevBtn.style.position = 'absolute';
    prevBtn.style.left = '8px';
    prevBtn.style.top = '50%';
    prevBtn.style.transform = 'translateY(-50%)';
    prevBtn.style.zIndex = '2';
    prevBtn.style.background = 'rgba(0,0,0,0.4)';
    prevBtn.style.color = '#fff';
    prevBtn.style.border = 'none';
    prevBtn.style.borderRadius = '50%';
    prevBtn.style.width = '36px';
    prevBtn.style.height = '36px';
    prevBtn.style.fontSize = '1.5rem';
    prevBtn.style.cursor = 'pointer';
    prevBtn.addEventListener('click', showPrev);
    // Create next button
    const nextBtn = document.createElement('button');
    nextBtn.id = 'medium-rectangle-next';
    nextBtn.innerHTML = '&#8594;';
    nextBtn.style.position = 'absolute';
    nextBtn.style.right = '8px';
    nextBtn.style.top = '50%';
    nextBtn.style.transform = 'translateY(-50%)';
    nextBtn.style.zIndex = '2';
    nextBtn.style.background = 'rgba(0,0,0,0.4)';
    nextBtn.style.color = '#fff';
    nextBtn.style.border = 'none';
    nextBtn.style.borderRadius = '50%';
    nextBtn.style.width = '36px';
    nextBtn.style.height = '36px';
    nextBtn.style.fontSize = '1.5rem';
    nextBtn.style.cursor = 'pointer';
    nextBtn.addEventListener('click', showNext);
    container.appendChild(prevBtn);
    container.appendChild(nextBtn);
  }

  renderMediumRectangle();
});

