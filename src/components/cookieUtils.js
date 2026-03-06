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
     if (val !== null) return val;

     val = sessionStorage.getItem(name);
     return val;
};

export const getJsonCookie = (name) => {
     const value = getCookie(name);
     if (value) {
          try {
               return JSON.parse(value);
          } catch (e) {
               return null;
          }
     }
     return null;
};

export const deleteCookie = (name) => {
     localStorage.removeItem(name);
     sessionStorage.removeItem(name);
};