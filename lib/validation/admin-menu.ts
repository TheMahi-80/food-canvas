/**
 * Zod schemas for admin menu mutations. The same schemas run in the browser (instant feedback)
 * and again in every Server Action (the only check that counts). Limits mirror the database
 * constraints in supabase/migrations so a valid form never fails in the database.
 */
import { z } from "zod";
import { messages } from "@/lib/i18n";
import { optionalText, optionalUuid, requiredText, takaSchema } from "./admin-fields";

const v = messages.admin.validation;

export { MAX_PRICE, takaSchema, toAsciiDigits } from "./admin-fields";

export const MAX_VARIANTS = 20;
export const MAX_ADDONS = 30;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export const categoryInputSchema = z.object({
  nameBn: requiredText(80),
  nameEn: optionalText(80),
  isActive: z.boolean(),
});
export type CategoryInput = z.output<typeof categoryInputSchema>;
/** What the form holds (all text); the schema turns it into CategoryInput. */
export interface CategoryFormValues {
  nameBn: string;
  nameEn: string;
  isActive: boolean;
}

export const categoryUpdateSchema = categoryInputSchema.extend({ id: z.uuid() });

export const deleteCategorySchema = z.discriminatedUnion("mode", [
  z.object({ id: z.uuid(), mode: z.literal("empty") }),
  z.object({ id: z.uuid(), mode: z.literal("reassign"), targetId: z.uuid({ error: v.chooseCategory }) }),
  z.object({ id: z.uuid(), mode: z.literal("delete_products"), confirmCount: z.number().int().min(1) }),
]);
export type DeleteCategoryInput = z.output<typeof deleteCategorySchema>;

export const reorderSchema = z
  .array(z.uuid())
  .min(1)
  .max(1000)
  .refine((ids) => new Set(ids).size === ids.length, "duplicate ids");

export const toggleSchema = z.object({
  id: z.uuid(),
  field: z.enum(["is_active", "is_available", "is_featured"]),
  value: z.boolean(),
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
const optionSchema = z.object({
  id: optionalUuid,
  nameBn: requiredText(80),
  nameEn: optionalText(80),
  price: takaSchema,
  isAvailable: z.boolean(),
});
export type OptionInput = z.output<typeof optionSchema>;

/** Same name twice in one list would break the database's per-product uniqueness. */
function rejectDuplicateNames(options: { nameBn: string }[], ctx: z.RefinementCtx, path: "variants" | "addons") {
  const seen = new Set<string>();
  options.forEach((option, index) => {
    const key = option.nameBn.trim().toLocaleLowerCase();
    if (seen.has(key)) ctx.addIssue({ code: "custom", message: v.duplicateOption, path: [path, index, "nameBn"] });
    seen.add(key);
  });
}

export const productInputSchema = z
  .object({
    categoryId: z.uuid({ error: v.chooseCategory }),
    nameBn: requiredText(120),
    nameEn: optionalText(120),
    descriptionBn: optionalText(600),
    descriptionEn: optionalText(600),
    /** Base price. Ignored (set to the lowest size price) when the product has sizes. */
    price: z.unknown(),
    isActive: z.boolean(),
    isAvailable: z.boolean(),
    isFeatured: z.boolean(),
    variants: z.array(optionSchema).max(MAX_VARIANTS, v.tooManyOptions(MAX_VARIANTS)),
    addons: z.array(optionSchema).max(MAX_ADDONS, v.tooManyOptions(MAX_ADDONS)),
    removeImage: z.boolean(),
  })
  // Runs even when other fields are invalid, so every error shows on the first submit.
  .refine((product) => hasVariants(product) || takaSchema.safeParse(product.price).success, {
    path: ["price"],
    when: () => true,
    error: (issue) => takaSchema.safeParse((issue.input as { price?: unknown } | undefined)?.price).error?.issues[0]?.message ?? v.priceRequired,
  })
  .superRefine((product, ctx) => {
    rejectDuplicateNames(product.variants, ctx, "variants");
    rejectDuplicateNames(product.addons, ctx, "addons");
  })
  .transform((product) => ({
    ...product,
    price: product.variants.length > 0 ? Math.min(...product.variants.map((variant) => variant.price)) : takaSchema.parse(product.price),
  }));

function hasVariants(product: { variants?: unknown }): boolean {
  return Array.isArray(product.variants) && product.variants.length > 0;
}
export type ProductInput = z.output<typeof productInputSchema>;

/** What the form holds (prices as typed text); the schema turns it into ProductInput. */
export interface OptionFormValues {
  id: string | null;
  nameBn: string;
  nameEn: string;
  price: string;
  isAvailable: boolean;
}
export interface ProductFormValues {
  categoryId: string;
  nameBn: string;
  nameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  price: string;
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  variants: OptionFormValues[];
  addons: OptionFormValues[];
  removeImage: boolean;
}

export const productIdSchema = z.uuid();

// ---------------------------------------------------------------------------
// Slugs (used in public URLs for categories, internal for products)
// ---------------------------------------------------------------------------

/** Lowercase ASCII slug from free text; "" when nothing usable remains (e.g. Bangla only). */
export function slugify(text: string | null | undefined, maxLength = 60): string {
  return (text ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, maxLength)
    .replace(/^-+|-+$/g, "");
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A slug that satisfies the database pattern: "<base>-<suffix>" or "<fallback>-<suffix>". */
export function slugWithSuffix(text: string | null | undefined, fallback: string, suffix: string): string {
  const base = slugify(text) || fallback;
  const slug = suffix ? `${base}-${suffix}` : base;
  if (!SLUG_PATTERN.test(slug)) throw new Error("invalid slug");
  return slug;
}
