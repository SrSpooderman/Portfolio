import React, { useEffect, useMemo, useRef, useState } from 'react';
import Uppy from '@uppy/core';
import Dashboard from '@uppy/react/dashboard';
import XHRUpload from '@uppy/xhr-upload';
import * as Dialog from '@radix-ui/react-dialog';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { api, getAccessToken } from './api';
import { ConfirmButton } from './ui-dialogs';
import '@uppy/react/css/style.css';
import 'react-image-crop/dist/ReactCrop.css';

function CropDialog({ asset, open, onOpenChange, onSaved, message }: {
  asset: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  message: (value: string) => void;
}) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
  const [completed, setCompleted] = useState<PixelCrop>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const image = imageRef.current;
    if (!image || !completed?.width || !completed.height) return;
    setSaving(true);
    try {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(completed.width * scaleX));
      canvas.height = Math.max(1, Math.round(completed.height * scaleY));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar el recorte.');
      context.drawImage(image, completed.x * scaleX, completed.y * scaleY, completed.width * scaleX, completed.height * scaleY, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo crear la imagen.')), 'image/webp', 0.9));
      const body = new FormData();
      body.append('file', new File([blob], `crop-${asset.original_filename.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' }));
      await api('admin/assets', { method: 'POST', body });
      await onSaved();
      message('Recorte guardado como un asset nuevo');
      onOpenChange(false);
    } catch (error) { message(String(error)); }
    finally { setSaving(false); }
  };

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content crop-dialog">
      <Dialog.Title>Recortar imagen</Dialog.Title><Dialog.Description>Selecciona el área y guárdala como un asset WebP nuevo.</Dialog.Description>
      <ReactCrop crop={crop} onChange={next => setCrop(next)} onComplete={next => setCompleted(next)}><img ref={imageRef} src={`/assets/${asset.storage_key}`} alt={asset.alt_text ?? ''}/></ReactCrop>
      <div className="dialog-actions"><Dialog.Close asChild><button>Cancelar</button></Dialog.Close><button className="primary" disabled={saving} onClick={() => void save()}>Guardar recorte</button></div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}

export function AssetsPanel({ assets, reload, message }: { assets: any[]; reload: () => Promise<void>; message: (value: string) => void }) {
  const [cropAsset, setCropAsset] = useState<any | null>(null);
  const [altValues, setAltValues] = useState<Record<string, string>>({});
  const uppy = useMemo(() => new Uppy({ restrictions: { maxFileSize: 20 * 1024 * 1024, allowedFileTypes: ['image/*', 'video/mp4', 'application/pdf'] }, autoProceed: false })
    .use(XHRUpload, {
      endpoint: '/api/v1/admin/assets',
      fieldName: 'file',
      withCredentials: true,
      limit: 3,
      onBeforeRequest: xhr => { const token = getAccessToken(); if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`); },
    }), []);

  useEffect(() => {
    const completed = () => { void reload(); message('Assets subidos correctamente'); };
    const failed = (_file: unknown, error: Error) => message(`Error de subida: ${error.message}`);
    uppy.on('complete', completed);
    uppy.on('upload-error', failed);
    return () => { uppy.off('complete', completed); uppy.off('upload-error', failed); uppy.destroy(); };
  }, [message, reload, uppy]);

  return <div className="panel-content assets-panel">
    <Dashboard uppy={uppy} height={260} proudlyDisplayPoweredByUppy={false} note="Imágenes, MP4 o PDF · máximo 20 MB"/>
    {assets.map(asset => <div className="resource-row" key={asset.id}>
      {asset.mime_type.startsWith('image/') && <img src={`/assets/${asset.storage_key}`} alt={asset.alt_text ?? ''}/>}<div>{asset.original_filename}<small>{asset.mime_type}</small></div>
      <label>Texto alternativo<input value={altValues[asset.id] ?? asset.alt_text ?? ''} onChange={event => setAltValues(current => ({ ...current, [asset.id]: event.target.value }))}/></label>
      <div className="row-actions">
        <button onClick={async () => { try { await api(`admin/assets/${asset.id}`, { method: 'PATCH', body: JSON.stringify({ alt_text: altValues[asset.id] ?? asset.alt_text ?? '' }) }); await reload(); message('Texto alternativo guardado'); } catch (error) { message(String(error)); } }}>Guardar alt</button>
        {asset.mime_type.startsWith('image/') && <button onClick={() => setCropAsset(asset)}>Recortar</button>}
        <ConfirmButton title="Eliminar asset" description={`Se eliminará «${asset.original_filename}» si no está referenciado.`} onConfirm={async () => { try { await api(`admin/assets/${asset.id}`, { method: 'DELETE' }); await reload(); } catch (error) { message(String(error)); } }}>Eliminar</ConfirmButton>
      </div>
    </div>)}
    {cropAsset && <CropDialog asset={cropAsset} open onOpenChange={open => { if (!open) setCropAsset(null); }} onSaved={reload} message={message}/>} 
  </div>;
}
