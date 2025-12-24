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
      console.log('Fetched media:', data);
      return data;
    } catch (err) {
      console.error('Unexpected error fetching media:', err);
      return [];
    }
  }

  // Function to render the 300x250 Medium Rectangle component
  async function renderMediumRectangle() {
    const container = document.getElementById('medium-rectangle');
    if (!container) {
      console.error('Element with ID "medium-rectangle" not found in the DOM.');
      return;
    }
    const mediaFiles = await fetchMedia();
    if (mediaFiles.length === 0) {
      container.innerHTML = '<p>No media available</p>';
    } else {
      mediaFiles.forEach((file) => {
        const mediaElement = document.createElement(file.name.endsWith('.mp4') ? 'video' : 'img');
        mediaElement.src = `https://bcuupjvxpjaelpmcldnh.supabase.co/storage/v1/object/public/media-bucket/${file.name}`;
        mediaElement.style.width = '100%';
        mediaElement.style.height = '100%';
        mediaElement.style.objectFit = 'cover';
        if (file.name.endsWith('.mp4')) {
          mediaElement.controls = true;
        }
        container.appendChild(mediaElement);
      });
    }
  }

  renderMediumRectangle();
});

