document.addEventListener("DOMContentLoaded", () => {
  initApplyForm();
});

// ---------- Application form (apply.html) ----------
function initApplyForm() {
  const form = document.getElementById("applyForm");
  if (!form) return;

  const submitBtn = form.querySelector(".submit-btn");
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per file, same as the server

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = form.fullName.value.trim();
    const email = form.email.value.trim();
    const mobile = form.mobile.value.trim();
    const position = form.position.value;

    if (!fullName || !mobile || !position ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please complete all required fields with a valid email address.");
      return;
    }

    const uploads = [
      ["resume", form.resume.files[0], [".pdf", ".doc", ".docx"]],
      ["proof of citizenship", form.citizenship.files[0],
        [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]],
    ];

    for (const [label, file, allowed] of uploads) {
      if (!file) {
        alert(`Please upload your ${label}.`);
        return;
      }
      const dot = file.name.lastIndexOf(".");
      const ext = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
      if (!allowed.includes(ext)) {
        alert(`Your ${label} must be one of: ${allowed.join(", ")}.`);
        return;
      }
      if (file.size > MAX_SIZE) {
        alert(`Your ${label} is too large. Please upload a file under 5MB.`);
        return;
      }
    }

    if (submitBtn) submitBtn.disabled = true;

    try {
      // FormData carries the fields and both files together.
      // Don't set Content-Type; the browser adds it with the right boundary.
      const res = await fetch("/api/apply", {
        method: "POST",
        body: new FormData(form),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Something went wrong.");
      }

      alert(`Application submitted successfully! Thank you, ${fullName}.`);
      form.reset();
    } catch (error) {
      console.error("Unable to submit application:", error);
      alert(error.message || "Unable to submit your application. Please try again.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}