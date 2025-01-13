document.addEventListener("DOMContentLoaded", function () {
  const carouselImages = document.querySelectorAll(".carousel-item img");

  carouselImages.forEach((img) => {
    img.addEventListener("click", function () {
      const modalImage = document.getElementById("modal-image");
      modalImage.src = this.src; // Set source gambar di modal
      const modal = new bootstrap.Modal(document.getElementById("imageModal"));
      modal.show();
    });
  });
});
