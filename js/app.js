/** UI-контроллер страницы со списком студентов. */

import { StudentService } from "./student-service.js";
import {
  buildStudentUrl,
  formatDate,
  getErrorMessage,
  getInitials,
  getRequiredElement,
  queryRequired,
} from "./utils.js";

let deleteTimerId = null;

/**
 * Запускает страницу после построения DOM.
 *
 * @returns {void}
 */
function initializePage() {
  try {
    StudentService.initialize();
    showStatus();
    renderStudents();

    getRequiredElement("search-input").addEventListener(
      "input",
      renderStudents,
    );
    getRequiredElement("students-table-body").addEventListener(
      "click",
      handleTableClick,
    );
  } catch (error) {
    showNotice(getErrorMessage(error), true);
  }
}

/**
 * Записывает текст в обязательный дочерний элемент строки.
 *
 * @param {ParentNode} row Строка таблицы.
 * @param {string} selector Статический селектор.
 * @param {string|number} value Отображаемое значение.
 * @returns {void}
 */
function setRowText(row, selector, value) {
  queryRequired(row, selector).textContent = String(value);
}

/**
 * Создаёт одну безопасную строку таблицы из HTML-шаблона.
 *
 * @param {object} student Проверенная запись студента.
 * @returns {HTMLTableRowElement} Готовая строка.
 */
function createStudentRow(student) {
  const template = getRequiredElement("student-row-template");

  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("Шаблон строки имеет неверный тип");
  }

  const row = template.content.firstElementChild?.cloneNode(true);

  if (!(row instanceof HTMLTableRowElement)) {
    throw new Error("Не удалось создать строку таблицы");
  }

  const profileUrl = buildStudentUrl("student-profile.html", student.id);
  const editUrl = buildStudentUrl("student-form.html", student.id);

  row.dataset.id = student.id;
  setRowText(row, ".avatar", getInitials(student.fullName));
  setRowText(row, ".student-name", student.fullName);
  setRowText(
    row,
    ".student-foreign",
    student.isForeign ? "Иностранный студент" : "Студент РФ",
  );
  setRowText(row, ".student-group", student.group);
  setRowText(row, ".student-isu", student.isuId);
  setRowText(row, ".student-dorm", `Общежитие № ${student.dormitory}`);
  setRowText(row, ".student-room", `Комната ${student.room}`);
  setRowText(row, ".student-date", formatDate(student.settlementEnd));
  queryRequired(row, ".student-name").setAttribute("href", profileUrl);
  queryRequired(row, ".action-view").setAttribute("href", profileUrl);
  queryRequired(row, ".action-edit").setAttribute("href", editUrl);

  return row;
}

/**
 * Синхронизирует таблицу, пустое состояние и статистику с сервисом.
 *
 * @returns {void}
 */
function renderStudents() {
  const searchInput = getRequiredElement("search-input");
  const query = "value" in searchInput ? searchInput.value : "";
  const allStudents = StudentService.getAll();
  const visibleStudents = StudentService.search(query);
  const tableBody = getRequiredElement("students-table-body");
  const fragment = document.createDocumentFragment();

  for (const student of visibleStudents) {
    fragment.append(createStudentRow(student));
  }

  tableBody.replaceChildren(fragment);

  const isSearching = query.trim() !== "";
  getRequiredElement("students-table").hidden = visibleStudents.length === 0;
  getRequiredElement("empty-state").hidden = visibleStudents.length !== 0;
  getRequiredElement("empty-title").textContent = isSearching
    ? "Ничего не найдено"
    : "Список пуст";
  getRequiredElement("empty-text").textContent = isSearching
    ? "Попробуйте другой запрос."
    : "Добавьте первого студента.";
  getRequiredElement("results-summary").textContent = isSearching
    ? `Найдено: ${visibleStudents.length} из ${allStudents.length}`
    : `Записей: ${visibleStudents.length}`;
  getRequiredElement("total-count").textContent = String(allStudents.length);
  getRequiredElement("dorm-count").textContent = String(
    allStudents.filter((student) => student.dormitory).length,
  );
  getRequiredElement("foreign-count").textContent = String(
    allStudents.filter((student) => student.isForeign).length,
  );
}

/**
 * Обрабатывает делегированный клик по кнопке удаления.
 *
 * @param {MouseEvent} event Событие таблицы.
 * @returns {void}
 */
function handleTableClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest("button.action-delete");

  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const id = button.closest("tr")?.dataset.id;

  if (!id) {
    return;
  }

  if (button.dataset.confirm !== "yes") {
    document
      .querySelectorAll("button.action-delete")
      .forEach((item) => resetDeleteButton(item));
    button.dataset.confirm = "yes";
    button.textContent = "Да?";
    button.classList.add("confirming");

    if (deleteTimerId !== null) {
      clearTimeout(deleteTimerId);
    }

    deleteTimerId = setTimeout(() => resetDeleteButton(button), 3000);
    return;
  }

  try {
    if (deleteTimerId !== null) {
      clearTimeout(deleteTimerId);
    }

    const deleted = StudentService.remove(id);
    showNotice(`${deleted.fullName}: запись удалена`);
    renderStudents();
  } catch (error) {
    showNotice(getErrorMessage(error), true);
  }
}

/**
 * Возвращает кнопку удаления в обычное состояние.
 *
 * @param {Element} button Кнопка строки.
 * @returns {void}
 */
function resetDeleteButton(button) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  button.dataset.confirm = "";
  button.textContent = "⌫";
  button.classList.remove("confirming");
}

/**
 * Показывает разрешённый статус после перехода с формы.
 *
 * @returns {void}
 */
function showStatus() {
  const status = new URLSearchParams(location.search).get("status");

  if (status === "created") {
    showNotice("Студент успешно добавлен");
  } else if (status === "updated") {
    showNotice("Данные студента обновлены");
  } else {
    return;
  }

  history.replaceState({}, "", location.pathname);
}

/**
 * Показывает безопасное текстовое уведомление.
 *
 * @param {string} message Текст сообщения.
 * @param {boolean} [isError=false] Включить оформление ошибки.
 * @returns {void}
 */
function showNotice(message, isError = false) {
  const notice = getRequiredElement("notice");
  notice.textContent = message;
  notice.hidden = false;
  notice.classList.toggle("error", isError);
}

document.addEventListener("DOMContentLoaded", initializePage, { once: true });
