const fotos  = [...document.querySelectorAll(".foto")];
const blocos = [...document.querySelectorAll(".bloco")];
const palco  = document.querySelector(".palco");
const moldura = document.querySelector(".moldura");
const pontosBox = document.querySelector(".pontos");

// Se a imagem não carregar, tenta outras extensões e, por fim, mostra um quadro colorido
const EXTENSOES = ["jpg", "jpeg", "png", "webp", "avif"];

fotos.forEach((img) => {
  const ph = document.createElement("div");
  ph.className = "placeholder";
  ph.style.setProperty("--cor", img.dataset.cor);
  ph.textContent = img.dataset.nome;
  moldura.appendChild(ph);
  img._ph = ph;

  const base = img.getAttribute("src").replace(/\.[^./]+$/, "");
  let tentativa = EXTENSOES.indexOf(img.getAttribute("src").split(".").pop().toLowerCase());

  const aoFalhar = () => {
    tentativa++;
    if (tentativa < EXTENSOES.length) {
      img.src = `${base}.${EXTENSOES[tentativa]}`;
    } else {
      img._falhou = true;
      img.style.display = "none";
      if (img.classList.contains("ativa")) ph.classList.add("ativa");
    }
  };
  img.addEventListener("error", aoFalhar);
  // se o erro já aconteceu antes do script rodar
  if (img.complete && img.naturalWidth === 0) aoFalhar();
});

// Bolinhas
fotos.forEach(() => {
  const p = document.createElement("span");
  p.className = "ponto";
  pontosBox.appendChild(p);
});
const pontos = [...document.querySelectorAll(".ponto")];

// Troca com crossfade: a imagem anterior fica por baixo até a nova aparecer por completo
let atual = -1;
function mostrar(i) {
  if (i === atual) return;
  const anterior = atual;
  atual = i;

  fotos.forEach((img, n) => {
    const on = n === i;
    // o quadro colorido só aparece se a imagem realmente falhou
    const alvos = img._falhou ? [img._ph] : [img];
    img._ph.classList.remove("ativa", "saindo");
    alvos.forEach((el) => {
      if (on) {
        el.classList.remove("saindo");
        el.classList.add("ativa");
      } else if (n === anterior) {
        el.classList.remove("ativa");
        el.classList.add("saindo");
        setTimeout(() => { if (atual !== n) el.classList.remove("saindo"); }, 1000);
      } else {
        el.classList.remove("ativa", "saindo");
      }
    });
  });

  pontos.forEach((p, n) => p.classList.toggle("ativo", n === i));
  palco.style.setProperty("--fundo-foto", fotos[i].dataset.cor);
}

// Tamanho da foto: ocupa a largura toda (ou a altura toda, se for bem larga) e pode ser mais alta que a tela
function medir(img) {
  if (!img.naturalWidth) return;
  const vw = window.innerWidth, vh = window.innerHeight;
  const escala = Math.max(vw / img.naturalWidth, vh / img.naturalHeight);
  img._w = img.naturalWidth * escala;
  img._h = img.naturalHeight * escala;
  img.style.width = img._w + "px";
  img.style.height = img._h + "px";
  img.style.left = (vw - img._w) / 2 + "px";
}

// A foto desce conforme você rola pelas seções que usam ela
function descer() {
  const vh = window.innerHeight;
  fotos.forEach((img, n) => {
    if (!img._h) return;
    const meus = blocos.filter((b) => Number(b.dataset.foto) === n);
    if (!meus.length) return;
    const topo = meus[0].getBoundingClientRect().top;
    const fim = meus[meus.length - 1].getBoundingClientRect().bottom;
    const H = fim - topo;
    // começa quando a seção chega no meio da tela (ou no topo da página, na primeira)
    const inicio = meus[0] === blocos[0] ? 0 : vh / 2;
    // termina quando a próxima seção chega no meio (ou no fim da página, na última)
    const final = meus[meus.length - 1] === blocos[blocos.length - 1] ? vh - H : -(H - vh / 2);
    const p = Math.min(1, Math.max(0, (inicio - topo) / (inicio - final)));
    const sobra = Math.max(0, img._h - vh);
    img.style.transform = `translate3d(0, ${-p * sobra}px, 0)`;
  });
}

fotos.forEach((img) => {
  const pronto = () => { medir(img); descer(); };
  img.addEventListener("load", pronto);
  if (img.complete) pronto();
});
window.addEventListener("resize", () => { fotos.forEach(medir); descer(); });

// Qual bloco está mais perto do centro da tela?
function atualizar() {
  descer();
  const centro = window.innerHeight / 2;
  let melhor = 0, menor = Infinity;
  blocos.forEach((b, n) => {
    const r = b.getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - centro);
    if (d < menor) { menor = d; melhor = n; }
  });
  blocos.forEach((b, n) => b.classList.toggle("ativo", n === melhor));
  mostrar(Number(blocos[melhor].dataset.foto));
}

let ticking = false;
window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => { atualizar(); ticking = false; });
    ticking = true;
  }
}, { passive: true });
window.addEventListener("resize", atualizar);
atualizar();


// ---------- Música de fundo ----------
// Navegadores bloqueiam som automático: a música começa no primeiro clique/toque/tecla
// ou quando a pessoa aperta o botão no canto da tela.
const audio = document.getElementById("musica");
const botaoSom = document.getElementById("botaoSom");
const VOLUME = 0.5;
let querTocar = true; // vira false se a pessoa pausar de propósito
let fadeTimer;

function fadeIn() {
  clearInterval(fadeTimer);
  audio.volume = 0;
  fadeTimer = setInterval(() => {
    audio.volume = Math.min(VOLUME, audio.volume + 0.05);
    if (audio.volume >= VOLUME) clearInterval(fadeTimer);
  }, 150);
}

function marcar(tocando) {
  botaoSom.setAttribute("aria-pressed", String(tocando));
  botaoSom.setAttribute("aria-label", tocando ? "Pausar música" : "Tocar música");
}

async function tocar() {
  try {
    await audio.play();
    fadeIn();
    marcar(true);
    return true;
  } catch (e) {
    marcar(false); // bloqueado ou arquivo ausente
    return false;
  }
}

botaoSom.addEventListener("click", (e) => {
  e.stopPropagation();
  if (audio.paused) { querTocar = true; tocar(); }
  else { querTocar = false; audio.pause(); marcar(false); }
});

// Primeira interação em qualquer lugar da página inicia a música
function primeiraInteracao() {
  if (querTocar && audio.paused) tocar();
  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    window.removeEventListener(ev, primeiraInteracao));
}
["pointerdown", "keydown", "touchstart"].forEach((ev) =>
  window.addEventListener(ev, primeiraInteracao, { once: false, passive: true }));

marcar(false);
tocar(); // tenta já ao abrir (funciona em alguns navegadores)
