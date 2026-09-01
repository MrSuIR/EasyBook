const rubleFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export function formatPrice(value) {
  return rubleFormatter.format(value);
}

export function normalizeImageUrl(image) {
  if (!image?.original_url) return null;
  return image.original_url.startsWith("/")
    ? image.original_url
    : `/${image.original_url}`;
}
