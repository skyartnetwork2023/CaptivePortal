// Check if supabase is already defined
if (typeof supabase === 'undefined') {
  const SUPABASE_URL = 'https://bcuupjvxpjaelpmcldnh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_-U9QwYC4h11W2ITt7NHyQg_XVnkfu8d';
  var supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Function to fetch media files from Supabase storage
async function fetchMedia() {
  const { data, error } = await supabase.storage.from('media-bucket').list('');
  if (error) {
    console.error('Error fetching media:', error);
    return [];
  }
  return data;
}

// Function to render the 300x250 Medium Rectangle component
async function renderMediumRectangle() {
  const container = document.createElement('div');
  container.style.width = '300px';
  container.style.height = '250px';
  container.style.border = '1px solid #ccc';
  container.style.overflow = 'hidden';
  container.style.position = 'relative';

  const mediaFiles = await fetchMedia();

  if (mediaFiles.length === 0) {
    container.innerHTML = '<p>No media available</p>';
  } else {
    mediaFiles.forEach((file) => {
      const mediaElement = document.createElement(file.name.endsWith('.mp4') ? 'video' : 'img');
      mediaElement.src = `${SUPABASE_URL}/storage/v1/object/public/media-bucket/${file.name}`;
      mediaElement.style.width = '100%';
      mediaElement.style.height = '100%';
      mediaElement.style.objectFit = 'cover';
      if (file.name.endsWith('.mp4')) {
        mediaElement.controls = true;
      }
      container.appendChild(mediaElement);
    });
  }

  document.body.appendChild(container);
}

// Call the function to render the component
renderMediumRectangle();

