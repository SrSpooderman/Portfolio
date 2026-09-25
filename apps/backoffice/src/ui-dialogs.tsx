import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const pageSchema = z.object({
  title: z.string().trim().min(2, 'Escribe al menos dos caracteres.'),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Usa letras minúsculas, números y guiones.'),
});

type PageValues = z.infer<typeof pageSchema>;

export function CreatePageDialog({ open, isFirstPage, onOpenChange, onCreate }: {
  open: boolean;
  isFirstPage: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: PageValues & { is_home: boolean }) => Promise<void>;
}) {
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<PageValues>({
    resolver: zodResolver(pageSchema),
    defaultValues: { title: '', slug: '' },
  });
  useEffect(() => { if (!open) reset(); }, [open, reset]);

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay"/>
      <Dialog.Content className="dialog-content" aria-describedby="create-page-description">
        <Dialog.Title>Nueva página</Dialog.Title>
        <Dialog.Description id="create-page-description">Crea el documento y ábrelo directamente en el editor.</Dialog.Description>
        <form onSubmit={handleSubmit(async values => { await onCreate({ ...values, is_home: isFirstPage }); onOpenChange(false); })}>
          <label>Título<input autoFocus {...register('title')} onChange={event => {
            register('title').onChange(event);
            setValue('slug', event.target.value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), { shouldValidate: true });
          }}/>{errors.title && <span className="field-error">{errors.title.message}</span>}</label>
          <label>Slug<input {...register('slug')}/>{errors.slug && <span className="field-error">{errors.slug.message}</span>}</label>
          <div className="dialog-actions"><Dialog.Close asChild><button type="button">Cancelar</button></Dialog.Close><button className="primary" type="submit" disabled={isSubmitting}>Crear página</button></div>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

export function ConfirmButton({ title, description, children, className, onConfirm }: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  onConfirm: () => void | Promise<void>;
}) {
  return <AlertDialog.Root>
    <AlertDialog.Trigger asChild><button className={className}>{children}</button></AlertDialog.Trigger>
    <AlertDialog.Portal>
      <AlertDialog.Overlay className="dialog-overlay"/>
      <AlertDialog.Content className="dialog-content">
        <AlertDialog.Title>{title}</AlertDialog.Title>
        <AlertDialog.Description>{description}</AlertDialog.Description>
        <div className="dialog-actions"><AlertDialog.Cancel asChild><button>Cancelar</button></AlertDialog.Cancel><AlertDialog.Action asChild><button className="danger-button" onClick={() => void onConfirm()}>Confirmar</button></AlertDialog.Action></div>
      </AlertDialog.Content>
    </AlertDialog.Portal>
  </AlertDialog.Root>;
}
