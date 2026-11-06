document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("inquiry-form");
  if (!form) return;

  const status = document.getElementById("inquiry-status");

  // Required fields and how each one is validated
  const rules = {
    contactName: (v) => v.length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    mobileNumber: (v) => /^\+?[\d\s()-]{7,}$/.test(v)
  };

  const setInvalid = (id, isInvalid) => {
    document.getElementById(id).closest(".prd-field").classList.toggle("invalid", isInvalid);
  };

  // Clear an error as soon as the person starts fixing the field
  Object.keys(rules).forEach((id) => {
    document.getElementById(id).addEventListener("input", () => setInvalid(id, false));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    status.textContent = "";

    const values = Object.fromEntries(new FormData(form).entries());
    const invalidIds = Object.keys(rules).filter((id) => !rules[id](values[id].trim()));

    Object.keys(rules).forEach((id) => setInvalid(id, invalidIds.includes(id)));

    if (invalidIds.length) {
      document.getElementById(invalidIds[0]).focus();
      return;
    }

    const inquiry = {
      id: Date.now(),
      contactName: values.contactName.trim(),
      companyName: values.companyName.trim(),
      email: values.email.trim(),
      mobileNumber: values.mobileNumber.trim(),
      submittedAt: new Date().toISOString()
    };

    // Replace with a fetch() call once there is a backend.
    try {
      const inquiries = JSON.parse(localStorage.getItem("gesProductInquiries") || "[]");
      inquiries.push(inquiry);
      localStorage.setItem("gesProductInquiries", JSON.stringify(inquiries));
      status.textContent = "Thank you! We received your inquiry and will be in touch.";
      form.reset();
    } catch (error) {
      console.error("Unable to save inquiry:", error);
      status.textContent = "We couldn't send your inquiry. Please try again.";
    }
  });
});