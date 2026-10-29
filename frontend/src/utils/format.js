export const money = value => new Intl.NumberFormat("en-PK", {
  style: "currency", currency: "PKR", maximumFractionDigits: 2
}).format(Number(value || 0));

export const dateTime = value => value ? new Date(value).toLocaleString() : "—";
