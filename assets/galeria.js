'use strict';
document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#menu-principal');
function closeMenu() { menu.classList.remove('is-open'); menuButton.setAttribute('aria-expanded','false'); }
menuButton.addEventListener('click', () => { const open=menu.classList.toggle('is-open'); menuButton.setAttribute('aria-expanded',String(open)); });
menu.addEventListener('click', e=>{ if(e.target.closest('a')) closeMenu(); });
document.addEventListener('keydown',e=>{if(e.key==='Escape') closeMenu();});
document.addEventListener('click',e=>{if(!e.target.closest('header')) closeMenu();});
const cards = [...document.querySelectorAll('.photo-card')];
const filters = [...document.querySelectorAll('[data-filter]')];
const more = document.querySelector('#show-more');
let category='Todas', limit=12, filtered=cards;
function renderGallery(){
 filtered=cards.filter(c=>category==='Todas'||c.dataset.category===category);
 const visible=new Set(filtered.slice(0,limit));
 cards.forEach(c=>{c.hidden=!visible.has(c);});
 more.hidden=limit>=filtered.length;
 document.querySelector('#gallery-count').textContent=`${Math.min(limit,filtered.length)} de ${filtered.length} fotografías`;
 filters.forEach(f=>f.setAttribute('aria-pressed',String(f.dataset.filter===category)));
}
filters.forEach(f=>f.addEventListener('click',()=>{category=f.dataset.filter;limit=12;renderGallery();}));
more.addEventListener('click',()=>{const previous=limit;limit+=12;renderGallery();filtered[previous]?.focus({preventScroll:true});});
renderGallery();
const dialog=document.querySelector('#photo-dialog'), large=document.querySelector('#photo-large');
const caption=document.querySelector('#photo-caption'), counter=document.querySelector('#photo-counter');
let current=0, opener=null;
function showPhoto(index){
 current=(index+filtered.length)%filtered.length;
 const card=filtered[current];
 large.src=card.dataset.full;large.alt=card.dataset.caption;
 caption.textContent=card.dataset.caption;counter.textContent=`${current+1} / ${filtered.length}`;
}
cards.forEach(card=>card.addEventListener('click',()=>{opener=card;showPhoto(filtered.indexOf(card));dialog.showModal();document.body.classList.add('viewer-open');}));
document.querySelector('#photo-close').addEventListener('click',()=>dialog.close());
document.querySelector('#photo-prev').addEventListener('click',()=>showPhoto(current-1));
document.querySelector('#photo-next').addEventListener('click',()=>showPhoto(current+1));
dialog.addEventListener('close',()=>{document.body.classList.remove('viewer-open');large.removeAttribute('src');opener?.focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();showPhoto(current+1);}if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(current-1);}});
let touchStart=null;
large.addEventListener('touchstart',e=>{touchStart=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
large.addEventListener('touchmove',e=>{if(e.touches.length>1)touchStart=null;},{passive:true});
large.addEventListener('touchend',e=>{if(!touchStart)return;const t=e.changedTouches[0],dx=t.clientX-touchStart.x,dy=t.clientY-touchStart.y;touchStart=null;if((window.visualViewport?.scale||1)>1.05)return;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)showPhoto(current+(dx<0?1:-1));},{passive:true});
const cfg=window.RIO_CONFIG||{};
for(const [key,id] of [['mision','mission-text'],['vision','vision-text'],['ubicacion','church-location']]){if(cfg[key])document.getElementById(id).textContent=cfg[key];}
function httpsURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null;}catch{return null;}}
function linkAt(id,url,label){const a=document.createElement('a');a.href=url;a.textContent=label;document.getElementById(id).replaceChildren(a);}
if(/^\d{8,15}$/.test(cfg.whatsapp))linkAt('whatsapp-contact','https://wa.me/'+cfg.whatsapp,'Escríbenos por WhatsApp');
if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.correo))linkAt('email-contact','mailto:'+cfg.correo,cfg.correo);
for(const key of ['facebook','youtube','tiktok']){const url=httpsURL(cfg[key]);if(url)linkAt('social-'+key,url,{facebook:'Facebook',youtube:'YouTube',tiktok:'TikTok'}[key]);}
const teaching=httpsURL(cfg.ensenanza);
if(teaching){const old=document.querySelector('#learning-button'),a=document.createElement('a');a.className=old.className;a.id=old.id;a.href=teaching;a.textContent='Comenzar a aprender';old.replaceWith(a);document.querySelector('#learning-status').textContent='Aprendamos juntos';document.querySelector('#learning-note').textContent='Entra a nuestra plataforma de enseñanza bíblica.';}
