export const isArabicText = (value) => {
  if (!value) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);
};

export const getDirection = (value) => (isArabicText(value) ? "rtl" : "ltr");
export const getTextAlign = (value) => (isArabicText(value) ? "right" : "left");
