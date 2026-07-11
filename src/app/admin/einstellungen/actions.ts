"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { setSetting, EASYBILL_API_KEY } from "@/lib/settings";

export type FormState = { ok?: boolean; error?: string } | undefined;

export async function saveEasybillKey(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const key = String(formData.get("easybillApiKey") ?? "").trim();
  await setSetting(EASYBILL_API_KEY, key);
  revalidatePath("/admin/einstellungen");
  return { ok: true };
}
