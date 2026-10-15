"use client";

import { useEffect, useId, useMemo } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { saveHours } from "@/app/admin/settings-actions";
import { StatusText } from "@/components/admin/status-text";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { messages } from "@/lib/i18n";
import { hoursInputSchema, type HoursInput } from "@/lib/validation/admin-settings";
import type { OpeningHoursDay } from "@/types/menu";

const c = messages.admin.common;
const k = messages.admin.settings;

type HoursFormValues = { days: OpeningHoursDay[] };
const formSchema = z.object({ days: hoursInputSchema });

export function HoursForm({ hours }: { hours: OpeningHoursDay[] }) {
  const action = useAdminAction();
  const baseId = useId();
  const defaults = useMemo<HoursFormValues>(() => ({ days: hours.map((d) => ({ ...d })) }), [hours]);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<HoursFormValues, unknown, { days: HoursInput }>({
    resolver: zodResolver(formSchema) as Resolver<HoursFormValues, unknown, { days: HoursInput }>,
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const days = useWatch({ control, name: "days" });

  function copySundayToAll() {
    const sunday = getValues("days.0");
    for (let i = 1; i < 7; i++) {
      setValue(`days.${i}.opensAt`, sunday.opensAt, { shouldDirty: true });
      setValue(`days.${i}.closesAt`, sunday.closesAt, { shouldDirty: true });
      setValue(`days.${i}.isClosed`, sunday.isClosed, { shouldDirty: true });
    }
  }

  const submit = handleSubmit((values) => action.run(() => saveHours(values.days), { success: k.hoursSaved }));

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <p className="text-sm text-muted-foreground">{k.hoursIntro}</p>
      <ul className="space-y-2">
        {defaults.days.map((day, i) => {
          const id = (f: string) => `${baseId}-${i}-${f}`;
          const closedAllDay = days?.[i]?.isClosed ?? day.isClosed;
          const error = errors.days?.[i]?.closesAt?.message ?? errors.days?.[i]?.opensAt?.message;
          return (
            <li key={day.dayOfWeek} className="rounded-lg border border-border p-3">
              <fieldset className="flex flex-wrap items-end gap-3">
                <legend className="mb-2 w-full font-medium sm:mb-0 sm:w-28">{k.days[day.dayOfWeek]}</legend>
                <div className="space-y-1">
                  <label htmlFor={id("open")} className="text-xs text-muted-foreground">
                    {k.opensAt}
                  </label>
                  <Input id={id("open")} type="time" className={closedAllDay ? "w-32 opacity-50" : "w-32"} aria-invalid={error ? true : undefined} aria-describedby={error ? id("error") : undefined} {...register(`days.${i}.opensAt`)} />
                </div>
                <div className="space-y-1">
                  <label htmlFor={id("close")} className="text-xs text-muted-foreground">
                    {k.closesAt}
                  </label>
                  <Input id={id("close")} type="time" className={closedAllDay ? "w-32 opacity-50" : "w-32"} aria-invalid={error ? true : undefined} aria-describedby={error ? id("error") : undefined} {...register(`days.${i}.closesAt`)} />
                </div>
                <Controller
                  control={control}
                  name={`days.${i}.isClosed`}
                  render={({ field }) => (
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4 accent-primary" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                      {k.closedAllDay}
                    </label>
                  )}
                />
                {error && (
                  <p id={id("error")} role="alert" className="w-full text-sm text-destructive">
                    {error}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={action.pending}>
          {action.pending ? c.saving : k.saveHours}
        </Button>
        <Button type="button" variant="outline" onClick={copySundayToAll}>
          {k.applyToAll}
        </Button>
      </div>
      <StatusText status={action.status} />
    </form>
  );
}
