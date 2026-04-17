document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('uploadBtn');
  const sendEmailBtn = document.getElementById('sendEmailBtn');
  let lastUploadedUrl = '';

  uploadBtn.addEventListener('click', async () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem('filevault_token'); // get token saved after login

const res = await fetch('http://localhost:5000/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}` // 👈 send the token here
  },
  body: formData
});


      const data = await res.json();
      const resultDiv = document.getElementById('result');

      if (res.ok) {
        lastUploadedUrl = data.fileUrl;
  resultDiv.innerHTML = `
  ✅ <strong>File uploaded!</strong><br>
  📄 <strong>Name:</strong> ${data.name}<br>
  🧾 <strong>Size:</strong> ${(data.size / (1024 * 1024)).toFixed(2)} MB<br>
  📦 <strong>Type:</strong> ${data.type}<br>
  🔗 <a href="${data.fileUrl}" target="_blank" id="downloadLink">${data.fileUrl}</a><br>
  <button id="copyBtn" style="margin-top: 10px;">📋 Copy Link</button>
`;

document.getElementById('copyBtn').addEventListener('click', () => {
  const link = document.getElementById('downloadLink').href;
  navigator.clipboard.writeText(link).then(() => {
    document.getElementById('copyBtn').textContent = "✅ Copied!";
    setTimeout(() => {
      document.getElementById('copyBtn').textContent = "📋 Copy Link";
    }, 2000);
  });
});


        document.getElementById('emailShare').style.display = 'block';
      } else {
        resultDiv.innerHTML = `❌ Upload failed: ${data.message || 'Unknown error'}`;
      }
    } catch (error) {
      document.getElementById('result').innerHTML = '❌ Server error. Please try again.';
    }
  });

  sendEmailBtn.addEventListener('click', async () => {
    const sender = document.getElementById('senderEmail').value;
    const receiver = document.getElementById('receiverEmail').value;
    const statusDiv = document.getElementById('emailStatus');

    if (!sender || !receiver) {
      alert("Please fill both email fields.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          senderEmail: sender,
          receiverEmail: receiver,
          fileUrl: lastUploadedUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        statusDiv.textContent = "✅ Email sent successfully!";
      } else {
        statusDiv.textContent = "❌ Failed to send email.";
      }
    } catch (err) {
      statusDiv.textContent = "❌ Server error while sending email.";
    }
  });
});
