export const setCookie = (name, value, days_or_remember) => {
     // We always use localStorage to ensure auth state persists across new tabs,
     // as requested by the goal: "Migrate the storage mechanism from sessionStorage to localStorage"
     localStorage.setItem(name, value);
     // ensure it's removed from sessionStorage so we don't have duplicates
     sessionStorage.removeItem(name);
};

export const setJsonCookie = (name, value, rememberMe) => {
     const jsonValue = JSON.stringify(value);
     setCookie(name, jsonValue, rememberMe);
};

export const getCookie = (name) => {
     let val = localStorage.getItem(name);
     if (name === 'user') console.log(`[cookieUtils] getCookie("${name}") from localStorage:`, val);
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