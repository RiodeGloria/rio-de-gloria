/* No third-party scripts or persistent credential storage on this page. */
'use strict';
(() => {
const $=s=>document.querySelector(s), categories=['Historia','Construcción','Cultos','Comunidad','Espacios','Pastores y obreros'];
const repo='https://api.github.com/repos/RiodeGloria/rio-de-gloria';
let token='', head='', baseTree='', source='', photos=[], original=[], history=[], draftDoc=null, busy=false, dragId=null;
const uploads=new Map();
const clone=x=>JSON.parse(JSON.stringify(x));
let content=null, originalContent=null;
const snapshot=()=>({photos:clone(photos),content:clone(content)});
const dirty=()=>JSON.stringify(photos)!==JSON.stringify(original)||JSON.stringify(content)!==JSON.stringify(originalContent);
const status=(message,error=false)=>{ $('#status').textContent=message;$('#status').classList.toggle('error',error); };
function lock(value){busy=value;document.body.classList.toggle('busy',value);$('#connect').disabled=value;$('#logout').disabled=value;$('#publish').disabled=value||!dirty();$('#upload').disabled=value;}
async function api(path,method='GET',body){
 const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',Authorization:'Bearer '+token};
 if(body)headers['Content-Type']='application/json';
 let res;try{res=await fetch(repo+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(90000)});}catch{throw new Error('No se pudo conectar a GitHub. Comprueba tu conexión. Tus cambios siguen en esta pestaña; no la cierres.');}
 if(!res.ok){const messages={401:'La clave no es válida o ha vencido. Sal del panel y vuelve a entrar con una clave vigente.',403:'GitHub no permite esta acción. Revisa Contents: Read and write y que la clave tenga acceso solo a rio-de-gloria. También puede haberse alcanzado el límite temporal de solicitudes.',404:'No se encontró el archivo o la clave no tiene acceso al repositorio.',409:'La página cambió mientras editabas. No se sobrescribió la versión nueva. Guarda tus fotos y vuelve a entrar para cargarla.',422:'GitHub rechazó el cambio. Puede haber una versión más reciente o una regla de protección. No se sobrescribió la página.'};throw new Error(messages[res.status]||'GitHub no pudo completar la operación ('+res.status+'). Tus cambios siguen en esta pestaña.');}
 return res.json();
}
function decode(b64){const bytes=Uint8Array.from(atob(b64.replace(/\s/g,'')),c=>c.charCodeAt(0));return new TextDecoder().decode(bytes);}
function safeImage(path){if(!/^(assets\/fotos\/|log\/)[a-zA-Z0-9_.-]+\.(webp|jpe?g|png)$/i.test(path))throw new Error('Se encontró una ruta de imagen no compatible. No se modificó la página.');return path;}
function loadSource(html){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const grid=doc.querySelector('#galeria .gallery-grid');
 if(!grid)throw new Error('No se encontró la galería. No se modificó la página.');
 const list=[...grid.querySelectorAll('.photo-card')].map((c,i)=>({id:'existing-'+i,src:safeImage(c.dataset.full),thumb:safeImage(c.querySelector('img').getAttribute('src')),description:c.dataset.caption||'',category:c.dataset.category,width:Number(c.querySelector('img').getAttribute('width'))||1600,height:Number(c.querySelector('img').getAttribute('height'))||1000}));
 if(list.some(p=>!categories.includes(p.category)))throw new Error('Hay categorías desconocidas. No se modificó la página.');
 draftDoc=doc;photos=list;original=clone(list);content=readContent(doc);const liveDoc=new DOMParser().parseFromString(liveSource,'text/html');content.sections=[...prepareSections(doc),...prepareSections(liveDoc,'live')];source='<!DOCTYPE html>\n'+doc.documentElement.outerHTML;liveSource='<!DOCTYPE html>\n'+liveDoc.documentElement.outerHTML;originalContent=clone(content);history=[];renderContent();
}
const sectionSpecs=[['header','Encabezado y menú','header'],['inicio','Portada','#inicio'],['welcome','Franja de bienvenida','.welcome-note'],['nosotros','Nuestra iglesia','#nosotros'],['historia','Nuestra historia','#historia'],['galeria','Presentación de la galería','#galeria'],['pastores','Pastores y obreros','#pastores'],['horarios','Presentación de los horarios','#horarios'],['transmision','Transmisión en vivo','#transmision'],['radio','Radio','#radio'],['cultos','Cultos anteriores','#cultos'],['ensenanza','Enseñanza','#ensenanza'],['contacto','Contacto','#contacto'],['footer','Pie de página','footer']];
const excluded='.gallery-grid,.gallery-filters,.service-photo-grid,.identity-grid,.socials,#whatsapp-contact,#email-contact,#radioStatus,#gallery-count,script,style,svg,noscript,[aria-hidden="true"]';
let liveSource='';
function prepareSections(doc,page='index'){
 const groups=[];let counter=0;
 const mark=node=>{if(!node.dataset.rioEdit)node.dataset.rioEdit=page+'-'+(++counter);return node.dataset.rioEdit;};
 // Reserve identifiers already saved in earlier sessions.
 doc.querySelectorAll('[data-rio-edit]').forEach(n=>{const match=n.dataset.rioEdit.match(/-(\d+)$/);if(match)counter=Math.max(counter,Number(match[1]));});
 const specs=page==='index'?sectionSpecs:[['live-page','Página del reproductor en vivo','body']];
 for(const [id,title,selector]of specs){
 const root=doc.querySelector(selector);if(!root)continue;const group={id:page+'-'+id,title,items:[]};
 // Custom inline elements preserve icons, line breaks, and existing child elements.
 const walker=doc.createTreeWalker(root,4);const texts=[];while(walker.nextNode()){const n=walker.currentNode,p=n.parentElement;if(!p.closest(excluded)&&!p.closest('rio-text')&&n.textContent.trim()&&/[\p{L}\p{N}]/u.test(n.textContent))texts.push(n);}
 for(const n of texts){const tag=doc.createElement('rio-text');tag.dataset.label=n.textContent.trim().replace(/\s+/g,' ').slice(0,65);tag.textContent=n.textContent;n.replaceWith(tag);mark(tag);}
 root.querySelectorAll('rio-text').forEach(n=>{if(n.closest(excluded))return;group.items.push({key:mark(n),kind:'text',label:n.dataset.label||'Texto',value:n.textContent.trim()});});
 root.querySelectorAll('img').forEach(n=>{if(n.closest(excluded))return;const key=mark(n),src=safeImage(n.getAttribute('src'));group.items.push({key,kind:'image',label:n.alt||'Fotografía',image:{id:'section-'+key,src,thumb:src,description:n.alt,width:n.width||1600,height:n.height||1000}});});
 root.querySelectorAll('a').forEach(n=>{if(n.closest(excluded)||n.getAttribute('href')==='admin.html')return;group.items.push({key:mark(n),kind:'link',label:'Enlace: '+n.textContent.trim().replace(/\s+/g,' ').slice(0,55),value:n.getAttribute('href')||'',attr:'href'});});
 if(page==='index'&&id==='inicio'){const key=mark(root),src=root.dataset.rioBackground||'assets/fotos/iglesia-4.webp';group.items.unshift({key,kind:'background',label:'Fotografía de fondo de la portada',image:{id:'background-'+key,src:safeImage(src),thumb:src,description:'Fondo de portada',width:1600,height:1000}});}
 if(page==='index'&&id==='contacto'){const n=doc.querySelector('#email-contact');const a=n.matches('a')?n:n.querySelector('a');group.items.push({key:mark(n),kind:'email',label:'Correo de contacto (vacío: ocultar)',value:a?.getAttribute('href')?.replace(/^mailto:/,'')||(n.textContent.includes('pendiente')?'':n.textContent.trim())});}
 if(page==='index'&&id==='radio'){const n=doc.querySelector('#radioPlayer source');group.items.push({key:mark(n),kind:'stream',label:'Dirección HTTPS de la señal de radio',value:n.getAttribute('src'),attr:'src'});}
 if(page==='index'&&id==='ensenanza'&&!root.querySelector('#learning-button[href]')){const n=root.querySelector('#learning-button');group.items.push({key:mark(n),kind:'learning',label:'Enlace de la plataforma (vacío: botón desactivado)',value:'',attr:'href'});}
 if(page==='live'){const n=doc.querySelector('#liveFrame');group.items.push({key:mark(n),kind:'stream',label:'Dirección HTTPS del reproductor incrustado',value:n.getAttribute('src'),attr:'src'});}
 groups.push(group);
 }
 const meta={id:page+'-metadata',title:page==='index'?'Título y descripción de la página':'Título y descripción del reproductor',items:[]};
 for(const [selector,label,attr]of [['title','Título de la pestaña',null],['meta[name=description]','Descripción para buscadores','content'],['meta[property="og:title"]','Título al compartir','content'],['meta[property="og:description"]','Descripción al compartir','content']]){const node=doc.querySelector(selector);if(node)meta.items.push({key:mark(node),kind:'metadata',label,value:attr?node.getAttribute(attr):node.textContent,attr});}
 groups.push(meta);return groups;
}
function sectionImages(){return content.sections.flatMap(g=>g.items.filter(i=>i.image).map(i=>i.image));}
function sectionURL(value,label,external=false){
 const v=value.trim();if(!v)return '';
 if(!external&&(/^(#[A-Za-z][\w-]*|(?:index|en-vivo)\.html(?:#[\w-]+)?)$/.test(v)||/^mailto:[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v)||/^tel:\+?[\d -]{7,20}$/.test(v)))return v;
 return validatedURL(v,label);
}
function validateSections(){for(const g of content.sections)for(const item of g.items){if(item.image)safeImage(item.image.src);else if(item.kind==='email'){if(item.value.trim()&&!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(item.value.trim()))throw new Error('Revisa el correo de contacto.');}else if(!['text','metadata'].includes(item.kind)){const url=sectionURL(item.value,item.label,item.kind==='stream');if(item.kind==='stream'&&!url)throw new Error('Completa '+item.label+'.');}}}
function renderSections(){
 const select=$('#section-select'),previous=select.value;select.replaceChildren(...content.sections.map(g=>element('option',{value:g.id,textContent:g.title})));if(content.sections.some(g=>g.id===previous))select.value=previous;
 showSection();
}
function showSection(){
 const group=content.sections.find(g=>g.id===$('#section-select').value),area=$('#section-fields');area.replaceChildren();if(!group)return;
 $('#section-title').textContent=group.title;
 group.items.forEach(item=>{
 const box=element('div',{className:'section-field'});box.dataset.fieldKey=item.key;box.dataset.kind=item.kind;
 if(item.image){box.append(element('h3',{textContent:item.label}),element('img',{className:'section-thumb',src:imageURL(item.image,true),alt:item.image.description}));const file=element('input',{type:'file',accept:'image/jpeg,image/png,image/webp'});file.addEventListener('change',()=>uploadService(file,item));box.append(labeled('Subir otra imagen',file),button('Elegir de la galería',()=>choosePhoto(item)));if(item.kind==='image')box.append(field('Descripción de la imagen',item.image.description,v=>item.image.description=v));}
 else box.append(field(item.label,item.value,v=>item.value=v,{multiline:item.kind==='text',maxLength:item.kind==='text'?5000:2000}));
 area.append(box);
 });
}
function applySections(doc,page){
 const old=new Map(originalContent.sections.flatMap(g=>g.items.map(i=>[i.key+':'+i.kind,i])));
 for(const group of content.sections.filter(g=>g.id.startsWith(page+'-')))for(const item of group.items){
 if(JSON.stringify(item)===JSON.stringify(old.get(item.key+':'+item.kind)))continue;
 let node=doc.querySelector('[data-rio-edit="'+item.key+'"]');if(!node)throw new Error('No se encontró un campo de '+group.title+'. Vuelve a cargar el panel.');
 node.dataset.rioCustom='true';
 if(item.kind==='metadata'){if(item.attr)node.setAttribute(item.attr,item.value);else node.textContent=item.value;}
 else if(item.kind==='email'){node.replaceChildren();if(item.value.trim()){const a=doc.createElement('a');a.href='mailto:'+item.value.trim();a.textContent=item.value.trim();node.append(a);}node.closest('.contact-card').hidden=!item.value.trim();}
 else if(item.kind==='text'){node.textContent=item.value;const p=node.closest('#church-location,#email-contact,#learning-status,#learning-note');if(p)p.dataset.rioCustom='true';}
 else if(item.kind==='image'){node.setAttribute('src',safeImage(item.image.src));node.alt=item.image.description;if(node.hasAttribute('width'))node.width=item.image.width;if(node.hasAttribute('height'))node.height=item.image.height;}
 else if(item.kind==='background'){node.dataset.rioBackground=safeImage(item.image.src);node.style.backgroundImage='linear-gradient(90deg,rgba(8,31,37,.94),rgba(8,31,37,.35)),url("'+safeImage(item.image.src)+'")';}
 else {const url=sectionURL(item.value,item.label,item.kind==='stream');
 if(node.id==='learning-button'){
 if(node.tagName!==(url?'A':'BUTTON')){const next=doc.createElement(url?'a':'button');for(const a of [...node.attributes])if(!['href','disabled','type'].includes(a.name))next.setAttribute(a.name,a.value);while(node.firstChild)next.append(node.firstChild);node.replaceWith(next);node=next;}
 if(!url){node.type='button';node.disabled=true;}else{node.removeAttribute('disabled');node.removeAttribute('type');}
 }
 if(url)node.setAttribute(item.attr,url);else node.removeAttribute(item.attr);
 }
 }
}
function previewSections(area){
 for(const group of content.sections){const details=element('details');details.append(element('summary',{textContent:group.title}));for(const item of group.items){if(item.image)details.append(element('img',{className:'section-thumb',src:imageURL(item.image,true),alt:item.image.description}));else if(item.value){details.append(element('p',{textContent:item.kind==='text'?item.value:item.label+': '+item.value}));}}area.append(details);}
}
$('#section-select').addEventListener('change',showSection);

const socialFields=[['social-facebook','Facebook'],['social-youtube','YouTube'],['social-tiktok','TikTok'],['social-instagram','Instagram'],['whatsapp-contact','WhatsApp']];
function readContent(doc){
 const text=id=>{const t=doc.getElementById(id)?.textContent.trim()||'';return t==='Declaración oficial pendiente de incorporar.'?'':t;};
 return {mission:text('mission-text'),vision:text('vision-text'),social:Object.fromEntries(socialFields.map(([id])=>[id,doc.getElementById(id)?.getAttribute('href')||''])),services:[...doc.querySelectorAll('#horarios .service-photo-card')].map((card,i)=>{const img=card.querySelector('img');return {day:card.querySelector('.service-photo-day').textContent.trim(),title:card.querySelector('h3').textContent.trim(),image:{id:'service-'+i,src:safeImage(img.getAttribute('src')),thumb:safeImage(img.getAttribute('src')),description:img.alt,width:img.width,height:img.height},times:[...card.querySelectorAll('.service-photo-hour')].map(row=>({label:row.querySelector('span').textContent.trim(),value:row.querySelector('time').getAttribute('datetime')}))};})};
}
function field(label,value,set,{type='text',maxLength=180,multiline=false}={}){
 const input=element(multiline?'textarea':'input',{value,maxLength});if(!multiline)input.type=type;else input.rows=7;
 input.addEventListener('input',()=>{if(busy)return;checkpoint();set(input.value);render();});return labeled(label,input);
}
function renderContent(){
 renderSections();
 const identity=$('#identity-editor');identity.replaceChildren(field('Misión',content.mission,v=>content.mission=v,{multiline:true,maxLength:4000}),field('Visión',content.vision,v=>content.vision=v,{multiline:true,maxLength:4000}));
 const social=$('#social-editor');social.replaceChildren(...socialFields.map(([id,label])=>field(label,content.social[id],v=>content.social[id]=v,{type:'url',maxLength:1000})));
 const grid=$('#schedule-editor');grid.replaceChildren();
 content.services.forEach((service,i)=>{
 const card=element('article',{className:'panel service-editor'}),img=element('img',{className:'service-thumb',src:imageURL(service.image,true),alt:service.image.description});
 card.append(element('h3',{textContent:'Tarjeta '+(i+1)}),img);
 const file=element('input',{type:'file',accept:'image/jpeg,image/png,image/webp'});file.addEventListener('change',()=>uploadService(file,service));
 card.append(labeled('Subir otra fotografía',file),button('Elegir de la galería',()=>choosePhoto(service)));
 card.append(field('Día o encabezado',service.day,v=>service.day=v),field('Nombre del culto / título',service.title,v=>service.title=v),field('Descripción de la fotografía',service.image.description,v=>service.image.description=v));
 service.times.forEach((time,j)=>{const row=element('div',{className:'time-fields'});row.append(field('Texto del horario '+(j+1),time.label,v=>time.label=v),field('Hora',time.value,v=>time.value=v,{type:'time'}));card.append(row);});grid.append(card);
 });
}
function choosePhoto(service){
 const dialog=element('dialog',{className:'photo-picker'}),top=element('div',{className:'heading'}),grid=element('div',{className:'preview-grid'});
 top.append(element('h2',{textContent:'Elige una fotografía'}),button('Cerrar',()=>dialog.close()));
 photos.forEach((p,i)=>{const b=button('',()=>{checkpoint();service.image=clone(p);dialog.close();renderContent();render();});b.append(element('img',{src:imageURL(p),alt:p.description,loading:'lazy'}),element('span',{textContent:(i+1)+'. '+p.description}));grid.append(b);});
 dialog.append(top,grid);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
}
async function uploadService(input,service){
 const file=input.files[0];input.value='';if(!file||busy)return;lock(true);status('Preparando la fotografía…');let bitmap;
 try{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('Elige una imagen JPG, PNG o WebP de hasta 20 MB.');
 bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});if(bitmap.width*bitmap.height>50000000)throw new Error('La imagen supera los 50 megapíxeles.');
 const full=await resize(bitmap,1600,.84),mini=await resize(bitmap,480,.78),id=crypto.randomUUID();
 uploads.set(id,{full:full.blob,thumb:mini.blob,fullURL:URL.createObjectURL(full.blob),thumbURL:URL.createObjectURL(mini.blob)});
 checkpoint();service.image={id,src:'assets/fotos/subida-'+id+'.webp',thumb:'assets/fotos/subida-'+id+'-mini.webp',description:service.image.description,width:full.width,height:full.height};renderContent();render();status('Fotografía preparada. Falta guardar y publicar.');
 }catch(error){status(error.message,true);}finally{bitmap?.close();lock(false);}
}
function validatedURL(value,label){
 if(!value.trim())return '';let url;try{url=new URL(value.trim());}catch{throw new Error('Revisa el enlace de '+label+': debe comenzar con https://.');}
 if(url.protocol!=='https:'||url.username||url.password)throw new Error('El enlace de '+label+' debe usar https:// y no incluir contraseñas.');return url.href;
}
function validateContent(){
 validateSections();
 socialFields.forEach(([id,label])=>validatedURL(content.social[id],label));
 content.services.forEach((s,i)=>{if(!s.day.trim()||!s.title.trim())throw new Error('Completa el día y título de la tarjeta '+(i+1)+'.');s.times.forEach(t=>{if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(t.value)||!t.label.trim())throw new Error('Completa el texto y la hora de la tarjeta '+(i+1)+'.');});safeImage(s.image.src);});
}
function applyContent(doc){
 applySections(doc,'index');
 // Leave untouched sections exactly as loaded, including existing placeholders.
 for(const [key,id]of [['mission','mission-text'],['vision','vision-text']])if(content[key]!==originalContent[key]){const p=doc.getElementById(id);p.textContent=content[key].trim();p.closest('article').hidden=!content[key].trim();}
 content.services.forEach((s,i)=>{
 if(JSON.stringify(s)===JSON.stringify(originalContent.services[i]))return;
 const card=doc.querySelectorAll('#horarios .service-photo-card')[i];card.querySelector('.service-photo-day').textContent=s.day.trim();card.querySelector('h3').textContent=s.title.trim();
 const img=card.querySelector('img');img.setAttribute('src',safeImage(s.image.src));img.alt=s.image.description;img.width=s.image.width;img.height=s.image.height;
 card.querySelectorAll('.service-photo-hour').forEach((row,j)=>{const data=s.times[j],time=row.querySelector('time'),[h,m]=data.value.split(':').map(Number);row.querySelector('span').textContent=data.label.trim();time.setAttribute('datetime',data.value);time.textContent=(h%12||12)+':'+String(m).padStart(2,'0')+' ';const small=doc.createElement('small');small.textContent=h<12?'a. m.':'p. m.';time.append(small);});
 });
 socialFields.forEach(([id,label])=>{
 if(content.social[id]===originalContent.social[id])return;
 const url=validatedURL(content.social[id],label),old=doc.getElementById(id),el=doc.createElement(url?'a':'span');el.id=id;
 if(url){el.href=url;el.target='_blank';el.rel='noopener noreferrer';el.textContent=label==='WhatsApp'?'Escríbenos por WhatsApp':label;}else {el.hidden=true;}
 if(old)old.replaceWith(el);else doc.querySelector('footer .socials').append(el);
 if(id==='whatsapp-contact')el.closest('.contact-card').hidden=!url;
 });
}
function renderPreview(){
 const area=$('#content-preview');area.replaceChildren();previewSections(area);
 const add=(title,text)=>{if(!text.trim())return;area.append(element('h3',{textContent:title}),element('p',{textContent:text}));};add('Misión',content.mission);add('Visión',content.vision);
 const grid=element('div',{className:'schedule-editor'});content.services.forEach(s=>{const card=element('article',{className:'panel'});card.append(element('img',{className:'service-thumb',src:imageURL(s.image,true),alt:s.image.description}),element('p',{textContent:s.day}),element('h3',{textContent:s.title}));s.times.forEach(t=>{const[h,m]=t.value.split(':').map(Number);card.append(element('p',{textContent:t.label+': '+(h%12||12)+':'+String(m).padStart(2,'0')+(h<12?' a. m.':' p. m.')}));});grid.append(card);});area.append(element('h3',{textContent:'Horarios'}),grid);
 socialFields.forEach(([id,label])=>{const url=validatedURL(content.social[id],label);if(url){const p=element('p');p.append(element('a',{textContent:label+' ↗',href:url,target:'_blank',rel:'noopener noreferrer'}));area.append(p);}});
}
document.querySelectorAll('[data-panel]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-panel]').forEach(tab=>{const selected=tab===b;tab.setAttribute('aria-pressed',String(selected));$('#panel-'+tab.dataset.panel).hidden=!selected;});}));

$('#connect-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;token=$('#token').value.trim();$('#token').value='';if(!token)return;lock(true);status('Conectando con tu página…');
 try{
 const metadata=await api('');
 if(metadata.permissions&&metadata.permissions.push===false)throw new Error('Esta cuenta no tiene permiso para modificar la página.');
 const ref=await api('/git/ref/heads/main');head=ref.object.sha;
 const commit=await api('/git/commits/'+head);baseTree=commit.tree.sha;
 const [file,liveFile]=await Promise.all([api('/contents/index.html?ref='+head),api('/contents/en-vivo.html?ref='+head)]);source=decode(file.content);liveSource=decode(liveFile.content);loadSource(source);
 $('#login').hidden=true;$('#editor').hidden=false;render();status('Página cargada. Elige el apartado que quieres modificar.');
 }catch(error){token='';status(error.message,true);}finally{lock(false);}
});
function checkpoint(){history.push(snapshot());if(history.length>50)history.shift();}
function changed(){render();}
function element(tag,props={}){const el=document.createElement(tag);Object.assign(el,props);return el;}
function labeled(text,control){const label=element('label',{textContent:text});label.append(control);return label;}
function button(label,fn,cls=''){const b=element('button',{type:'button',textContent:label,className:cls});b.addEventListener('click',fn);return b;}
function imageURL(photo,full=false){const up=uploads.get(photo.id);return up?up[full?'fullURL':'thumbURL']:photo[full?'src':'thumb'];}
function zoom(p){$('#zoom-image').src=imageURL(p,true);$('#zoom-image').alt=p.description;$('#zoom-caption').textContent=p.description;$('#zoom').showModal();}
function move(id,to){if(busy)return;const from=photos.findIndex(p=>p.id===id);if(from<0||!Number.isInteger(to)||to<0||to>=photos.length){status('Escribe una posición entre 1 y '+photos.length+'.',true);return;}if(from===to)return;checkpoint();const [p]=photos.splice(from,1);photos.splice(to,0,p);changed();status('Fotografía movida a la posición '+(to+1)+'. Falta guardar y publicar.');}
function render(){
 $('#total').textContent=photos.length;$('#changes').textContent=dirty()?'Tienes cambios sin publicar':'Sin cambios pendientes';$('#publish').disabled=busy||!dirty();$('#undo').disabled=!history.length;
 const category=$('#filter').value,term=$('#search').value.trim().toLocaleLowerCase('es');
 const grid=$('#photo-grid');grid.replaceChildren();
 photos.forEach((p,i)=>{
 if(category!=='Todas'&&p.category!==category)return;if(term&&!p.description.toLocaleLowerCase('es').includes(term))return;
 const card=element('article',{className:'photo'});card.dataset.id=p.id;
 const thumb=element('div',{className:'thumb'});const img=element('img',{src:imageURL(p),alt:p.description,loading:'lazy',draggable:true,tabIndex:0});
 img.addEventListener('click',()=>zoom(p));img.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();zoom(p);}});
 img.addEventListener('dragstart',e=>{dragId=p.id;e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='move';card.classList.add('dragging');});img.addEventListener('dragend',()=>{dragId=null;document.querySelectorAll('.drop-target,.dragging').forEach(x=>x.classList.remove('drop-target','dragging'));});
 card.addEventListener('dragover',e=>{if(dragId){e.preventDefault();e.dataTransfer.dropEffect='move';card.classList.add('drop-target');}});card.addEventListener('dragleave',()=>card.classList.remove('drop-target'));
 card.addEventListener('drop',e=>{e.preventDefault();if(dragId)move(dragId,photos.findIndex(x=>x.id===p.id));dragId=null;});
 thumb.append(img,element('span',{className:'number',textContent:String(i+1)}));if(uploads.has(p.id)&&!uploads.get(p.id).published)thumb.append(element('span',{className:'new',textContent:'Nueva'}));
 const body=element('div',{className:'card-body'}),description=element('input',{value:p.description,maxLength:180});description.setAttribute('aria-label','Descripción de la foto '+(i+1));
 description.addEventListener('change',()=>{if(description.value.trim()===p.description)return;checkpoint();p.description=description.value.trim()||'Fotografía de Río de Gloria';changed();});
 const cat=element('select');categories.forEach(c=>cat.append(element('option',{textContent:c,value:c,selected:p.category===c})));cat.addEventListener('change',()=>{checkpoint();p.category=cat.value;changed();});
 const pos=element('input',{type:'number',min:'1',max:String(photos.length),value:String(i+1)});pos.setAttribute('aria-label','Nueva posición de la foto '+(i+1));pos.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();move(p.id,Number(pos.value)-1);}});
 const row=element('div',{className:'move-row'});row.append(labeled('Mover a',pos),button('Mover',()=>move(p.id,Number(pos.value)-1)));
 const bottom=element('div',{className:'bottom-row'});const up=button('↑',()=>move(p.id,i-1));up.disabled=i===0;up.setAttribute('aria-label','Subir foto '+(i+1));const down=button('↓',()=>move(p.id,i+1));down.disabled=i===photos.length-1;down.setAttribute('aria-label','Bajar foto '+(i+1));
 bottom.append(up,down,button('Quitar',()=>{
 const extra=[...draftDoc.querySelectorAll('img')].some(im=>!im.closest('.gallery-grid')&&im.getAttribute('src')===p.src);
 const question='¿Quitar la fotografía '+(i+1)+' de la galería?'+(extra?' Esta imagen también está en otra sección de la página; allí se conservará.':'')+' Puedes deshacer antes de publicar.';
 if(!window.confirm(question))return;checkpoint();photos=photos.filter(x=>x.id!==p.id);changed();
 },'remove'));
 body.append(labeled('Descripción',description),labeled('Categoría',cat),row,bottom);card.append(thumb,body);grid.append(card);
 });$('#empty').hidden=grid.childElementCount>0;
}
$('#filter').addEventListener('change',render);$('#search').addEventListener('input',render);
$('#undo').addEventListener('click',()=>{if(busy||!history.length)return;const previous=history.pop();photos=previous.photos;content=previous.content;renderContent();changed();status('Último cambio deshecho.');});
$('#logout').addEventListener('click',()=>{if(busy)return;if(dirty()&&!confirm('Hay cambios sin publicar. ¿Salir y descartarlos?'))return;token='';uploads.forEach(u=>{URL.revokeObjectURL(u.fullURL);URL.revokeObjectURL(u.thumbURL);});uploads.clear();photos=[];original=[];content=null;originalContent=null;source='';draftDoc=null;history=[];$('#editor').hidden=true;$('#login').hidden=false;$('#photo-grid').replaceChildren();$('#preview-grid').replaceChildren();$('#zoom-image').removeAttribute('src');status('Sesión cerrada.');});
window.addEventListener('beforeunload',e=>{if(dirty()||busy){e.preventDefault();e.returnValue='';}});
async function resize(bitmap,size,quality){const ratio=Math.min(1,size/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',quality));if(!blob||blob.type!=='image/webp')throw new Error('Este navegador no permite preparar WebP. Abre el panel en Chrome actualizado.');return{blob,width:canvas.width,height:canvas.height};}
$('#upload').addEventListener('change',async e=>{
 const files=[...e.target.files];e.target.value='';if(busy||!files.length)return;if(files.length>20){status('Selecciona como máximo 20 fotografías a la vez.',true);return;}
 lock(true);const added=[],rejected=[];
 for(const [i,file] of files.entries()){
 status('Preparando fotografía '+(i+1)+' de '+files.length+'…');let bitmap;
 try{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('formato no compatible');if(file.size>20*1024*1024)throw new Error('supera 20 MB');
 bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});if(bitmap.width*bitmap.height>50000000)throw new Error('imagen demasiado grande (máximo 50 megapíxeles)');
 const full=await resize(bitmap,1600,.84),mini=await resize(bitmap,480,.78),id=crypto.randomUUID();
 const item={id,src:'assets/fotos/subida-'+id+'.webp',thumb:'assets/fotos/subida-'+id+'-mini.webp',description:file.name.replace(/\.[^.]+$/,'').slice(0,180)||'Fotografía de Río de Gloria',category:$('#filter').value==='Todas'?'Comunidad':$('#filter').value,width:full.width,height:full.height};
 uploads.set(id,{full:full.blob,thumb:mini.blob,fullURL:URL.createObjectURL(full.blob),thumbURL:URL.createObjectURL(mini.blob)});added.push(item);
 }catch(error){rejected.push(file.name+': '+error.message);}finally{bitmap?.close();}
 }
 if(added.length){checkpoint();photos.push(...added);$('#search').value='';render();}
 status(added.length+' fotografías agregadas al final. Falta guardar y publicar.'+(rejected.length?' No se cargaron: '+rejected.join('; '):''),rejected.length>0);lock(false);
});
$('#preview').addEventListener('click',()=>{
 try{validateContent();renderPreview();}catch(error){status(error.message,true);return;}
 const grid=$('#preview-grid');grid.replaceChildren();photos.forEach((p,i)=>{const b=button('',()=>zoom(p));b.append(element('img',{src:imageURL(p),alt:p.description,loading:'lazy'}),element('span',{textContent:(i+1)+'. '+p.category+' · '+p.description}));grid.append(b);});$('#preview-dialog').showModal();
});$('#close-preview').addEventListener('click',()=>$('#preview-dialog').close());$('#close-zoom').addEventListener('click',()=>$('#zoom').close());
function buildHTML(){
 const doc=new DOMParser().parseFromString(source,'text/html'),grid=doc.querySelector('#galeria .gallery-grid');
 if(JSON.stringify(photos)!==JSON.stringify(original)){grid.replaceChildren();
 photos.forEach((p,i)=>{
 const b=doc.createElement('button');b.className='photo-card';b.type='button';b.dataset.category=p.category;b.dataset.full=safeImage(p.src);b.dataset.caption=p.description;b.setAttribute('aria-label','Ampliar: '+p.description+' ('+(i+1)+')');
 const img=doc.createElement('img');img.src=safeImage(p.thumb);img.width=p.width;img.height=p.height;img.alt=p.description;img.setAttribute('loading','lazy');img.setAttribute('decoding','async');const span=doc.createElement('span');span.textContent=p.category+' ';const arrow=doc.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';span.append(arrow);b.append(img,span);grid.append(b);
 });
 }
 applyContent(doc);
 return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML+'\n';
}
function summary(){const old=new Set(original.map(p=>p.id)),now=new Set(photos.map(p=>p.id));return photos.length+' fotografías en total · '+photos.filter(p=>!old.has(p.id)).length+' nuevas · '+original.filter(p=>!now.has(p.id)).length+' retiradas de la galería. También se guardarán todos los cambios de textos, fotografías, horarios y enlaces en las secciones editadas.';}
$('#publish').addEventListener('click',()=>{if(busy||!dirty())return;try{validateContent();}catch(error){status(error.message,true);return;}$('#summary').textContent=summary();$('#confirm').showModal();});$('#cancel-publish').addEventListener('click',()=>$('#confirm').close());
async function base64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('No se pudo preparar la imagen.'));reader.readAsDataURL(blob);});}
$('#confirm-publish').addEventListener('click',async()=>{
 if(busy||!dirty())return;$('#confirm').close();lock(true);status('Comprobando la versión actual…');
 try{
 const ref=await api('/git/ref/heads/main');if(ref.object.sha!==head)throw new Error('La página cambió desde que entraste. No se sobrescribió nada. Conserva esta pestaña para consultar tus cambios y abre otra sesión para cargar la versión nueva.');
 validateContent();
 const entries=[],pending=[...new Map([...photos,...content.services.map(s=>s.image),...sectionImages()].map(p=>[p.id,p])).values()].filter(p=>uploads.has(p.id)&&!uploads.get(p.id).published);
 for(const [i,p] of pending.entries()){
 status('Subiendo fotografía '+(i+1)+' de '+pending.length+'…');const upload=uploads.get(p.id);
 for(const [key,path]of [['full',p.src],['thumb',p.thumb]]){const blob=await api('/git/blobs','POST',{content:await base64(upload[key]),encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});}
 }
 const html=buildHTML();entries.push({path:'index.html',mode:'100644',type:'blob',content:html});
 const liveDoc=new DOMParser().parseFromString(liveSource,'text/html');applySections(liveDoc,'live');const liveHTML='<!DOCTYPE html>\n'+liveDoc.documentElement.outerHTML;
 if(JSON.stringify(content.sections.filter(g=>g.id.startsWith('live-')))!==JSON.stringify(originalContent.sections.filter(g=>g.id.startsWith('live-'))))entries.push({path:'en-vivo.html',mode:'100644',type:'blob',content:liveHTML});
 const tree=await api('/git/trees','POST',{base_tree:baseTree,tree:entries});
 const commit=await api('/git/commits','POST',{message:'Actualizar página desde el panel de administración',tree:tree.sha,parents:[head]});
 status('Guardando los cambios…');
 try{await api('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});}catch(error){const check=await api('/git/ref/heads/main').catch(()=>null);if(check?.object.sha!==commit.sha)throw error;}
 pending.forEach(p=>{uploads.get(p.id).published=true;});head=commit.sha;baseTree=tree.sha;source=html;liveSource=liveHTML;draftDoc=new DOMParser().parseFromString(source,'text/html');original=clone(photos);originalContent=clone(content);history=[];render();
 status('Cambios guardados en GitHub. La publicación de la página está en proceso. Puedes seguir el estado con el enlace de abajo.');
 const link=element('a',{href:'https://github.com/RiodeGloria/rio-de-gloria/actions',textContent:' Ver estado de publicación ↗',target:'_blank',rel:'noopener noreferrer'});$('#status').append(link);
 }catch(error){status(error.message,true);}finally{lock(false);}
});
})();


