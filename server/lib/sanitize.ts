import xss, { IFilterXSSOptions } from "xss";

const plainTextOptions: IFilterXSSOptions = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style"],
};

export function sanitizePlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return xss(value, plainTextOptions).trim();
}