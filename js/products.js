document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("inquiry-form");
  if (!form) return;

  const status = document.getElementById("inquiry-status");
  const submitBtn = form.querySelector('button[type="submit"]');

  // Required fields and how each one is validated
  const rules = {
    contactName: (v) => v.length > 0,
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    mobileNumber: (v) => /^\+?[\d\s()-]{7,}$/.test(v),
  };

  const setInvalid = (id, isInvalid) => {
    document.getElementById(id).closest(".prd-field").classList.toggle("invalid", isInvalid);
  };

  // Clear an error as soon as the person starts fixing the field
  Object.keys(rules).forEach((id) => {
    document.getElementById(id).addEventListener("input", () => setInvalid(id, false));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    const values = Object.fromEntries(new FormData(form).entries());
    const invalidIds = Object.keys(rules).filter((id) => !rules[id]((values[id] || "").trim()));

    Object.keys(rules).forEach((id) => setInvalid(id, invalidIds.includes(id)));

    if (invalidIds.length) {
      document.getElementById(invalidIds[0]).focus();
      return;
    }

    const inquiry = {
      contactName: values.contactName.trim(),
      companyName: (values.companyName || "").trim(),
      email: values.email.trim(),
      mobileNumber: values.mobileNumber.trim(),
    };

    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inquiry),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Something went wrong.");
      }

      status.textContent = "Thank you! We received your inquiry and will be in touch.";
      form.reset();
    } catch (error) {
      console.error("Unable to send inquiry:", error);
      status.textContent = "We couldn't send your inquiry. Please try again.";
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});