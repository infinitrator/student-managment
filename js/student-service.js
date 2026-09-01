/**
 * Сервис студентов: состояние, CRUD, поиск и защита границы данных.
 * Только этот модуль имеет право изменять массив студентов.
 */

import { StudentStorage } from "./storage.js";
import { StudentValidation } from "./validation.js";

const MAX_STUDENTS = 20;
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/u;
const DEFAULT_STUDENTS = Object.freeze([
  {
    id: "demo-1",
    fullName: "Иванова Анна Сергеевна",
    group: "P3212",
    isuId: 368214,
    dormitory: 8,
    room: "412",
    settlementEnd: "2027-06-30",
    isForeign: false,
    notes: "Староста этажа",
  },
  {
    id: "demo-2",
    fullName: "Ким Минджун",
    group: "M3301",
    isuId: 371905,
    dormitory: 7,
    room: "218А",
    settlementEnd: "2027-01-31",
    isForeign: true,
    notes: "Учится по обмену",
  },
  {
    id: "demo-3",
    fullName: "Петров Максим Олегович",
    group: "K3141",
    isuId: 362847,
    dormitory: 10,
    room: "531",
    settlementEnd: "2026-12-25",
    isForeign: false,
    notes: "",
  },
]);

let students = [];

/**
 * Создаёт поверхностную копию одной плоской записи.
 *
 * @param {object} student Исходная запись.
 * @returns {object} Независимая копия.
 */
function copyStudent(student) {
  return { ...student };
}

/**
 * Создаёт копию массива и каждой записи внутри него.
 *
 * @param {Array<object>} data Исходный массив.
 * @returns {Array<object>} Независимый массив.
 */
function copyStudents(data) {
  return data.map(copyStudent);
}

/**
 * Проверяет объект перед добавлением или обновлением.
 *
 * @param {object} input Данные студента.
 * @returns {object} Нормализованная запись без внутреннего ID.
 * @throws {Error} Если хотя бы одно поле не прошло проверку.
 */
function prepareStudent(input) {
  const result = StudentValidation.validate(input);

  if (!result.isValid) {
    throw new Error(
      Object.values(result.errors)[0] || "Некорректные данные студента",
    );
  }

  return result.normalized;
}

/**
 * Очищает одну недоверенную запись, прочитанную из cookies.
 *
 * @param {unknown} value Значение из JSON.
 * @returns {object|null} Безопасная запись или `null`.
 */
function sanitizeStoredStudent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  if (typeof value.id !== "string" || !ID_PATTERN.test(value.id)) {
    return null;
  }

  const result = StudentValidation.validate({
    fullName: value.fullName,
    group: value.group,
    isuId: value.isuId,
    dormitory: value.dormitory,
    room: value.room,
    settlementEnd: value.settlementEnd,
    isForeign: value.isForeign,
    notes: value.notes,
  });

  return result.isValid ? { ...result.normalized, id: value.id } : null;
}

/**
 * Фильтрует массив cookies, ограничивает размер и удаляет дубликаты ID/ИСУ.
 *
 * @param {Array<unknown>} data Недоверенный массив.
 * @returns {Array<object>} Массив только допустимых записей.
 */
function sanitizeStoredStudents(data) {
  const clean = [];
  const ids = new Set();
  const isuIds = new Set();

  for (const value of data.slice(0, MAX_STUDENTS)) {
    const student = sanitizeStoredStudent(value);

    if (!student || ids.has(student.id) || isuIds.has(student.isuId)) {
      continue;
    }

    ids.add(student.id);
    isuIds.add(student.isuId);
    clean.push(student);
  }

  return clean;
}

/**
 * Атомарно для состояния сервиса сохраняет новый массив.
 *
 * @param {Array<object>} nextStudents Новый массив.
 * @returns {void}
 * @throws {Error} Если браузер не смог сохранить cookies.
 */
function persist(nextStudents) {
  if (!StudentStorage.write(nextStudents)) {
    throw new Error("Не получилось сохранить данные в cookies");
  }

  students = nextStudents;
}

/**
 * Инициализирует состояние из cookies или тестовых записей.
 *
 * @returns {Array<object>} Отсортированная копия списка.
 */
function initialize() {
  const stored = StudentStorage.read();

  if (stored === null) {
    persist(copyStudents(DEFAULT_STUDENTS));
  } else {
    const sanitized = sanitizeStoredStudents(stored);
    students = sanitized;

    if (JSON.stringify(sanitized) !== JSON.stringify(stored)) {
      persist(sanitized);
    }
  }

  return getAll();
}

/**
 * Возвращает студентов по русскому алфавиту.
 *
 * @returns {Array<object>} Отсортированные копии записей.
 */
function getAll() {
  return copyStudents(students).sort((first, second) =>
    first.fullName.localeCompare(second.fullName, "ru"),
  );
}

/**
 * Ищет студента по внутреннему ID.
 *
 * @param {unknown} id Идентификатор из URL или таблицы.
 * @returns {object|null} Копия найденной записи или `null`.
 */
function getById(id) {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) {
    return null;
  }

  const student = students.find((item) => item.id === id);
  return student ? copyStudent(student) : null;
}

/**
 * Проверяет уникальность ИСУ ID.
 *
 * @param {number} isuId Проверяемый ИСУ ID.
 * @param {string} [ignoredId=""] ID записи, исключаемой при редактировании.
 * @returns {boolean} `true`, если ИСУ ID уже занят.
 */
function isuExists(isuId, ignoredId = "") {
  return students.some(
    (student) => student.isuId === isuId && student.id !== ignoredId,
  );
}

/**
 * Создаёт UUID средствами криптографического API браузера.
 *
 * @returns {string} Уникальный идентификатор.
 * @throws {Error} Если браузер не поддерживает безопасный генератор UUID.
 */
function makeId() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Браузер не поддерживает безопасное создание ID");
  }

  return globalThis.crypto.randomUUID();
}

/**
 * Добавляет нового студента.
 *
 * @param {object} input Проверяемые данные.
 * @returns {object} Копия созданной записи.
 */
function create(input) {
  if (students.length >= MAX_STUDENTS) {
    throw new Error(
      `В cookies можно хранить не больше ${MAX_STUDENTS} студентов`,
    );
  }

  const student = prepareStudent(input);

  if (isuExists(student.isuId)) {
    throw new Error("Такой ИСУ ID уже есть");
  }

  const created = { ...student, id: makeId() };
  persist([...students, created]);
  return copyStudent(created);
}

/**
 * Обновляет существующего студента.
 *
 * @param {unknown} id ID редактируемой записи.
 * @param {object} input Новые данные.
 * @returns {object} Копия обновлённой записи.
 */
function update(id, input) {
  const index =
    typeof id === "string"
      ? students.findIndex((student) => student.id === id)
      : -1;

  if (index < 0) {
    throw new Error("Студент не найден");
  }

  const student = prepareStudent(input);

  if (isuExists(student.isuId, id)) {
    throw new Error("Такой ИСУ ID уже есть");
  }

  const updated = { ...student, id };
  const nextStudents = [...students];
  nextStudents[index] = updated;
  persist(nextStudents);
  return copyStudent(updated);
}

/**
 * Удаляет студента.
 *
 * @param {unknown} id ID удаляемой записи.
 * @returns {object} Копия удалённой записи.
 */
function remove(id) {
  const index =
    typeof id === "string"
      ? students.findIndex((student) => student.id === id)
      : -1;

  if (index < 0) {
    throw new Error("Студент не найден");
  }

  const deleted = students[index];
  persist(students.filter((student) => student.id !== id));
  return copyStudent(deleted);
}

/**
 * Ищет по ФИО, группе или ИСУ ID без учёта регистра.
 *
 * @param {unknown} query Поисковый запрос.
 * @returns {Array<object>} Копии подходящих записей.
 */
function search(query) {
  const normalizedQuery = String(query ?? "")
    .trim()
    .toLocaleLowerCase("ru");

  return getAll().filter((student) => {
    const fields = [student.fullName, student.group, String(student.isuId)];

    return (
      !normalizedQuery ||
      fields.some((field) =>
        field.toLocaleLowerCase("ru").includes(normalizedQuery),
      )
    );
  });
}

/** Публичный интерфейс бизнес-логики. */
export const StudentService = Object.freeze({
  initialize,
  getAll,
  getById,
  create,
  update,
  remove,
  search,
});
