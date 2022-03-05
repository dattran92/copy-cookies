const form = document.getElementById("control-row");
const go = document.getElementById("go");
const fromDomainInput = document.getElementById("from_domain");
const toDomainInput = document.getElementById("to_domain");
const keyPatternInput = document.getElementById("key_pattern");
const message = document.getElementById("message");

function getStorageSyncData(keys) {
  // Immediately return a promise and start asynchronous work
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.sync.
    chrome.storage.sync.get(keys, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      resolve(items);
    });
  });
}

function setStorageSyncData(data) {
  // Immediately return a promise and start asynchronous work
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.sync.
    chrome.storage.sync.set(data, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      resolve(items);
    });
  });
}

// The async IIFE is necessary because Chrome <89 does not support top level await.
(async function initPopupWindow() {
  const savedValues = await getStorageSyncData(['from_domain', 'to_domain', 'key_pattern'])
  fromDomainInput.value = savedValues.from_domain || '';
  toDomainInput.value = savedValues.to_domain || '';
  keyPatternInput.value = savedValues.key_pattern || '';
  fromDomainInput.focus();
})();

form.addEventListener("submit", handleFormSubmit);

async function handleFormSubmit(event) {
  event.preventDefault();
  clearMessage();
  const fromDomain = fromDomainInput.value || '';
  const toDomain = toDomainInput.value || '';
  const pattern = keyPatternInput.value || '';
  await setStorageSyncData({
    from_domain: fromDomain,
    to_domain: toDomain,
    key_pattern: pattern,
  })
  const message = await copyCookiesValues(fromDomain, toDomain, pattern)
  setMessage(message);
}

async function copyCookiesValues(fromDomain, toDomain, pattern) {
  const cookies = await chrome.cookies.getAll({ domain: fromDomain });
  const matchedCookies = cookies
    .filter((cookie) => {
      if (!pattern) return true;
      return new RegExp(pattern).test(cookie.name);
    })

  const pending = matchedCookies.map((cookie) => copyCookie(cookie, toDomain));
  await Promise.all(pending);

  return `Copied ${matchedCookies.length} cookies`;
}

function stringToUrl(input) {
  // Start with treating the provided value as a URL
  try {
    return new URL(input);
  } catch {}
  // If that fails, try assuming the provided input is an HTTP host
  try {
    return new URL("http://" + input);
  } catch {}
  // If that fails ¯\_(ツ)_/¯
  return null;
}

function copyCookie(cookie, domain) {
  const protocol = domain === 'localhost' ? "http:" : "https:";

  // Note that the final URL may not be valid. The domain value for a standard cookie is prefixed
  // with a period (invalid) while cookies that are set to `cookie.hostOnly == true` do not have
  // this prefix (valid).
  // https://developer.chrome.com/docs/extensions/reference/cookies/#type-Cookie
  const cookieUrl = `${protocol}//${domain}${cookie.path}`;

  return chrome.cookies.set({
    url: cookieUrl,
    name: cookie.name,
    value: cookie.value,
  });
}

function setMessage(str) {
  message.textContent = str;
  message.hidden = false;
}

function clearMessage() {
  message.hidden = true;
  message.textContent = "";
}
