function toggleIcon() {
  const checkbox = document.getElementById("flexSwitchCheckDefault");
  const icon = document.getElementById("icon");
  const navbar = document.getElementById("navabar");
  const body = document.body;
  if (checkbox.checked) {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
    body.classList.add("dark-mode");
    navbar.classList.add("dark-mode");
  } else {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
    body.classList.remove("dark-mode");
    navbar.classList.remove("dark-mode");
  }
}
