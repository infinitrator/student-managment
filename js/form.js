/** UI-контроллер страницы добавления и редактирования студента. */

import { StudentService } from "./student-service.js";
import { StudentValidation } from "./validation.js";
import {
  buildStudentUrl,
  getErrorMessage,
  getRequiredElement,
} from "./utils.js";

const FIELD_IDS = Object.freeze({
  fullName: "full-name",
  group: "group",
  isuId: "isu-id",
  dormitory: "dormitory",
  room: "room",
  settlementEnd: "settlement-end",
  notes: "notes",
});
const studentId = new URLSearchParams(location.search).get("id");

/**
 * Запускает форму после построения DOM.
 *
 * @returns {void}
 */
function initializePage() {
  try {
    StudentService.initialize();

    if (studentId) {
      fillForm();
    }

    getRequiredElement("student-form").addEventListener("submit", saveForm);
    getRequiredElement("student-form").addEventListener(
      "input",
      clearFieldError,
    );
    getRequiredElement("notes").addEventListener("input", updateCounter);
    updateCounter();
  } catch (error) {
    showFormError(getErrorMessage(error));
  }
}

/**
 * Заполняет форму данными выбранного студента.
 *
 * @returns {void}
 */
function fillForm() {
  const student = StudentService.getById(studentId);

  if (!student) {
    location.replace("index.html");
    return;
  }

  document.title = `Редактирование — ${student.fullName}`;
  getRequiredElement("form-title").textContent = "Редактирование студента";
  getRequiredElement("save-button").textContent = "Сохранить изменения";

  const profileUrl = buildStudentUrl("student-profile.html", student.id);
  getRequiredElement("cancel-link").setAttribute("href", profileUrl);
  getRequiredElement("back-link").setAttribute("href", profileUrl);
  setFieldValue("full-name", student.fullName);
  setFieldValue("group", student.group);
  setFieldValue("isu-id", student.isuId);
  setFieldValue("dormitory", student.dormitory);
  setFieldValue("room", student.room);
  setFieldValue("settlement-end", student.settlementEnd);
  setFieldValue("notes", student.notes);

  const foreignCheckbox = getRequiredElement("is-foreign");

  if (foreignCheckbox instanceof HTMLInputElement) {
    foreignCheckbox.checked = student.isForeign;
  }
}

/**
 * Проверяет форму встроенными правилами и бизнес-валидатором, затем сохраняет.
 *
 * @param {SubmitEvent} event Событие отправки формы.
 * @returns {void}
 */
function saveForm(event) {
  event.preventDefault();

  if (!(event.currentTarget instanceof HTMLFormElement)) {
    return;
  }

  const form = event.currentTarget;
  clearErrors();

  const result = StudentValidation.validate(getFormData());
  const isHtmlValid = form.checkValidity();

  if (!result.isValid || !isHtmlValid) {
    showErrors(result.errors);
    form.reportValidity();
    showFormError("Исправьте ошибки в форме");
    return;
  }

  try {
    const saved = studentId
      ? StudentService.update(studentId, result.normalized)
      : StudentService.create(result.normalized);
    const status = studentId ? "updated" : "created";
    location.assign(buildStudentUrl("student-profile.html", saved.id, status));
  } catch (error) {
    showFormError(getErrorMessage(error));
  }
}

/**
 * Собирает сырые значения всех полей.
 *
 * @returns {object} Объект для валидатора.
 */
function getFormData() {
  const foreignCheckbox = getRequiredElement("is-foreign");

  return {
    fullName: getFieldValue("full-name"),
    group: getFieldValue("group"),
    isuId: getFieldValue("isu-id"),
    dormitory: getFieldValue("dormitory"),
    room: getFieldValue("room"),
    settlementEnd: getFieldValue("settlement-end"),
    isForeign:
      foreignCheckbox instanceof HTMLInputElement && foreignCheckbox.checked,
    notes: getFieldValue("notes"),
  };
}

/**
 * Возвращает строковое значение поля формы.
 *
 * @param {string} id HTML ID поля.
 * @returns {string} Текущее значение.
 */
function getFieldValue(id) {
  const field = getRequiredElement(id);

  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
  )) {
    throw new Error(`Элемент #${id} не является полем формы`);
  }

  return field.value;
}

/**
 * Записывает значение в поле формы.
 *
 * @param {string} id HTML ID поля.
 * @param {unknown} value Записываемое значение.
 * @returns {void}
 */
function setFieldValue(id, value) {
  const field = getRequiredElement(id);

  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
  )) {
    throw new Error(`Элемент #${id} не является полем формы`);
  }

  field.value = String(value ?? "");
}

/**
 * Отображает сообщения бизнес-валидации около соответствующих полей.
 *
 * @param {Record<string, string>} errors Ошибки по именам свойств.
 * @returns {void}
 */
function showErrors(errors) {
  for (const [name, message] of Object.entries(errors)) {
    const fieldId = FIELD_IDS[name];

    if (!fieldId) {
      continue;
    }

    getRequiredElement(fieldId).setAttribute("aria-invalid", "true");
    getRequiredElement(`${fieldId}-error`).textContent = message;
  }
}

/**
 * Полностью очищает прошлые ошибки формы.
 *
 * @returns {void}
 */
function clearErrors() {
  document
    .querySelectorAll("[aria-invalid='true']")
    .forEach((element) => element.removeAttribute("aria-invalid"));
  document.querySelectorAll(".field-error").forEach((element) => {
    element.textContent = "";
  });
  getRequiredElement("form-alert").hidden = true;
}

/**
 * Убирает ошибку только у изменяемого пользователем поля.
 *
 * @param {Event} event Событие ввода.
 * @returns {void}
 */
function clearFieldError(event) {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }

  event.target.removeAttribute("aria-invalid");
  const error = document.getElementById(`${event.target.id}-error`);

  if (error) {
    error.textContent = "";
  }

  getRequiredElement("form-alert").hidden = true;
}

/**
 * Выводит общую ошибку как текст, а не HTML.
 *
 * @param {string} message Сообщение пользователю.
 * @returns {void}
 */
function showFormError(message) {
  const alert = getRequiredElement("form-alert");
  alert.textContent = message;
  alert.hidden = false;
}

/**
 * Обновляет счётчик символов заметки.
 *
 * @returns {void}
 */
function updateCounter() {
  getRequiredElement("notes-counter").textContent =
    `${getFieldValue("notes").length} / 500`;
}

document.addEventListener("DOMContentLoaded", initializePage, { once: true });
