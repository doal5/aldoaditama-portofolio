document.addEventListener("DOMContentLoaded", () => {
  const text = "Mahasiswa | Web Developer";
  const typingEffect = document.getElementById("lead");
  let index = 0;

  function typeText() {
    if (index < text.length) {
      typingEffect.textContent += text.charAt(index);
      index++;
      setTimeout(typeText, 100); // Kecepatan mengetik (100ms per karakter)
    }
  }

  typeText();
});
