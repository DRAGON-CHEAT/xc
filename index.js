const ALLOWED_CHARACTERS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";

function getEncryptKeyPosition(char) {
  return ALLOWED_CHARACTERS.indexOf(char);
}

function getEncryptPositionString(pos) {
  return pos >= 0 && pos < ALLOWED_CHARACTERS.length
    ? ALLOWED_CHARACTERS[pos]
    : "a";
}

function getEncryptKey(length) {
  let key = "";

  for (let i = 0; i < length; i++) {
    key += ALLOWED_CHARACTERS[
      Math.floor(Math.random() * ALLOWED_CHARACTERS.length)
    ];
  }

  return key;
}

function decodeAppData(encryptedStr) {
  try {
    if (
      typeof encryptedStr !== "string" ||
      encryptedStr.length < 2
    ) {
      return null;
    }

    const posChar = encryptedStr.at(-2);
    const keyLenChar = encryptedStr.at(-1);

    const splitPos = getEncryptKeyPosition(posChar);
    const keyLength = getEncryptKeyPosition(keyLenChar);

    if (splitPos < 0 || keyLength < 0) {
      return null;
    }

    const cleanText = encryptedStr.slice(0, -2);

    const originalB64 =
      cleanText.slice(0, splitPos) +
      cleanText.slice(splitPos + keyLength);

    const paddedB64 =
      originalB64 +
      "=".repeat((4 - originalB64.length % 4) % 4);

    const binary = atob(paddedB64);

    const bytes = Uint8Array.from(
      binary,
      c => c.charCodeAt(0)
    );

    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
}

function encodeAppData(jsonString) {
  const bytes = new TextEncoder().encode(jsonString);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  const b64Str = btoa(binary);
  const keyLength = Math.floor(Math.random() * 11) + 5;
  const encryptKey = getEncryptKey(keyLength);

  const maxSplit = Math.min(b64Str.length, 42);

  if (maxSplit < 5) {
    throw new Error("Response is too short");
  }

  const splitPos =
    Math.floor(Math.random() * (maxSplit - 5 + 1)) + 5;

  const injectedStr =
    b64Str.slice(0, splitPos) +
    encryptKey +
    b64Str.slice(splitPos);

  return (
    injectedStr +
    getEncryptPositionString(splitPos) +
    getEncryptPositionString(keyLength)
  );
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function findValue(obj, wantedKey) {
  if (obj && typeof obj === "object") {
    if (
      !Array.isArray(obj) &&
      Object.prototype.hasOwnProperty.call(obj, wantedKey)
    ) {
      return obj[wantedKey];
    }

    for (const value of Object.values(obj)) {
      const result = findValue(value, wantedKey);

      if (result !== undefined && result !== null) {
        return result;
      }
    }
  }

  return undefined;
}

function decodeDeviceId(requestData) {
  try {
    let value = requestData.app_device_id || "";

    if (!value) return "";

    value += "=".repeat((4 - value.length % 4) % 4);

    const binary = atob(value);

    const bytes = Uint8Array.from(
      binary,
      c => c.charCodeAt(0)
    );

    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function formatDate(date) {
  const pad = n => String(n).padStart(2, "0");

  return (
    date.getFullYear() + "-" +
    pad(date.getMonth() + 1) + "-" +
    pad(date.getDate()) + " " +
    pad(date.getHours()) + ":" +
    pad(date.getMinutes()) + ":" +
    pad(date.getSeconds())
  );
}

async function handlePost(request) {
  let requestData;

  try {
    const body = await request.text();
    const outer = JSON.parse(body);

    const decodedText = decodeAppData(outer.data || "");

    if (!decodedText) {
      return jsonResponse({ status: "error" }, 400);
    }

    requestData = JSON.parse(decodedText);

    if (
      !requestData ||
      typeof requestData !== "object" ||
      Array.isArray(requestData)
    ) {
      return jsonResponse({ status: "error" }, 400);
    }
  } catch {
    return jsonResponse({ status: "error" }, 400);
  }

  const playlistType = findValue(requestData, "playlist_type");

  if (playlistType !== undefined && playlistType !== null) {
    const playlistName =
      findValue(requestData, "playlist_name") ||
      findValue(requestData, "name") ||
      "Playlist2";

    const playlistUrl =
      findValue(requestData, "playlist_url") ||
      findValue(requestData, "url") ||
      "";

    const type = typeof playlistType === "string"
      ? playlistType.toUpperCase()
      : "URL";

    const responseType = [
      "M3U",
      "M3U_PLUS",
      "M3U_PLUS_TS",
      "URL"
    ].includes(type) ? "URL" : type;

    const now = formatDate(new Date());

    return jsonResponse({
      name: playlistName,
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 30),
      url: playlistUrl,
      type: responseType,
      is_protected: false,
      created_at: now,
      updated_at: now
    });
  }

  const macAddress = decodeDeviceId(requestData);

  const responseTemplate = {
    android_version_code: "2.9",
    apk_url: "",
    device_key: "D2RAG0ON2SHO7W",
    expire_date: "2027-09-25 13:36:45",
    is_google_paid: true,
    is_trial: 0,
    notification: {
      title: "DRAGONSHOW APP",
      content: "Dragonshow player "
    },
    urls: [
      {
        is_protected: "0",
        id: "51b568ea7c7969a881ebf3a6478f8486",
        name: "DRAGONSHOW XC",
        created_at: "2027-04-15 00:06:09",
        updated_at: "2099-04-15 00:06:09"
      }
    ],
    mac_registered: true,
    themes: [],
    trial_days: 3600,
    plan_id: "03370629",
    mac_address: macAddress || "06:0A:C4:25:CE:82:41:AD",
    pin: "0000",
    price: "0",
    app_version: "2.9",
    languages: null,
    apk_link: ""
  };

  try {
    const encrypted = encodeAppData(
      JSON.stringify(responseTemplate)
    );

    return jsonResponse({ data: encrypted });
  } catch {
    return jsonResponse({ status: "error" }, 500);
  }
}

export default {
  async fetch(request) {
    if (request.method === "GET") {
      return jsonResponse({ status: "OK" });
    }

    if (request.method === "POST") {
      return handlePost(request);
    }

    return jsonResponse(
      { status: "error", message: "Method not allowed" },
      405
    );
  }
};