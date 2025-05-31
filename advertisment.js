(function () {
    if (sessionStorage.getItem("noticeClosed")) return;
  
    const noticeBar = document.createElement("div");
    noticeBar.style.position = "relative";
    noticeBar.style.backgroundColor = "rgb(0, 140, 255)";
    noticeBar.style.color = "#ffffff";
    noticeBar.style.padding = "10px 20px";
    noticeBar.style.fontSize = "16px";
    noticeBar.style.textAlign = "center";
    noticeBar.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    noticeBar.style.zIndex = "9999";
  
    // Message wrapper to center
    const messageWrapper = document.createElement("div");
    messageWrapper.innerHTML = "Buy this aged domain and original website togather (2 in 1) — now available at a highly affordable price on <a href='https://age.domains' target='_blank' style='color: inherit; text-decoration: underline;'>age.domains</a>!";
    messageWrapper.style.maxWidth = "100%";
    messageWrapper.style.margin = "0 auto";
    messageWrapper.style.display = "inline-block";
    
    noticeBar.appendChild(messageWrapper);
  
    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.position = "absolute";
    closeBtn.style.top = "50%";
    closeBtn.style.right = "-0.1%";
    closeBtn.style.transform = "translateY(-50%)";
    closeBtn.style.background = "none";
    closeBtn.style.border = "none";
    closeBtn.style.fontSize = "20px";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.color = "#ffffff";
    closeBtn.onclick = function () {
      noticeBar.remove();
      sessionStorage.setItem("noticeClosed", "true");
    };
  
    noticeBar.appendChild(closeBtn);
  
    window.addEventListener("DOMContentLoaded", function () {
      const masthead = document.getElementById("masthead");
      if (masthead && masthead.parentNode) {
        masthead.parentNode.insertBefore(noticeBar, masthead);
      } else {
        document.body.prepend(noticeBar);
      }
    });
  })();