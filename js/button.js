// Fungsi untuk menyisipkan file HTML
async function loadHTML(id, url) {
  const container = document.getElementById(id);
  if (container) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const content = await response.text();
        container.innerHTML = content;
      } else {
        console.error("Failed to load HTML:", response.status);
      }
    } catch (error) {
      console.error("Error loading HTML:", error);
    }
  }
}

// Panggil fungsi untuk file button.html
loadHTML("social-media-container", "button.html");
