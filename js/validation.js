/**
 * Бизнес-валидация и нормализация данных студента.
 * HTML проверяет базовые ограничения, а этот модуль повторяет критичные правила.
 */

const NAME_PATTERN = /^[\p{L}\p{M}'’\-]+(?:\s+[\p{L}\p{M}'’\-]+)+$/u;
const GROUP_PATTERN = /^[\p{L}\p{N}-]{2,20}$/u;
const ROOM_PATTERN = /^[0-9]{1,4}[\p{L}]?$/u;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

/**
 * Превращает строковое значение в очищенный текст.
 *
 * @param {unknown} value Неизвестное входное значение.
 * @returns {string} Строка или пустая строка для другого типа.
 */
function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Преобразует строку или число в число без неявного принятия пустой строки.
 *
 * @param {unknown} value Неизвестное входное значение.
 * @returns {number} Число или `NaN`.
 */
function normalizeNumber(value) {
  if (typeof value === "string" && value.trim() === "") {
    return Number.NaN;
  }

  return typeof value === "number" || typeof value === "string"
    ? Number(value)
    : Number.NaN;
}

/**
 * Проверяет реальное существование календарной даты и заданный диапазон лет.
 *
 * @param {string} value Дата в формате `YYYY-MM-DD`.
 * @returns {boolean} Результат строгой календарной проверки.
 */
function isValidDate(value) {
  const match = DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    year >= 2000 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Проверяет сырые значения и создаёт объект безопасного фиксированного формата.
 *
 * @param {object} source Значения формы или запись из cookies.
 * @returns {{isValid: boolean, errors: Record<string, string>, normalized: object}}
 *   Результат проверки, ошибки и нормализованные значения.
 */
function validateStudent(source) {
  const input = source && typeof source === "object" ? source : {};
  const errors = {};
  const fullName = normalizeText(input.fullName).replace(/\s+/gu, " ");
  const group = normalizeText(input.group);
  const isuId = normalizeNumber(input.isuId);
  const dormitory = normalizeNumber(input.dormitory);
  const room = normalizeText(input.room);
  const settlementEnd = normalizeText(input.settlementEnd);
  const notes = normalizeText(input.notes);

  if (!fullName) {
    errors.fullName = "Введите ФИО";
  } else if (fullName.length > 120 || !NAME_PATTERN.test(fullName)) {
    errors.fullName = "Введите фамилию и имя буквами";
  }

  if (!group) {
    errors.group = "Введите группу";
  } else if (!GROUP_PATTERN.test(group)) {
    errors.group = "Группа: 2–20 букв, цифр или дефисов без пробелов";
  }

  if (!Number.isInteger(isuId) || isuId < 1 || isuId > 9_999_999) {
    errors.isuId = "ИСУ ID должен быть целым числом от 1 до 9999999";
  }

  if (!Number.isInteger(dormitory) || dormitory < 1 || dormitory > 30) {
    errors.dormitory = "Номер общежития должен быть от 1 до 30";
  }

  if (room.length > 8 || !ROOM_PATTERN.test(room)) {
    errors.room = "Комната: до четырёх цифр и необязательная буква";
  }

  if (!isValidDate(settlementEnd)) {
    errors.settlementEnd = "Введите существующую дату от 2000 до 2100 года";
  }

  if (notes.length > 500) {
    errors.notes = "Заметка не должна превышать 500 символов";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      fullName,
      group: group.toLocaleUpperCase("ru"),
      isuId,
      dormitory,
      room: room.toLocaleUpperCase("ru"),
      settlementEnd,
      isForeign: input.isForeign === true,
      notes,
    },
  };
}

/** Публичный интерфейс валидатора. */
export const StudentValidation = Object.freeze({
  validate: validateStudent,
});
