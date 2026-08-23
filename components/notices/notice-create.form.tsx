'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { NOTICE_AUDIENCE_LABELS, NOTICE_AUDIENCES, NOTICE_CATEGORY_LABELS, NOTICE_CATEGORIES, NOTICE_IMAGE } from '@/constants';

import type { ErrorDto } from '@/lib/result';
import { NoticeCreateInput, NoticeCreateOutput, NoticeCreateSchema } from '@/lib/schemas';

import { Button, FormMessage, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner, Textarea } from '@/components/ui';

import type { NoticeFormProps } from './notices.types';

/*
  Publishing or amending a notice. The text fields ride react-hook-form with the same schema the
  server validates against, but the submit is a `fetch` to a route handler, not a Server Action —
  a Server Action cannot carry the optional image, and the route re-checks the bytes by their magic
  number, which is the check that counts. This one form serves both cases: a `notice` prop flips it
  to edit, which PATCHes by id rather than POSTing anew.
*/

/** The RHF field names a server error can be mapped back onto; anything else lands in the banner. */
const FORM_FIELDS = ['title', 'body', 'audience', 'category', 'departmentId'] as const;

function isFormField(field: string): field is (typeof FORM_FIELDS)[number] {
  return (FORM_FIELDS as readonly string[]).includes(field);
}

export function NoticeCreateForm({ departments, notice, onDone }: NoticeFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = Boolean(notice);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<NoticeCreateInput, undefined, NoticeCreateOutput>({
    resolver: zodResolver(NoticeCreateSchema),
    defaultValues: {
      title: notice?.title ?? '',
      body: notice?.body ?? '',
      audience: notice?.audience ?? NOTICE_AUDIENCES.EVERYONE,
      category: notice?.category ?? NOTICE_CATEGORIES.GENERAL,
      departmentId: notice?.departmentId ?? '',
    },
  });

  // The department control appears only for a department notice; watched so it mounts and unmounts live.
  const audience = useWatch({ control, name: 'audience' });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setFile(event.target.files?.[0] ?? null);
  };

  const applyServerErrors = (serverErrors: ErrorDto[]): void => {
    // Field errors go onto their control; the first error that names no known field becomes the
    // banner, so a failure that isn't tied to a field still gets said out loud.
    const bannerErrors = serverErrors.filter(error => !(error.field && isFormField(error.field)));

    for (const error of serverErrors) {
      if (error.field && isFormField(error.field)) {
        setError(error.field, { message: error.error });
      }
    }

    if (bannerErrors.length > 0) {
      setFormError(bannerErrors[0].error);
    }
  };

  const handleFormSubmit = async (values: NoticeCreateOutput): Promise<void> => {
    setFormError(null);
    setIsSubmitting(true);

    const body = new FormData();
    body.append('title', values.title);
    body.append('body', values.body ?? '');
    body.append('audience', values.audience);
    body.append('category', values.category);
    body.append('departmentId', values.departmentId ?? '');
    if (file) {
      body.append('image', file);
    }

    const url = notice ? `/api/notices/${notice.noticeId}` : '/api/notices';
    const method = notice ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, { method, body, credentials: 'same-origin' });
      const json: unknown = await response.json().catch(() => null);

      if (response.ok) {
        toast.success(isEdit ? 'Notice updated.' : 'Notice published.');
        router.refresh();
        onDone?.();

        return;
      }

      const serverErrors = extractErrors(json);
      if (serverErrors.length > 0) {
        applyServerErrors(serverErrors);
      } else {
        setFormError('Could not save the notice. Try again.');
      }
    } catch {
      // A rejected fetch — the connection dropped. Surface a retry rather than a frozen form.
      setFormError('Could not save the notice — check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notice-title">Title</Label>
        <Input id="notice-title" aria-invalid={Boolean(errors.title)} {...register('title')} />
        {errors.title && <FormMessage>{errors.title.message ?? 'Enter a title.'}</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notice-body">
          Body <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Textarea id="notice-body" rows={5} aria-invalid={Boolean(errors.body)} {...register('body')} />
        {errors.body && <FormMessage>{errors.body.message ?? 'That body is too long.'}</FormMessage>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notice-audience">Audience</Label>
        <Controller
          control={control}
          name="audience"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="notice-audience" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(NOTICE_AUDIENCES).map(value => (
                  <SelectItem key={value} value={value}>
                    {NOTICE_AUDIENCE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {audience === NOTICE_AUDIENCES.DEPARTMENT && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="notice-department">Department</Label>
          <Controller
            control={control}
            name="departmentId"
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger id="notice-department" className="w-full" aria-invalid={Boolean(errors.departmentId)}>
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(department => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.departmentId && <FormMessage>{errors.departmentId.message ?? 'Choose the department this notice is for.'}</FormMessage>}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notice-category">Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="notice-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(NOTICE_CATEGORIES).map(value => (
                  <SelectItem key={value} value={value}>
                    {NOTICE_CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notice-image">
          Image <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input id="notice-image" type="file" accept={NOTICE_IMAGE.ACCEPT} className="cursor-pointer" onChange={handleFileChange} />
        <p className="text-muted-foreground text-xs">
          PNG, JPEG or WebP.{isEdit ? ' Choosing a new image replaces the current one; leaving this empty keeps it.' : ''}
        </p>
      </div>

      <div className="border-border flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="size-4" />}
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Publish notice'}
        </Button>
      </div>
    </form>
  );
}

/** Pull the `errors` array out of a route handler's failure body, tolerating anything malformed. */
function extractErrors(json: unknown): ErrorDto[] {
  if (json && typeof json === 'object' && 'errors' in json && Array.isArray(json.errors)) {
    return json.errors.filter((error): error is ErrorDto => typeof error === 'object' && error !== null && 'error' in error);
  }

  return [];
}
