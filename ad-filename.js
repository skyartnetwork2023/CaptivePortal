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
      wrapper.appendChild(video);
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
      wrapper.appendChild(img);
      container.appendChild(wrapper);
    }
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

  renderMediumRectangle();
});

