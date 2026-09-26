import React, {useEffect, useState} from 'react';
import {usePuck} from '@puckeditor/core';

const text=label=>({type:'text',label});
const number=(label,min=0,max=1000)=>({type:'number',label,min,max});
const select=(label,values)=>({type:'select',label,options:values.map(([value,label])=>({value,label}))});
const safe=url=>typeof url==='string'&&/^(https?:\/\/|mailto:|\/|#)/i.test(url)&&!url.startsWith('//')?url:'#';
const object=(label,objectFields)=>({type:'object',label,objectFields});
export const styleFields={
 background:text('Fondo (color CSS)'),color:text('Color del texto'),padding:number('Espacio interior (px)'),margin:number('Margen exterior (px)'),radius:number('Bordes redondeados (px)',0,300),borderWidth:number('Grosor del borde',0,30),borderColor:text('Color del borde'),maxWidth:number('Ancho máximo (0 = libre)',0,2400),minHeight:number('Altura mínima',0,1500),fontSize:number('Tamaño de texto',0,180),fontFamily:select('Tipografía',[['inherit','Heredada'],['Manrope, sans-serif','Manrope'],['DM Sans, sans-serif','DM Sans'],['Georgia, serif','Georgia'],['monospace','Monoespaciada']]),align:select('Alineación',[['left','Izquierda'],['center','Centro'],['right','Derecha']]),shadow:select('Sombra',[['none','Ninguna'],['0 12px 35px #0002','Suave'],['0 20px 60px #0004','Intensa']])
};
const positionFields={span:number('Columnas que ocupa',1,12),rowSpan:number('Filas que ocupa',1,12),column:number('Columna inicial (0 = automática)',0,12),row:number('Fila inicial (0 = automática)',0,100)};
const common={appearance:object('Estilos',styleFields),placement:object('Posición en el grid',positionFields),mobile:object('Móvil (hasta 700 px)',{...positionFields,padding:number('Espacio interior',0,300),fontSize:number('Tamaño de texto',0,100),hidden:select('Visibilidad',[[false,'Visible'],[true,'Oculto']])})};
const slot={type:'slot'};
const num=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
function vars(p={}){
 const s=p.appearance||{},g=p.placement||{},m=p.mobile||{};
 return {background:s.background||undefined,color:s.color||undefined,padding:s.padding===undefined?undefined:num(s.padding),margin:s.margin===undefined?undefined:num(s.margin),borderRadius:num(s.radius),border:s.borderWidth?`${num(s.borderWidth)}px solid ${s.borderColor||'currentColor'}`:undefined,maxWidth:s.maxWidth?num(s.maxWidth):undefined,minHeight:s.minHeight?num(s.minHeight):undefined,fontSize:s.fontSize?num(s.fontSize):undefined,fontFamily:s.fontFamily||undefined,textAlign:s.align||undefined,boxShadow:s.shadow||undefined,'--span':Math.min(12,Math.max(1,num(g.span,1))),'--row-span':Math.min(12,Math.max(1,num(g.rowSpan,1))),'--column':num(g.column)?num(g.column):'auto','--row':num(g.row)?num(g.row):'auto','--mobile-span':Math.min(12,Math.max(1,num(m.span,1))),'--mobile-row-span':Math.max(1,num(m.rowSpan,1)),'--mobile-column':num(m.column)?num(m.column):'auto','--mobile-row':num(m.row)?num(m.row):'auto','--mobile-padding':m.padding===undefined?undefined:`${num(m.padding)}px`,'--mobile-font':m.fontSize?`${num(m.fontSize)}px`:undefined};
}
export function Box({children,...props}){return <div ref={props.puck?.dragRef} className={`builder-block ${props.mobile?.hidden?'mobile-hidden':''} ${props.appearance?.color?'custom-color':''} ${props.appearance?.fontSize?'custom-font':''}`} style={vars(props)}>{children}</div>}
function Grid({content:Content,columns=3,mobileColumns=1,gap=24,rowHeight=0,alignItems='stretch'}){return <Content className="builder-grid" style={{display:'grid','--columns':Math.max(1,Math.min(12,columns)),'--mobile-columns':Math.max(1,Math.min(6,mobileColumns)),gap:num(gap),gridAutoRows:rowHeight?`minmax(${num(rowHeight)}px, auto)`:'auto',alignItems}}/>}
function Container({content:Content,direction='column',gap=20,justify='flex-start',align='stretch'}){return <Content className="builder-container" style={{display:'flex',flexDirection:direction,gap:num(gap),justifyContent:justify,alignItems:align,flexWrap:'wrap'}}/>}
function Photo({src,alt,fit='cover',height=300,link}){const image=src?<img src={safe(src)} alt={alt||''} style={{width:'100%',height:height?num(height):'auto',objectFit:fit,display:'block'}}/>:<div className="image-placeholder">Selecciona una imagen</div>;return link?<a href={safe(link)}>{image}</a>:image}
function Heading({text,level='h2'}){const Tag=['h1','h2','h3','h4'].includes(level)?level:'h2';return <Tag className="builder-heading">{text}</Tag>}
function Paragraph({text}){return <p className="builder-paragraph">{text}</p>}
function Button({label,url,background='#292f25',color='#ffffff',radius=30}){return <a className="builder-button" style={{background,color,borderRadius:num(radius)}} href={safe(url)}>{label}</a>}
export function AssetField({value,onChange,name}){
 const [assets,setAssets]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const refresh=()=>fetch('/api/assets').then(async r=>{if(!r.ok)throw Error('No se pudo cargar la biblioteca');setAssets(await r.json())}).catch(e=>setError(e.message));
 useEffect(()=>{refresh()},[]);
 return <div className="asset-field"><label>URL de imagen<input aria-label={name||'URL de imagen'} value={value||''} onChange={e=>onChange(e.target.value)}/></label>{value&&<img src={safe(value)} alt="Vista previa"/>}<select aria-label="Seleccionar de la biblioteca" value={assets.some(a=>a.url===value)?value:''} onChange={e=>onChange(e.target.value)}><option value="">Seleccionar de la biblioteca…</option>{assets.map(a=><option key={a.id} value={a.url}>{a.filename}</option>)}</select><label>Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={async e=>{const file=e.target.files[0];if(!file)return;setBusy(true);setError('');try{const body=new FormData();body.append('file',file);const r=await fetch('/api/assets',{method:'POST',body});if(!r.ok)throw Error('No se pudo subir (máximo 10 MB)');const a=await r.json();onChange(a.url);refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}}/></label><button type="button" onClick={()=>onChange('')}>Quitar imagen</button>{error&&<p role="alert">{error}</p>}</div>
}
const imageField={type:'custom',label:'Imagen',render:props=><AssetField {...props}/>};
const basic={
 Grid:{label:'Grid libre',fields:{content:slot,columns:number('Columnas escritorio',1,12),mobileColumns:number('Columnas móvil',1,6),gap:number('Separación (px)',0,200),rowHeight:number('Altura mínima de fila',0,1000),alignItems:select('Alineación vertical',[['stretch','Estirar'],['start','Arriba'],['center','Centro'],['end','Abajo']])},defaultProps:{content:[],columns:3,mobileColumns:1,gap:24},render:Grid},
 Container:{label:'Contenedor',fields:{content:slot,direction:select('Disposición',[['column','Vertical'],['row','Horizontal']]),gap:number('Separación',0,200),justify:select('Distribución',[['flex-start','Inicio'],['center','Centro'],['flex-end','Final'],['space-between','Separados']]),align:select('Alineación',[['stretch','Estirar'],['flex-start','Inicio'],['center','Centro'],['flex-end','Final']])},defaultProps:{content:[],direction:'column',gap:20,appearance:{padding:24}},render:Container},
 Heading:{label:'Título',fields:{text:{type:'textarea',label:'Texto'},level:select('Nivel',[['h1','H1'],['h2','H2'],['h3','H3'],['h4','H4']])},defaultProps:{text:'Tu título',level:'h2'},render:Heading},
 Paragraph:{label:'Párrafo',fields:{text:{type:'textarea',label:'Texto'}},defaultProps:{text:'Escribe tu historia.'},render:Paragraph},
 Photo:{label:'Imagen libre',fields:{src:imageField,alt:text('Descripción accesible'),height:number('Altura (0 = natural)',0,1500),fit:select('Ajuste',[['cover','Cubrir'],['contain','Contener']]),link:text('Enlace opcional')},defaultProps:{src:'',alt:'',height:300,fit:'cover'},render:Photo},
 Button:{label:'Botón / enlace',fields:{label:text('Texto'),url:text('Enlace'),background:text('Fondo'),color:text('Color'),radius:number('Radio',0,200)},defaultProps:{label:'Hablemos ↗',url:'#contacto',background:'#292f25',color:'#ffffff',radius:30},render:Button},
 Decoration:{label:'Retirado',fields:{},defaultProps:{},render:()=>null}
};
export function enhanceConfig(legacy){
 const all={...legacy,...basic};
 return {categories:{layout:{title:'Estructura y grid',components:['Grid','Container']},elements:{title:'Elementos libres',components:['Heading','Paragraph','Photo','Button','Spacer']},legacy:{title:'Compatibilidad',visible:false,components:[...Object.keys(legacy).filter(k=>k!=='Spacer'),'Decoration']}},components:Object.fromEntries(Object.entries(all).map(([name,c])=>[name,{...c,inline:true,fields:{...c.fields,...common},render:props=><Box {...props}>{c.render(props)}</Box>}]))};
}
export const cloneBlock=block=>{
 const clone=structuredClone(block);
 function walk(value){if(!value||typeof value!=='object')return;if(value.type&&value.props){value.props.id=`${value.type}-${crypto.randomUUID()}`;}Object.values(value).forEach(v=>{if(v&&typeof v==='object')walk(v)})}
 walk(clone);return clone;
};
const node=(type,props)=>({type,props:{id:`${type}-${crypto.randomUUID()}`,...props}});
const heading=(text,level='h2')=>node('Heading',{text,level});
const paragraph=text=>node('Paragraph',{text});
const container=content=>node('Container',{content,gap:20,direction:'column'});
// Convert fixed presets into actual nested editable elements. The original block is replaced only on request.
export function decompose(block){
 const p=block.props;let result;
 switch(block.type){
 case 'Hero':result=node('Grid',{columns:1,mobileColumns:1,gap:40,appearance:{padding:48},content:[container([paragraph(p.eyebrow),heading(p.title,'h1'),paragraph(p.description),node('Button',{label:p.button,url:p.link,background:'#292f25',color:'#fff',radius:30})])]});break;
 case 'About':result=container([heading(p.title),paragraph(p.description),paragraph(p.detail)]);break;
 case 'Text':result=container([heading(p.title),paragraph(p.text)]);break;
 case 'Contact':result=container([heading(p.title),paragraph(p.text),node('Button',{label:p.email,url:`mailto:${p.email}`})]);break;
 case 'CTA':result=container([heading(p.title),node('Button',{label:p.label,url:p.url})]);break;
 case 'Image':result=container([node('Photo',{src:p.src,alt:p.alt,height:300}),paragraph(p.caption)]);break;
 case 'Projects':result=container([heading(p.title),node('Grid',{columns:3,mobileColumns:1,gap:24,content:(p.items||[]).map(x=>node('Container',{appearance:{background:x.color,padding:24},content:[node('Photo',{src:x.image||'',alt:x.title,height:240}),heading(x.title,'h3'),paragraph(x.category),paragraph(x.description),node('Button',{label:'Ver proyecto ↗',url:x.url})]}))})]);break;
 case 'Skills':result=container([heading(p.title),node('Grid',{columns:3,mobileColumns:1,gap:24,content:(p.items||[]).map(x=>container([heading(x.title,'h3'),paragraph(x.description)]))})]);break;
 default:return block;
 }
 result.props.id=p.id;result.props.appearance={...result.props.appearance,...p.appearance};result.props.placement=p.placement;result.props.mobile=p.mobile;return result;
}
const convertible=['Hero','About','Text','Contact','CTA','Image','Projects','Skills'];
async function libraryApi(path='',method='GET',body){const r=await fetch('/api/components'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'No se pudo guardar el componente');return data}
export function ComponentLibrary(){
 const {selectedItem,appState,dispatch,getSelectorForId}=usePuck();
 const [items,setItems]=useState([]),[name,setName]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 const refresh=async()=>setItems(await libraryApi());
 useEffect(()=>{refresh().catch(e=>setMessage(e.message))},[]);
 async function action(fn){setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 function replace(block){const target=getSelectorForId(selectedItem.props.id);dispatch({type:'replace',destinationIndex:target.index,destinationZone:target.zone,data:block})}
 function insert(block){const copy=cloneBlock(block);dispatch({type:'set',state:{...appState,data:{...appState.data,content:[...appState.data.content,copy]}}});setMessage('Copia añadida al final. Arrástrala a cualquier grid o contenedor.')}
 return <div className="component-library"><div className="library-actions"><button onClick={()=>setOpen(!open)}>{open?'Cerrar biblioteca':'Secciones'}</button><span>{selectedItem?`Seleccionado: ${selectedItem.type}`:'Selecciona un bloque o contenedor para personalizarlo'}</span>{selectedItem&&convertible.includes(selectedItem.type)&&<button onClick={()=>{replace(decompose(selectedItem));setMessage('Convertido en elementos independientes. Puedes mover, añadir y borrar cada elemento.')}}>Descomponer en elementos</button>}</div>{open&&<div className="library-panel"><h3>Secciones</h3><p>Crea o edita secciones en el apartado Secciones del backoffice. También puedes guardar aquí el bloque seleccionado. Las inserciones son copias independientes.</p><form onSubmit={e=>{e.preventDefault();action(async()=>{await libraryApi('','POST',{name,content:selectedItem});await refresh();setName('');setMessage('Sección guardada en la biblioteca.')})}}><input aria-label="Nombre de la sección" placeholder="Nombre de mi sección" value={name} maxLength={100} onChange={e=>setName(e.target.value)} required/><button disabled={!selectedItem||busy||!name.trim()}>Guardar seleccionado</button></form><div className="library-cards">{items.map(item=><div key={item.id}><strong>{item.name}</strong><button onClick={()=>insert(item.content)}>Insertar copia</button><button disabled={!selectedItem||busy} onClick={()=>{if(confirm(`¿Actualizar «${item.name}» con la selección? Las copias existentes no cambian.`))action(async()=>{await libraryApi('/'+item.id,'PATCH',{name:item.name,content:selectedItem});await refresh();setMessage('Sección actualizada.')})}}>Actualizar con selección</button><button disabled={busy} onClick={()=>{if(confirm('¿Eliminar de la biblioteca? Las copias existentes se conservan.'))action(async()=>{await libraryApi('/'+item.id,'DELETE');await refresh()})}}>Eliminar</button></div>)}</div>{!items.length&&<p>Todavía no has guardado secciones.</p>}</div>}{message&&<p className="library-message" role="status">{message}</p>}</div>
}

export const editorOverrides={header:()=> <ComponentLibrary/>};
