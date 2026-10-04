/* No third-party scripts or persistent credential storage on this page. */
'use strict';
(() => {
const $=s=>document.querySelector(s), categories=['Historia','Construcción','Cultos','Comunidad','Espacios'];
const repo='https://api.github.com/repos/RiodeGloria/rio-de-gloria';
let token='', head='', baseTree='', source='', photos=[], original=[], history=[], draftDoc=null, busy=false, dragId=null;
const uploads=new Map();
const clone=x=>JSON.parse(JSON.stringify(x));
const snapshot=()=>JSON.stringify(photos);
const dirty=()=>snapshot()!==JSON.stringify(original);
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
 draftDoc=doc;photos=list;original=clone(list);history=[];
}
$('#connect-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;token=$('#token').value.trim();$('#token').value='';if(!token)return;lock(true);status('Conectando con tu página…');
 try{
 const metadata=await api('');
 if(metadata.permissions&&metadata.permissions.push===false)throw new Error('Esta cuenta no tiene permiso para modificar la página.');
 const ref=await api('/git/ref/heads/main');head=ref.object.sha;
 const commit=await api('/git/commits/'+head);baseTree=commit.tree.sha;
 const file=await api('/contents/index.html?ref='+head);source=decode(file.content);loadSource(source);
 $('#login').hidden=true;$('#editor').hidden=false;render();status('Galería cargada. Puedes preparar tus cambios.');
 }catch(error){token='';status(error.message,true);}finally{lock(false);}
});
function checkpoint(){history.push(clone(photos));if(history.length>50)history.shift();}
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
$('#undo').addEventListener('click',()=>{if(busy||!history.length)return;photos=history.pop();changed();status('Último cambio deshecho.');});
$('#logout').addEventListener('click',()=>{if(busy)return;if(dirty()&&!confirm('Hay cambios sin publicar. ¿Salir y descartarlos?'))return;token='';uploads.forEach(u=>{URL.revokeObjectURL(u.fullURL);URL.revokeObjectURL(u.thumbURL);});uploads.clear();photos=[];original=[];source='';draftDoc=null;history=[];$('#editor').hidden=true;$('#login').hidden=false;$('#photo-grid').replaceChildren();$('#preview-grid').replaceChildren();$('#zoom-image').removeAttribute('src');status('Sesión cerrada.');});
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
 const grid=$('#preview-grid');grid.replaceChildren();photos.forEach((p,i)=>{const b=button('',()=>zoom(p));b.append(element('img',{src:imageURL(p),alt:p.description,loading:'lazy'}),element('span',{textContent:(i+1)+'. '+p.category+' · '+p.description}));grid.append(b);});$('#preview-dialog').showModal();
});$('#close-preview').addEventListener('click',()=>$('#preview-dialog').close());$('#close-zoom').addEventListener('click',()=>$('#zoom').close());
function buildHTML(){
 const doc=new DOMParser().parseFromString(source,'text/html'),grid=doc.querySelector('#galeria .gallery-grid');grid.replaceChildren();
 photos.forEach((p,i)=>{
 const b=doc.createElement('button');b.className='photo-card';b.type='button';b.dataset.category=p.category;b.dataset.full=safeImage(p.src);b.dataset.caption=p.description;b.setAttribute('aria-label','Ampliar: '+p.description+' ('+(i+1)+')');
 const img=doc.createElement('img');img.src=safeImage(p.thumb);img.width=p.width;img.height=p.height;img.alt=p.description;img.loading='lazy';img.decoding='async';const span=doc.createElement('span');span.textContent=p.category+' ';const arrow=doc.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';span.append(arrow);b.append(img,span);grid.append(b);
 });
 return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML+'\n';
}
function summary(){const old=new Set(original.map(p=>p.id)),now=new Set(photos.map(p=>p.id));return photos.length+' fotografías en total · '+photos.filter(p=>!old.has(p.id)).length+' nuevas · '+original.filter(p=>!now.has(p.id)).length+' retiradas de la galería. También se guardará el orden, las descripciones y las categorías.';}
$('#publish').addEventListener('click',()=>{if(busy||!dirty())return;$('#summary').textContent=summary();$('#confirm').showModal();});$('#cancel-publish').addEventListener('click',()=>$('#confirm').close());
async function base64(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('No se pudo preparar la imagen.'));reader.readAsDataURL(blob);});}
$('#confirm-publish').addEventListener('click',async()=>{
 if(busy||!dirty())return;$('#confirm').close();lock(true);status('Comprobando la versión actual…');
 try{
 const ref=await api('/git/ref/heads/main');if(ref.object.sha!==head)throw new Error('La página cambió desde que entraste. No se sobrescribió nada. Conserva esta pestaña para consultar tus cambios y abre otra sesión para cargar la versión nueva.');
 const entries=[],pending=photos.filter(p=>uploads.has(p.id)&&!uploads.get(p.id).published);
 for(const [i,p] of pending.entries()){
 status('Subiendo fotografía '+(i+1)+' de '+pending.length+'…');const upload=uploads.get(p.id);
 for(const [key,path]of [['full',p.src],['thumb',p.thumb]]){const blob=await api('/git/blobs','POST',{content:await base64(upload[key]),encoding:'base64'});entries.push({path,mode:'100644',type:'blob',sha:blob.sha});}
 }
 const html=buildHTML();entries.push({path:'index.html',mode:'100644',type:'blob',content:html});
 const tree=await api('/git/trees','POST',{base_tree:baseTree,tree:entries});
 const commit=await api('/git/commits','POST',{message:'Actualizar galería desde el panel de fotografías',tree:tree.sha,parents:[head]});
 status('Guardando los cambios…');
 try{await api('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});}catch(error){const check=await api('/git/ref/heads/main').catch(()=>null);if(check?.object.sha!==commit.sha)throw error;}
 pending.forEach(p=>{uploads.get(p.id).published=true;});head=commit.sha;baseTree=tree.sha;source=html;draftDoc=new DOMParser().parseFromString(source,'text/html');original=clone(photos);history=[];render();
 status('Cambios guardados en GitHub. La publicación de la página está en proceso. Puedes seguir el estado con el enlace de abajo.');
 const link=element('a',{href:'https://github.com/RiodeGloria/rio-de-gloria/actions',textContent:' Ver estado de publicación ↗',target:'_blank',rel:'noopener noreferrer'});$('#status').append(link);
 }catch(error){status(error.message,true);}finally{lock(false);}
});
})();
