const STYLE_ID = "sephia-avatar-styles";
const LOCAL_ASSET_PATH = /^(?:\.\.?\/|\/(?!\/))/;

const CSS = `
.sephia-avatar[hidden]{display:none}
.sephia-avatar{position:fixed;z-index:1200;right:1rem;top:5.25rem;pointer-events:none;display:grid;justify-items:center;gap:.55rem;width:min(13rem,42vw);padding:1rem;border:1px solid rgba(111,211,255,.24);border-radius:1.35rem;background:radial-gradient(ellipse at 50% 18%,rgba(68,174,226,.2),rgba(8,18,35,.92) 72%);box-shadow:0 12px 42px rgba(0,0,0,.24),inset 0 0 28px rgba(88,190,255,.06);color:#e8f6ff}
.sephia-avatar-portrait{position:relative;display:grid;place-items:center;width:8rem;height:8rem;overflow:hidden;border:1px solid rgba(137,222,255,.42);border-radius:50%;background:radial-gradient(circle at 50% 35%,rgba(125,210,255,.3),rgba(22,43,73,.88) 68%);box-shadow:0 0 28px rgba(57,190,255,.16)}
.sephia-avatar-portrait img{width:100%;height:100%;object-fit:cover}
.sephia-avatar-fallback{position:relative;width:100%;height:100%;display:grid;place-items:center}
.sephia-avatar-fallback[hidden]{display:none}
.sephia-avatar-head{position:absolute;z-index:1;top:22%;width:2.35rem;height:2.85rem;border-radius:48% 48% 44% 44%;background:linear-gradient(135deg,#d9b7a8,#8e7180);box-shadow:0 0 14px rgba(214,178,190,.22)}
.sephia-avatar-hair{position:absolute;z-index:2;top:13%;width:3.1rem;height:4.6rem;border-radius:48% 48% 38% 38%;background:linear-gradient(110deg,#26334d,#111b31);clip-path:polygon(12% 0,88% 0,100% 100%,78% 82%,72% 30%,28% 30%,20% 84%,0 100%)}
.sephia-avatar-shoulders{position:absolute;bottom:-17%;width:6.2rem;height:3.6rem;border-radius:50% 50% 0 0;background:linear-gradient(120deg,#5d7699,#293c60)}
.sephia-avatar-eyes{position:absolute;z-index:3;top:46%;display:flex;gap:.58rem;width:1.15rem;justify-content:center}\n.sephia-avatar-eyes:before,.sephia-avatar-eyes:after{content:"";display:block;width:.12rem;height:.12rem;border-radius:50%;background:#344052}\n.sephia-avatar-mouth{position:absolute;top:57%;width:.52rem;height:.12rem;border-radius:50%;background:#754e59;z-index:2}
.sephia-avatar[data-speaking="true"] .sephia-avatar-mouth{animation:sephia-mouth .22s ease-in-out infinite alternate}
.sephia-avatar-name{font-size:.78rem;font-weight:650;letter-spacing:.12em}
.sephia-avatar-caption{font-size:.7rem;color:#a9c8dc}
@keyframes sephia-mouth{from{height:.1rem;width:.45rem}to{height:.42rem;width:.62rem}}
@keyframes sephia-avatar-float{from{transform:translateY(0)}to{transform:translateY(-3px)}}
.sephia-avatar[data-state="speaking"],.sephia-avatar[data-state="listening"]{animation:sephia-avatar-float 2.8s ease-in-out infinite alternate}
@media(max-width:640px){.sephia-avatar{right:.55rem;top:4.5rem;width:min(10rem,42vw);padding:.7rem}.sephia-avatar-portrait{width:6rem;height:6rem}}
@media(prefers-reduced-motion:reduce){.sephia-avatar *{animation:none!important;transition:none!important}}
`;

function createElement(documentImpl, tag, className, text) {
  const node = documentImpl.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Mounts an optional avatar presentation into an explicit host-provided node.
 * The final digital-human artwork is supplied separately as a same-origin asset.
 * The CSS fallback is only a loading placeholder, not the approved final avatar.
 */
export function mountSephiaAvatar({
  container,
  visualState,
  speechController = null,
  avatarAssetUrl = null,
  documentImpl = globalThis.document,
  onError = () => {},
}) {
  if (!container || typeof container.appendChild !== "function") {
    throw new TypeError("An explicit avatar mount container is required.");
  }
  if (!visualState || typeof visualState.subscribe !== "function" || !visualState.snapshot) {
    throw new TypeError("A visual state controller is required.");
  }
  if (!documentImpl?.createElement) throw new TypeError("A document implementation is required.");
  if (avatarAssetUrl !== null &&
      (typeof avatarAssetUrl !== "string" || !LOCAL_ASSET_PATH.test(avatarAssetUrl))) {
    throw new TypeError("Avatar artwork must use a same-origin relative asset path.");
  }

  if (!documentImpl.getElementById?.(STYLE_ID)) {
    const style = createElement(documentImpl, "style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    (documentImpl.head || container).appendChild(style);
  }

  let disposed = false;
  const root = createElement(documentImpl, "section", "sephia-avatar");
  root.hidden = true;
  root.dataset.state = "inactive";
  root.dataset.speaking = "false";
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "Avatar SEPHIA");

  const portrait = createElement(documentImpl, "div", "sephia-avatar-portrait");
  portrait.setAttribute("aria-hidden", "true");
  const fallback = createElement(documentImpl, "div", "sephia-avatar-fallback");
  const hair = createElement(documentImpl, "span", "sephia-avatar-hair");
  const head = createElement(documentImpl, "span", "sephia-avatar-head");
  const mouth = createElement(documentImpl, "span", "sephia-avatar-mouth");
  const shoulders = createElement(documentImpl, "span", "sephia-avatar-shoulders");
  fallback.append(hair, head, eyes, mouth, shoulders);

  let image = null;
  if (avatarAssetUrl) {
    image = createElement(documentImpl, "img");
    image.alt = "";
    image.decoding = "async";
    image.loading = "lazy";
    image.src = avatarAssetUrl;
    image.addEventListener("error", () => {
      if (!disposed) {
        image.hidden = true;
        fallback.hidden = false;
        try { onError(new Error("SEPHIA avatar asset could not be loaded.")); } catch {}
      }
    }, { once: true });
    fallback.hidden = true;
    portrait.append(image, fallback);
  } else {
    portrait.appendChild(fallback);
  }

  const name = createElement(documentImpl, "div", "sephia-avatar-name", "SEPHIA");
  const caption = createElement(documentImpl, "div", "sephia-avatar-caption", "Asisten Panitia");
  root.append(portrait, name, caption);
  container.appendChild(root);

  const render = (snapshot) => {
    if (disposed) return;
    const visibleState = snapshot.state === "speaking" || snapshot.state === "listening";
    const speaking = snapshot.state === "speaking" && speechController?.isSpeaking === true;
    root.hidden = !snapshot.active || !snapshot.visualizerEnabled || !visibleState;
    root.dataset.state = snapshot.state;
    root.dataset.speaking = String(speaking);
    caption.textContent = snapshot.state === "listening" ? "Mendengarkan" :
      speaking ? "Sedang berbicara" : "Asisten Panitia";
  };

  const unsubscribe = visualState.subscribe(render);
  render(visualState.snapshot);

  return Object.freeze({
    element: root,
    refresh: () => render(visualState.snapshot),
    dispose() {
      if (disposed) return;
      disposed = true;
      try { unsubscribe?.(); } catch {}
      root.remove();
    },
  });
}
