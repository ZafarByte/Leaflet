import pageFlipBundle from "page-flip/dist/js/page-flip.browser.js?raw";
import pageFlipStyles from "page-flip/src/Style/stPageFlip.css?raw";
import type { RenderedPdf } from "./pdfRenderer";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function safeFilename(value: string): string {
  const name = value
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .split("")
    .filter((character) => character.charCodeAt(0) >= 32)
    .join("")
    .trim();
  return `${name || "book"}-flipbook.html`;
}

export function createStandaloneFlipbook(pdf: RenderedPdf): { filename: string; html: string } {
  const title = pdf.name.replace(/\.pdf$/i, "") || "Shared flipbook";
  const pages = JSON.stringify(pdf.pages.map(({ pageNumber, width, height, dataUrl }) => ({
    pageNumber,
    width,
    height,
    dataUrl,
  })))
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const embeddedPageFlip = pageFlipBundle.replace(/<\/script/gi, "<\\/script");
  const embeddedPageFlipStyles = pageFlipStyles.replace(/<\/style/gi, "<\\/style");

  const html = `<!doctype html>
<html lang="en">
<head>
<!-- page-flip 2.0.7 is included under the MIT License.
Copyright (c) 2020 Nodlik.
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
-->
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#202923">
<title>${escapeHtml(title)} — Leaflet Flipbook</title>
<style>
${embeddedPageFlipStyles}
*{box-sizing:border-box}
body{--bg:#e8e7e1;--fg:#272a26;--muted:#656b64;--control:#fffefa;--border:#d0d1c9;--accent:#63795d;margin:0;min-height:100vh;display:flex;flex-direction:column;color:var(--fg);background:radial-gradient(ellipse at 50% 45%,#faf9f4,#dedfd8 76%);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;transition:background .2s,color .2s}
body[data-theme=warm-paper]{--bg:#ded4c1;--fg:#433d32;--muted:#756d5d;--control:#f3ead8;--border:#c6b99f;--accent:#526d5b;background:radial-gradient(ellipse at 50% 46%,#fffdf6,#ded4c1 75%)}
body[data-theme=dark]{--bg:#202923;--fg:#f4f2ea;--muted:#a9b0a6;--control:#263129;--border:#ffffff24;--accent:#9bb18f;background:radial-gradient(ellipse at 50% 42%,#344238,#1b231e 74%)}
body[data-theme=high-contrast]{--bg:#000;--fg:#fff;--muted:#f1f1f1;--control:#000;--border:#fff;--accent:#ff0;background:#000}
header,footer{min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px clamp(14px,4vw,48px);background:color-mix(in srgb,var(--bg) 88%,transparent)}
header{border-bottom:1px solid var(--border)}
h1{min-width:0;overflow:hidden;margin:0;font-size:15px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}
.header-tools,.controls{display:flex;align-items:center;gap:9px}
button{min-height:38px;padding:0 12px;border:1px solid var(--border);border-radius:9px;color:var(--fg);background:var(--control);font:inherit}
button{cursor:pointer;transition:background .15s,border-color .15s,transform .15s}
button:hover:not(:disabled){border-color:var(--accent);transform:translateY(-1px)}
button:focus-visible{outline:none;box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 70%,transparent)}
button:disabled{opacity:.4;cursor:not-allowed}
.theme-control{position:relative;display:flex;align-items:center;gap:7px;color:var(--muted);font-size:11px}
.theme-trigger{min-width:142px;display:flex;align-items:center;gap:10px;padding:0 11px;text-align:left;background:color-mix(in srgb,var(--control) 88%,transparent)}
.theme-trigger .theme-value{flex:1;color:var(--fg);font-size:12px;white-space:nowrap}
.theme-chevron{width:8px;height:8px;flex:0 0 auto;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .16s}
.theme-trigger[aria-expanded=true] .theme-chevron{transform:translateY(2px) rotate(225deg)}
.theme-menu{position:absolute;top:calc(100% + 7px);right:0;z-index:8;width:190px;padding:5px;border:1px solid var(--border);border-radius:11px;color:var(--fg);background:var(--control);box-shadow:0 14px 34px #0004;animation:menu-enter .14s ease-out}
.theme-menu[hidden]{display:none}
@keyframes menu-enter{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.theme-option{width:100%;min-height:39px;display:flex;align-items:center;gap:10px;padding:0 10px;border-color:transparent;border-radius:7px;background:transparent;text-align:left;font-size:12px}
.theme-option:hover:not(:disabled),.theme-option:focus-visible,.theme-option[aria-checked=true]{border-color:transparent;background:color-mix(in srgb,var(--accent) 18%,transparent);transform:none;box-shadow:none}
.theme-option:focus-visible{box-shadow:inset 0 0 0 1px var(--accent)}
.theme-swatch{width:15px;height:15px;flex:0 0 auto;border:1px solid #80808070;border-radius:50%}
.theme-option[data-theme=normal] .theme-swatch{background:linear-gradient(135deg,#fbfaf6 0 50%,#202923 50%)}
.theme-option[data-theme=warm-paper] .theme-swatch{background:linear-gradient(135deg,#eee2c8 0 50%,#b9a47f 50%)}
.theme-option[data-theme=dark] .theme-swatch{background:linear-gradient(135deg,#202923 0 50%,#84927e 50%)}
.theme-option[data-theme=high-contrast] .theme-swatch{border-color:#aaa;background:linear-gradient(135deg,#000 0 50%,#ff0 50%)}
.theme-check{margin-left:auto;color:var(--accent)}
main{width:100%;flex:1;min-height:0;display:flex;flex-direction:column;align-items:stretch;justify-content:center;padding:14px clamp(48px,7vw,100px) 8px}
.book-stage{position:relative;flex:1;min-height:220px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.book-stage:before{position:absolute;top:50%;left:50%;width:min(820px,85vw);height:min(650px,76vh);border-radius:50%;background:radial-gradient(ellipse,#75806c24,transparent 70%);content:"";transform:translate(-50%,-50%);pointer-events:none}
body[data-theme=warm-paper] .book-stage:before{background:radial-gradient(ellipse,#fffdf6b3,transparent 70%)}
body[data-theme=high-contrast] .book-stage:before{display:none}
.book{position:relative;z-index:1;width:100%;max-width:100%;flex:0 1 auto;touch-action:pan-y}
.pageflip-root{position:relative;width:100%;touch-action:pan-y}
.pageflip-root .stf__parent{position:relative;display:block;margin:0 auto}
.pageflip-root .stf__wrapper{position:relative;width:100%;box-sizing:border-box}
.pageflip-root .stf__block{position:absolute;inset:0;perspective:2000px;transform-style:preserve-3d}
.pageflip-root .stf__item{position:absolute;display:block;overflow:hidden;background:#fbfaf6;box-shadow:inset 0 0 14px #271f1114,2px 5px 15px #0003;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.book .stf__wrapper{position:relative;width:100%;box-sizing:border-box}
.book .stf__block{position:absolute;inset:0;perspective:2000px;transform-style:preserve-3d}
.book .stf__item{position:absolute;display:block;overflow:hidden;background:#fbfaf6;box-shadow:inset 0 0 14px #271f1114,2px 5px 15px #0003;backface-visibility:hidden;-webkit-backface-visibility:hidden}
body[data-theme=warm-paper] .book .stf__item{background:#f2e8d4;box-shadow:inset 0 0 14px #4131191a,2px 5px 15px #3a2b143d}
body[data-theme=high-contrast] .book .stf__item{background:#fff;box-shadow:0 0 0 1px #fff,3px 5px 18px #000}
.book-sheet:first-child,.book-sheet:last-child{background:#354d3d}
.book-sheet img{width:100%;height:100%;display:block;object-fit:fill;background:#fbfaf6;user-select:none;-webkit-user-drag:none;pointer-events:none}
body[data-theme=warm-paper] .book-sheet img{filter:sepia(.12) saturate(.94)}
body[data-theme=dark] .book-sheet img{filter:invert(.9) hue-rotate(180deg)}
body[data-theme=high-contrast] .book-sheet img{filter:contrast(1.5)}
.book.is-cover .pageflip-root{transform:translateX(-25%);transition:transform 320ms cubic-bezier(.22,.61,.36,1)}
.page-nav{position:absolute;top:50%;z-index:3;width:44px;height:44px;display:grid;place-items:center;padding:0;border-radius:50%;color:var(--fg);background:color-mix(in srgb,var(--control) 74%,transparent);font:32px/1 Georgia,serif;transform:translateY(-50%)}
.page-nav:hover:not(:disabled){transform:translateY(-50%) scale(1.06)}
.page-nav:disabled{opacity:.3}
.page-nav-prev{left:0}.page-nav-next{right:0}
.book-status{position:absolute;z-index:2;padding:12px 18px;border:1px solid var(--border);border-radius:10px;color:var(--fg);background:var(--control)}
.controls{justify-content:center;gap:12px;margin:8px 0 10px}
#count{min-width:138px;color:var(--muted);text-align:center;font-variant-numeric:tabular-nums}
.progress{width:min(220px,24vw);height:4px;overflow:hidden;border-radius:9px;background:color-mix(in srgb,var(--fg) 15%,transparent)}
.progress-fill{height:100%;border-radius:inherit;background:var(--accent);transition:width .2s}
.thumb-panel{flex:0 0 auto;padding:9px clamp(12px,4vw,48px) 12px;border-top:1px solid var(--border);background:var(--control)}
.thumb-heading{display:flex;align-items:center;gap:10px;margin-bottom:8px;color:var(--muted);font-size:11px}
.thumb-heading strong{color:var(--fg);font-size:12px}
.thumb-heading button{min-height:28px;margin-left:auto;padding:0 9px}
.thumb-rail{display:flex;gap:9px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:thin}
.thumbnail{width:64px;min-width:64px;min-height:94px;display:flex;flex-direction:column;gap:4px;padding:4px;border-radius:7px;background:var(--bg)}
.thumbnail img{width:100%;height:70px;object-fit:contain;background:#fbfaf6}
.thumbnail span{color:var(--muted);font-size:10px}
.thumbnail[aria-current=page]{border:2px solid var(--accent);padding:2px}
footer{justify-content:center;color:var(--muted);font-size:11px}
@media(max-width:640px){header{min-height:52px;padding:8px 11px}.header-tools{gap:5px}h1{font-size:12px}.theme-control{gap:4px;font-size:10px}.theme-trigger{min-width:112px;min-height:34px;gap:6px;padding:0 7px}.theme-trigger .theme-value{font-size:10px}.theme-menu{width:170px}.theme-option{min-height:36px;padding:0 7px;font-size:11px}.header-tools button{min-height:34px;padding:0 8px;font-size:11px}main{padding:8px 41px 5px}.book-stage{min-height:180px}.page-nav{width:34px;height:34px;font-size:26px}.controls{gap:7px;margin:5px 0 8px}.controls button{min-width:36px;min-height:36px;padding:0 9px}.progress{width:70px}.thumb-panel{padding:7px 9px 9px}.thumbnail{width:54px;min-width:54px;min-height:82px}.thumbnail img{height:60px}footer{min-height:40px;padding:7px 10px;text-align:center;font-size:10px}}
@media(max-width:360px){.theme-control>span:first-child{display:none}.theme-trigger{min-width:100px}.header-tools button span.label{display:none}main{padding-right:36px;padding-left:36px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation-duration:1ms!important;animation-iteration-count:1!important;transition-duration:1ms!important}}
</style>
</head>
<body data-theme="normal">
<header>
  <h1>${escapeHtml(title)}</h1>
  <div class="header-tools">
    <div class="theme-control" id="theme-control">
      <span>Theme</span>
      <button class="theme-trigger" id="theme-trigger" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="theme-menu">
        <span class="theme-value" id="theme-value">Normal</span>
        <span class="theme-chevron" aria-hidden="true"></span>
      </button>
      <div class="theme-menu" id="theme-menu" role="menu" aria-label="Reading theme" hidden>
        <button class="theme-option" data-theme="normal" type="button" role="menuitemradio" aria-checked="true"><span class="theme-swatch" aria-hidden="true"></span><span>Normal</span><span class="theme-check" aria-hidden="true">✓</span></button>
        <button class="theme-option" data-theme="warm-paper" type="button" role="menuitemradio" aria-checked="false"><span class="theme-swatch" aria-hidden="true"></span><span>Warm paper</span><span class="theme-check" aria-hidden="true" hidden>✓</span></button>
        <button class="theme-option" data-theme="dark" type="button" role="menuitemradio" aria-checked="false"><span class="theme-swatch" aria-hidden="true"></span><span>Dark</span><span class="theme-check" aria-hidden="true" hidden>✓</span></button>
        <button class="theme-option" data-theme="high-contrast" type="button" role="menuitemradio" aria-checked="false"><span class="theme-swatch" aria-hidden="true"></span><span>High contrast</span><span class="theme-check" aria-hidden="true" hidden>✓</span></button>
      </div>
    </div>
    <button id="toggle-thumbnails" type="button" aria-expanded="false" aria-controls="thumbnails"><span aria-hidden="true">▦</span> <span class="label">Thumbnails</span></button>
  </div>
</header>
<main>
  <div class="book-stage" id="stage">
    <button class="page-nav page-nav-prev" id="previous" type="button" aria-label="Previous page" disabled>‹</button>
    <div class="book is-cover" id="book" aria-label="Flip book preview" role="region"><div class="pageflip-root" id="pageflip-root"></div></div>
    <button class="page-nav page-nav-next" id="next" type="button" aria-label="Next page">›</button>
    <div class="book-status" id="status" role="status">Preparing your book…</div>
  </div>
  <nav class="controls" aria-label="Page controls">
    <button id="previous-bottom" type="button" aria-label="Previous page" disabled>‹</button>
    <span id="count" aria-live="polite"></span>
    <button id="next-bottom" type="button" aria-label="Next page">›</button>
    <div class="progress" role="progressbar" aria-label="Reading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-fill" id="progress"></div></div>
  </nav>
</main>
<section class="thumb-panel" id="thumbnails" hidden aria-label="Page thumbnails">
  <div class="thumb-heading"><strong>Pages</strong><span id="thumb-total"></span><button id="close-thumbnails" type="button" aria-label="Close thumbnails">×</button></div>
  <div class="thumb-rail" id="thumb-rail"></div>
</section>
<footer>Leaflet · Drag a page corner, swipe, use the arrows, or press ← / →. Works offline.</footer>
<script>${embeddedPageFlip}</script>
<script>
const pages=${pages};
const host=document.getElementById("book");
const flipRoot=document.getElementById("pageflip-root");
const stage=document.getElementById("stage");
const status=document.getElementById("status");
const count=document.getElementById("count");
const progress=document.getElementById("progress");
const progressBar=progress.parentElement;
const previousButtons=[document.getElementById("previous"),document.getElementById("previous-bottom")];
const nextButtons=[document.getElementById("next"),document.getElementById("next-bottom")];
const thumbnailPanel=document.getElementById("thumbnails");
const thumbnailRail=document.getElementById("thumb-rail");
const thumbnailToggle=document.getElementById("toggle-thumbnails");
const themeControl=document.getElementById("theme-control");
const themeTrigger=document.getElementById("theme-trigger");
const themeMenu=document.getElementById("theme-menu");
const themeValue=document.getElementById("theme-value");
const themeOptions=[...themeMenu.querySelectorAll(".theme-option")];
let pageFlip=null;
let current=0;
let orientation="landscape";
function visiblePageIndices(){
  if(orientation==="portrait")return [current];
  if(current===0)return [0];
  return current+1<pages.length?[current,current+1]:[current];
}
function updateReader(){
  if(!pageFlip)return;
  current=pageFlip.getCurrentPageIndex();
  orientation=pageFlip.getOrientation();
  const visible=visiblePageIndices();
  const last=pages.length-1;
  previousButtons.forEach(button=>button.disabled=current===0);
  nextButtons.forEach(button=>button.disabled=visible[visible.length-1]>=last);
  host.classList.toggle("is-cover",current===0&&orientation==="landscape");
  count.textContent=current===0?"Cover · "+pages.length+" "+(pages.length===1?"page":"pages"):
    visible.length===2?"Pages "+(visible[0]+1)+"-"+(visible[1]+1)+" of "+pages.length:
    "Page "+(current+1)+" of "+pages.length;
  const percentage=pages.length>1?Math.round(current/(pages.length-1)*100):100;
  progress.style.width=percentage+"%";
  progressBar.setAttribute("aria-valuenow",String(percentage));
  thumbnailRail.querySelectorAll(".thumbnail").forEach((button,index)=>{
    if(visible.includes(index))button.setAttribute("aria-current","page");
    else button.removeAttribute("aria-current");
  });
  const active=thumbnailRail.querySelector('[aria-current="page"]');
  active?.scrollIntoView({block:"nearest",inline:"nearest",behavior:"smooth"});
}
function buildThumbnails(){
  const fragment=document.createDocumentFragment();
  pages.forEach((page,index)=>{
    const button=document.createElement("button");
    button.className="thumbnail";
    button.type="button";
    button.setAttribute("aria-label","Go to page "+page.pageNumber);
    const image=document.createElement("img");
    image.src=page.dataUrl;
    image.alt="";
    image.loading="lazy";
    const label=document.createElement("span");
    label.textContent=String(page.pageNumber);
    button.append(image,label);
    button.addEventListener("click",()=>{
      pageFlip?.flip(index);
      thumbnailPanel.hidden=true;
      thumbnailToggle.setAttribute("aria-expanded","false");
    });
    fragment.append(button);
  });
  thumbnailRail.replaceChildren(fragment);
  document.getElementById("thumb-total").textContent=pages.length+" pages";
}
function updateSize(){
  if(!pageFlip)return;
  const ratio=pages[0].width/pages[0].height;
  const availableHeight=Math.max(220,Math.min(stage.clientHeight-28,750));
  const narrow=stage.clientWidth<500;
  const availablePageWidth=Math.max(160,(stage.clientWidth-(narrow?20:36))/(narrow?1:2));
  const pageWidth=Math.max(160,Math.min(availableHeight*ratio,availablePageWidth));
  const pageHeight=Math.max(220,pageWidth/ratio);
  host.style.maxWidth=Math.min(stage.clientWidth,pageWidth*(narrow?1:2))+"px";
  pageFlip.update();
}
function initialize(){
  try{
    const first=pages.slice(0,Math.min(3,pages.length));
    Promise.all(first.map(page=>{const image=new Image();image.src=page.dataUrl;return image.decode()})).then(()=>{
      const ratio=pages[0].width/pages[0].height;
      const availableHeight=Math.max(220,Math.min(stage.clientHeight-28,750));
      const narrow=stage.clientWidth<500;
      const availablePageWidth=Math.max(160,(stage.clientWidth-(narrow?20:36))/(narrow?1:2));
      const pageWidth=Math.max(160,Math.min(availableHeight*ratio,availablePageWidth));
      const pageHeight=Math.max(220,pageWidth/ratio);
      host.style.maxWidth=Math.min(stage.clientWidth,pageWidth*(narrow?1:2))+"px";
      const elements=pages.map(page=>{
        const element=document.createElement("div");
        element.className="book-sheet";
        element.setAttribute("aria-label","Page "+page.pageNumber);
        const image=document.createElement("img");
        image.src=page.dataUrl;
        image.alt="Page "+page.pageNumber;
        image.draggable=false;
        element.append(image);
        return element;
      });
      pageFlip=new St.PageFlip(flipRoot,{
        width:pageWidth,
        height:pageHeight,
        size:"stretch",
        minWidth:160,
        maxWidth:750*ratio,
        minHeight:220,
        maxHeight:750,
        showCover:true,
        usePortrait:true,
        drawShadow:true,
        maxShadowOpacity:.3,
        flippingTime:650,
        mobileScrollSupport:true,
        autoSize:true
      });
      pageFlip.on("flip",updateReader);
      pageFlip.on("changeOrientation",updateReader);
      pageFlip.loadFromHTML(elements);
      buildThumbnails();
      updateReader();
      status.hidden=true;
      new ResizeObserver(updateSize).observe(stage);
    }).catch(error=>{
      console.error("Unable to initialize the offline flipbook.",error);
      status.textContent="The flipbook could not be opened in this browser.";
    });
  }catch(error){
    console.error("Unable to initialize the offline flipbook.",error);
    status.textContent="The flipbook could not be opened in this browser.";
  }
}
function closeThemeMenu(returnFocus){
  themeMenu.hidden=true;
  themeTrigger.setAttribute("aria-expanded","false");
  if(returnFocus)themeTrigger.focus();
}
themeTrigger.addEventListener("click",()=>{
  const opening=themeMenu.hidden;
  themeMenu.hidden=!opening;
  themeTrigger.setAttribute("aria-expanded",String(opening));
  if(opening){
    const checked=themeOptions.find(option=>option.getAttribute("aria-checked")==="true")||themeOptions[0];
    requestAnimationFrame(()=>checked.focus());
  }
});
themeOptions.forEach((option,index)=>{
  option.addEventListener("click",()=>{
    const nextTheme=option.dataset.theme;
    if(!nextTheme)return;
    document.body.dataset.theme=nextTheme;
    themeValue.textContent=option.querySelector("span:nth-child(2)").textContent;
    themeOptions.forEach(item=>{
      const selected=item===option;
      item.setAttribute("aria-checked",String(selected));
      item.querySelector(".theme-check").hidden=!selected;
    });
    closeThemeMenu(true);
  });
  option.addEventListener("keydown",event=>{
    let nextIndex=null;
    if(event.key==="ArrowDown")nextIndex=(index+1)%themeOptions.length;
    else if(event.key==="ArrowUp")nextIndex=(index-1+themeOptions.length)%themeOptions.length;
    else if(event.key==="Home")nextIndex=0;
    else if(event.key==="End")nextIndex=themeOptions.length-1;
    else if(event.key==="Escape"){event.preventDefault();closeThemeMenu(true);return}
    if(nextIndex!==null){event.preventDefault();themeOptions[nextIndex].focus()}
  });
});
document.addEventListener("pointerdown",event=>{
  if(!themeControl.contains(event.target))closeThemeMenu(false);
});
themeTrigger.addEventListener("keydown",event=>{
  if(event.key==="ArrowDown"||event.key==="Enter"||event.key===" "){
    event.preventDefault();
    if(themeMenu.hidden){
      themeMenu.hidden=false;
      themeTrigger.setAttribute("aria-expanded","true");
      const checked=themeOptions.find(option=>option.getAttribute("aria-checked")==="true")||themeOptions[0];
      checked.focus();
    }
  }else if(event.key==="Escape"&&!themeMenu.hidden){
    event.preventDefault();
    closeThemeMenu(true);
  }
});
function turnNext(){pageFlip?.flipNext()}
function turnPrevious(){pageFlip?.flipPrev()}
previousButtons.forEach(button=>button.addEventListener("click",turnPrevious));
nextButtons.forEach(button=>button.addEventListener("click",turnNext));
thumbnailToggle.addEventListener("click",()=>{
  thumbnailPanel.hidden=!thumbnailPanel.hidden;
  thumbnailToggle.setAttribute("aria-expanded",String(!thumbnailPanel.hidden));
});
document.getElementById("close-thumbnails").addEventListener("click",()=>{
  thumbnailPanel.hidden=true;
  thumbnailToggle.setAttribute("aria-expanded","false");
  thumbnailToggle.focus();
});
document.addEventListener("keydown",event=>{
  if(themeMenu.contains(event.target)||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
  if(event.key==="ArrowLeft"){event.preventDefault();turnPrevious()}
  else if(event.key==="ArrowRight"){event.preventDefault();turnNext()}
});
initialize();
</script>
</body>
</html>`;

  return { filename: safeFilename(pdf.name), html };
}
