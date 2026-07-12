(function () {
  var script = document.currentScript;
  if (!script) return;

  var botId = script.getAttribute("data-bot");
  var token = script.getAttribute("data-token");
  if (!botId || !token) return;

  var base = script.src.replace(/\/widget\.js(\?.*)?$/, "");
  var embedUrl = base + "/embed/" + botId + "?token=" + encodeURIComponent(token);

  var open = false;
  var root = document.createElement("div");
  root.id = "presstech-widget";
  root.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;font-family:system-ui,sans-serif";

  var button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Open chat");
  button.style.cssText =
    "width:56px;height:56px;border-radius:50%;border:none;background:#2563eb;color:#fff;" +
    "cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.2);font-size:24px;line-height:1";
  button.textContent = "💬";

  var panel = document.createElement("div");
  panel.style.cssText =
    "display:none;width:380px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 100px);" +
    "margin-bottom:12px;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.18);background:#fff";

  var iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = "PressTech Chat";
  iframe.style.cssText = "width:100%;height:100%;border:0";
  iframe.allow = "clipboard-write";

  panel.appendChild(iframe);
  root.appendChild(panel);
  root.appendChild(button);
  document.body.appendChild(root);

  button.addEventListener("click", function () {
    open = !open;
    panel.style.display = open ? "block" : "none";
    button.textContent = open ? "✕" : "💬";
  });
})();
