export const setCookie = (name, value, days_or_remember) => {
     // Overloading `days_or_remember`: if it is precisely the boolean `true` or `false`,
     // we treat it as the `rememberMe` flag. Previously it was `days` (number).
     // When `true`, use localStorage (persistent). Otherwise use sessionStorage (session-only).
     const rememberMe = days_or_remember === true;

     if (rememberMe) {
          localStorage.setItem(name, value);
          // ensure it's removed from sessionStorage so we don't have duplicates
          sessionStorage.removeItem(name);
     } else {
          sessionStorage.setItem(name, value);
          localStorage.removeItem(name);
     }
};

export const setJsonCookie = (name, value, rememberMe) => {
     const jsonValue = JSON.stringify(value);
     setCookie(name, jsonValue, rememberMe);
};

export const getCookie = (name) => {
     // Check localStorage first, fallback to sessionStorage
     let val = localStorage.getItem(name);
     if (name === 'user') console.log(`[cookieUtils] getCookie("${name}") from localStorage:`, val);
     if (val !== null) return val;

     val = sessionStorage.getItem(name);
     if (name === 'user') console.log(`[cookieUtils] getCookie("${name}") from sessionStorage:`, val);
     return val;
};

export const getJsonCookie = (name) => {
     const value = getCookie(name);
     if (name === 'user') console.log(`[cookieUtils] getJsonCookie("${name}") value before parse:`, value);
     if (value) {
          try {
               const parsed = JSON.parse(value);
               if (name === 'user') console.log(`[cookieUtils] getJsonCookie("${name}") parsed successfully:`, parsed);
               return parsed;
          } catch (e) {
               if (name === 'user') console.error(`[cookieUtils] getJsonCookie("${name}") parse error:`, e);
               return null;
          }
     }
     if (name === 'user') console.log(`[cookieUtils] getJsonCookie("${name}") returned null because value was empty`);
     return null;
};

export const deleteCookie = (name) => {
     localStorage.removeItem(name);
     sessionStorage.removeItem(name);
};