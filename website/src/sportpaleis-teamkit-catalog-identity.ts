type CatalogIdentityItem = {
  articleId?: string | null;
  catalogSnapshot?: {
    catalogProductId: string;
    catalogVariantId?: string | null;
    supplierArticleNumber: string;
    colorLabel: string;
  } | null;
};

export function teamkitCatalogSelectionIdentity(item: CatalogIdentityItem): string | null {
  if (item.articleId) return item.articleId;
  const snapshot = item.catalogSnapshot;
  if (!snapshot) return null;
  return `${snapshot.catalogProductId}:${snapshot.catalogVariantId ?? snapshot.supplierArticleNumber}:${snapshot.supplierArticleNumber}:${snapshot.colorLabel}`;
}
