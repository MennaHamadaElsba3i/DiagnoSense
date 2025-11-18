
export const setCookie = (name, value, days) => {
     const expires = new Date();
     expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
     document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

export const setJsonCookie = (name, value, days) => {
     const jsonValue = JSON.stringify(value);
     setCookie(name, jsonValue, days);
};

export const getCookie = (name) => {
     const nameEQ = name + "=";
     const ca = document.cookie.split(';');
     for (let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) === ' ') c = c.substring(1, c.length);
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
     }
     return null;
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
     document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
};