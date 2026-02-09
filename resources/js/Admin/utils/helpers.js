export const generateInitials = (name = '') => {
  return name.split(' ').map(word => word[0]).join('').toUpperCase();
};
export const toPascalCase = value => value.replace(/[-_ ]+/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
export const toTitleCase = value => {
  if (!value) return '';
  return value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
export function getColor(v, a = 1) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return "";
  }
  const val = getComputedStyle(document.documentElement).getPropertyValue(`--theme-${v}`).trim();
  return v.includes('-rgb') ? `rgba(${val}, ${a})` : val;
}
export const getFont = () => {
  if (typeof window === 'undefined') {
    return;
  }
  return getComputedStyle(document.body).fontFamily.trim();
};