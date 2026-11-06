document.addEventListener("DOMContentLoaded", () => {
  
  // --- Contact Form Handling (index.html) ---
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault(); // Prevents full page reload
      
      const fullName = document.getElementById("fullName").value.trim();
      
      // Temporary submission confirmation (replace with fetch API call later)
      alert(`Thank you, ${fullName}! Your message has been sent successfully.`);
      contactForm.reset();
    });
  }

  // --- Application Form Handling (apply.html) ---
  const applyForm = document.getElementById("applyForm");
  if (applyForm) {
    applyForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const fullName = document.getElementById("fullName").value.trim();
      const resumeInput = document.getElementById("resume");
      const file = resumeInput?.files[0];

      // File Size Validation (Max 5MB)
      if (file && file.size > 5 * 1024 * 1024) {
        alert("The uploaded file is too large. Please upload a resume under 5MB.");
        return;
      }

      // Temporary submission confirmation (replace with FormData API call later)
      alert(`Application submitted successfully! Thank you, ${fullName}.`);
      applyForm.reset();
    });
  }

});