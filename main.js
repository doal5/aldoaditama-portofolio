const about = document.querySelectorAll(".about");
const projects = document.querySelectorAll(".projects");
const contact = document.querySelectorAll(".contact");

document.addEventListener("scroll", function () {
  about.forEach((about) => {
    if (isInView(about)) {
      about.classList.add("about--visible");
    }
  });
  projects.forEach((projects) => {
    if (isInView(projects)) {
      projects.classList.add("projects--visible");
    }
  });
  contact.forEach((contact) => {
    if (isInView(contact)) {
      contact.classList.add("contact--visible");
    }
  });
});

function isInView(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.top <
      (window.innerHeight - 150 || document.documentElement.clientHeight - 150)
  );
}
