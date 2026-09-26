import React,{useEffect,useState} from 'react';
import {Puck} from '@puckeditor/core';
import {config,Renderer} from './renderer';
import {editorOverrides,cloneBlock} from './builder';
async function request(path='',method='GET',body){const response=await fetch('/api/components'+path,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok)throw Error(typeof result.detail==='string'?result.detail:'No se pudo guardar la sección');return result}
const emptySection=()=>({type:'Container',props:{id:`Container-${crypto.randomUUID()}`,content:[],direction:'column',gap:24,appearance:{padding:32}}});
export function SectionsManager(){
 const [sections,setSections]=useState([]),[editing,setEditing]=useState(null),[name,setName]=useState(''),[data,setData]=useState(null),[preview,setPreview]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const refresh=async()=>setSections(await request());
 useEffect(()=>{refresh().catch(e=>setMessage(e.message))},[]);
 async function action(fn){setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 function open(section){setEditing(section);setName(section.name);setData({content:[section.content],root:{}});setPreview(false);setMessage('')}
 async function save(value=data){
  if(!name.trim())throw Error('Escribe un nombre para la sección.');
  const wrapper=emptySection();wrapper.props.appearance={padding:0};wrapper.props.content=value.content;
  const content=value.content.length===1?value.content[0]:wrapper;
  const saved=await request(editing.id?'/'+editing.id:'',editing.id?'PATCH':'POST',{name:name.trim(),content});setEditing({...saved,id:saved.id});await refresh();setMessage('Sección guardada. Ya puedes insertarla desde el editor de páginas.');
 }
 if(editing)return <div className="section-editor"><div className="editor-toolbar"><button onClick={()=>{if(confirm('¿Salir? Los cambios sin guardar se perderán.'))setEditing(null)}}>← Secciones</button><input aria-label="Nombre de la sección" placeholder="Nombre de la sección" value={name} maxLength={100} onChange={e=>setName(e.target.value)}/><button onClick={()=>setPreview(!preview)}>{preview?'Volver al editor':'Previsualizar sección'}</button><button className="primary" disabled={busy} onClick={()=>action(()=>save())}>Guardar sección</button><span role="status">{message}</span></div>{preview?<div className="public"><Renderer data={data}/></div>:<Puck config={config} data={data} onChange={setData} onPublish={value=>action(()=>save(value))} overrides={editorOverrides} iframe={{enabled:true}}/>}</div>;
 return <><p>Crea secciones con grids, textos, imágenes y botones. Cada sección es una composición reutilizable; las copias insertadas en páginas se editan de forma independiente.</p><button className="primary" onClick={()=>open({name:'Nueva sección',content:emptySection()})}>Crear sección +</button>{message&&<p className="notice" role="status">{message}</p>}<div className="sections-list">{sections.map(section=><article className="page-card" key={section.id}><div><h3>{section.name}</h3><small>{section.updated_at?`Actualizada ${new Date(section.updated_at).toLocaleString('es')}`:''}</small></div><button onClick={()=>open(section)}>Editar sección</button><button disabled={busy} onClick={()=>action(async()=>{await request('','POST',{name:(section.name+' (copia)').slice(0,100),content:cloneBlock(section.content)});await refresh()})}>Duplicar</button><button disabled={busy} onClick={()=>{if(confirm('¿Eliminar la sección de la biblioteca? Las copias ya insertadas se conservan.'))action(async()=>{await request('/'+section.id,'DELETE');await refresh()})}}>Eliminar</button></article>)}</div>{!sections.length&&<p>Aún no hay secciones. Crea la primera y diseña su contenido en el editor.</p>}</>
}
