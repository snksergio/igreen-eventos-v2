# iGreen Live

Site do iGreen Live, o evento itinerante da iGreen Energy: página única, estática (HTML, CSS e JavaScript), com animações em GSAP.

## Como abrir

Abra `index.html` direto no navegador, ou sirva a pasta com qualquer servidor estático:

```bash
npx http-server . -p 5500 -c-1
```

e acesse http://localhost:5500.

## Estrutura

| Pasta / arquivo | O que tem |
|---|---|
| `index.html` | A página do site |
| `css/` | `portalv2.css` (base do site, importa `portal.css` e `styles.css`), `hero-c.css`, `edicoes.css`, `kicker.css`, `footer.css` |
| `js/` | `portal.js` (seções, rolagem suave, carrosséis), `hero-c.js`, `edicoes.js`, `kicker.js`, `footer.js` |
| `assets/` | Imagens, vídeos e o GSAP local (`assets/vendor`) |
| `speakers/` | Retratos recortados dos palestrantes |
| `opcoes/` | Propostas de design estudadas para cada seção (hero, edições, selos, footer), com um índice em `opcoes/index.html` |

## Seções do site e onde estão

- **Hero** — parede de vídeos que se transforma em cor, passando para a frase "Trabalho não é só renda…": `css/hero-c.css`, `js/hero-c.js`
- **Selos das seções** (palestrantes, tour, depoimentos e edições) — borda de energia com objeto 3D: `css/kicker.css`, `js/kicker.js`
- **Edições que marcaram história** — mural 3D guiado pela rolagem: `css/edicoes.css`, `js/edicoes.js`
- **Footer** — "Seu nome no crachá": `css/footer.css`, `js/footer.js`

## Bibliotecas

- GSAP 3.13 (core, Draggable e Inertia locais em `assets/vendor`; ScrollTrigger e SplitText via CDN)
- Fonte Instrument Sans via Google Fonts
