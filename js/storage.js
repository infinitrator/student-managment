/**
 * Изолированный слой хранения массива студентов в cookies.
 * Модуль не зависит от интерфейса и не вставляет данные в HTML.
 */

const COOKIE_PREFIX = "student_management_students_v1_";
const COOKIE_META = "student_management_students_meta_v1";
const COOKIE_LIFETIME_SECONDS = 60 * 60 * 24 * 365;
const COOKIE_PART_SIZE = 3000;
const MAX_COOKIE_PARTS = 20;

/**
 * Возвращает безопасный путь cookie для текущей папки сайта.
 *
 * @returns {string} Путь, заканчивающийся символом `/`.
 */
function getCookiePath() {
  const pathname = location.pathname || "/";
  const directory = pathname.endsWith("/")
    ? pathname
    : pathname.slice(0, pathname.lastIndexOf("/") + 1);

  return (directory || "/").replace(/[;,]/gu, "");
}

/**
 * Ищет cookie по точному имени.
 *
 * @param {string} name Имя cookie без знака `=`.
 * @returns {string|null} Значение cookie или `null`, если её нет.
 */
function getCookie(name) {
  const prefix = `${name}=`;
  const item = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix));

  return item ? item.slice(prefix.length) : null;
}

/**
 * Создаёт, обновляет или удаляет одну cookie.
 *
 * @param {string} name Имя cookie.
 * @param {string|number} value Значение cookie.
 * @param {number} [maxAge=COOKIE_LIFETIME_SECONDS] Срок жизни в секундах.
 * @returns {void}
 */
function setCookie(name, value, maxAge = COOKIE_LIFETIME_SECONDS) {
  const attributes = [
    `${name}=${value}`,
    `Max-Age=${maxAge}`,
    `Path=${getCookiePath()}`,
    "SameSite=Lax",
  ];

  if (location.protocol === "https:") {
    attributes.push("Secure");
  }

  document.cookie = attributes.join("; ");
}

/**
 * Преобразует Unicode-строку в Base64 без потери кириллицы.
 *
 * @param {string} text Исходный текст.
 * @returns {string} Строка Base64, состоящая из безопасных для cookie символов.
 */
function encodeData(text) {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
    "",
  );

  return btoa(binary);
}

/**
 * Восстанавливает Unicode-строку из Base64.
 *
 * @param {string} encoded Строка Base64.
 * @returns {string} Декодированный текст.
 */
function decodeData(encoded) {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

/**
 * Преобразует значение meta-cookie в допустимое количество частей.
 *
 * @param {string|null} value Значение meta-cookie.
 * @returns {number} Число от 1 до лимита или 0 при ошибке.
 */
function parsePartCount(value) {
  const count = Number(value);

  return Number.isInteger(count) && count >= 1 && count <= MAX_COOKIE_PARTS
    ? count
    : 0;
}

/**
 * Читает и объединяет все cookie-части.
 *
 * @returns {Array<object>|null} Сырые записи или `null` при отсутствии/повреждении.
 */
function readStudents() {
  const meta = getCookie(COOKIE_META);

  if (meta === null) {
    return null;
  }

  try {
    const partCount = parsePartCount(meta);

    if (partCount === 0) {
      throw new Error("Некорректное количество частей cookie");
    }

    const parts = [];

    for (let index = 0; index < partCount; index += 1) {
      const part = getCookie(`${COOKIE_PREFIX}${index}`);

      if (part === null || part.length > COOKIE_PART_SIZE) {
        throw new Error("Часть cookie отсутствует или превышает лимит");
      }

      parts.push(part);
    }

    const parsed = JSON.parse(decodeData(parts.join("")));

    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn("Данные cookies повреждены и будут восстановлены.", error);
    return null;
  }
}

/**
 * Записывает массив в ограниченное количество cookie-частей.
 *
 * @param {Array<object>} data Массив студентов.
 * @returns {boolean} `true`, если браузер подтвердил запись всех частей.
 */
function writeStudents(data) {
  try {
    if (location.protocol === "file:") {
      throw new Error("Сайт нужно запускать через HTTP-сервер");
    }

    if (!Array.isArray(data)) {
      throw new TypeError("Хранилище принимает только массив");
    }

    const encoded = encodeData(JSON.stringify(data));
    const partCount = Math.max(1, Math.ceil(encoded.length / COOKIE_PART_SIZE));

    if (partCount > MAX_COOKIE_PARTS) {
      throw new Error("Данные превышают безопасный лимит cookies");
    }

    const previousCount = parsePartCount(getCookie(COOKIE_META));

    for (let index = 0; index < partCount; index += 1) {
      const part = encoded.slice(
        index * COOKIE_PART_SIZE,
        (index + 1) * COOKIE_PART_SIZE,
      );

      setCookie(`${COOKIE_PREFIX}${index}`, part);

      if (getCookie(`${COOKIE_PREFIX}${index}`) !== part) {
        throw new Error("Браузер отклонил запись cookie");
      }
    }

    for (let index = partCount; index < previousCount; index += 1) {
      setCookie(`${COOKIE_PREFIX}${index}`, "", 0);
    }

    setCookie(COOKIE_META, partCount);
    return getCookie(COOKIE_META) === String(partCount);
  } catch (error) {
    console.warn("Не удалось записать cookies.", error);
    return false;
  }
}

/** Публичный интерфейс слоя хранения. */
export const StudentStorage = Object.freeze({
  read: readStudents,
  write: writeStudents,
});
