const form = document.querySelector('#ticket-form');
const submitButton = document.querySelector('#submit-button');
const filter = document.querySelector('#status-filter');
const ticketList = document.querySelector('#ticket-list');
const appMessage = document.querySelector('#app-message');

const statuses = ['Aberto', 'Em andamento', 'Concluído'];

function showMessage(text, type) {
  appMessage.textContent = text;
  appMessage.className = `message ${type}`;
  appMessage.hidden = false;
}

function clearMessage() {
  appMessage.textContent = '';
  appMessage.hidden = true;
  appMessage.className = 'message';
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('O servidor retornou uma resposta inválida.');
  }

  if (!response.ok) {
    throw new Error(data.erro || 'Não foi possível concluir a operação.');
  }
  return data;
}

function makeCell(className, text) {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function renderEmpty(message) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.className = 'empty-cell';
  cell.colSpan = 4;
  cell.textContent = message;
  row.append(cell);
  ticketList.replaceChildren(row);
}

function renderTickets(tickets) {
  if (!Array.isArray(tickets)) {
    renderEmpty('O servidor retornou uma lista em formato inválido.');
    return;
  }
  if (tickets.length === 0) {
    renderEmpty(filter.value ? 'Nenhum chamado corresponde a este filtro.' : 'Ainda não há chamados cadastrados.');
    return;
  }

  const rows = tickets.map((ticket) => {
    const row = document.createElement('tr');

    const titleCell = document.createElement('td');
    const title = document.createElement('span');
    title.className = 'ticket-title';
    title.textContent = ticket.titulo;
    const id = document.createElement('span');
    id.className = 'ticket-id';
    id.textContent = `Chamado #${ticket.id}`;
    titleCell.append(title, id);

    const requesterCell = makeCell('requester-cell', ticket.solicitante);
    const statusCell = document.createElement('td');
    const pill = document.createElement('span');
    pill.className = 'status-pill';
    if (ticket.status === 'Em andamento') pill.classList.add('in-progress');
    if (ticket.status === 'Concluído') pill.classList.add('completed');
    pill.textContent = ticket.status;
    statusCell.append(pill);

    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';
    const action = document.createElement('div');
    action.className = 'status-action';
    const select = document.createElement('select');
    select.setAttribute('aria-label', `Novo status para o chamado ${ticket.id}`);
    for (const status of statuses) {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      option.selected = status === ticket.status;
      select.append(option);
    }
    const saveButton = document.createElement('button');
    saveButton.className = 'save-status';
    saveButton.type = 'button';
    saveButton.textContent = 'Salvar';
    saveButton.addEventListener('click', () => updateStatus(ticket.id, select.value, saveButton));
    action.append(select, saveButton);
    actionCell.append(action);

    row.append(titleCell, requesterCell, statusCell, actionCell);
    return row;
  });

  ticketList.replaceChildren(...rows);
}

async function loadTickets({ keepMessage = false } = {}) {
  if (!keepMessage) clearMessage();
  renderEmpty('Carregando chamados…');
  const status = filter.value;
  const query = status ? `?status=${encodeURIComponent(status)}` : '';

  try {
    const tickets = await requestJson(`/api/chamados${query}`);
    renderTickets(tickets);
  } catch (error) {
    renderEmpty('Não foi possível carregar a lista.');
    showMessage(`Falha ao carregar os chamados: ${error.message}`, 'error');
  }
}

async function updateStatus(id, status, button) {
  button.disabled = true;
  clearMessage();
  try {
    const ticket = await requestJson(`/api/chamados/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    await loadTickets({ keepMessage: true });
    showMessage(`Status do chamado #${ticket.id} atualizado para “${ticket.status}”.`, 'success');
  } catch (error) {
    await loadTickets({ keepMessage: true });
    showMessage(`Não foi possível atualizar o status: ${error.message}`, 'error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  const formData = new FormData(form);
  const titulo = String(formData.get('title') || '').trim();
  const solicitante = String(formData.get('requester') || '').trim();
  const descricao = String(formData.get('description') || '').trim();

  if (!titulo || !solicitante) {
    showMessage('Preencha o título e o solicitante. Espaços em branco não são suficientes.', 'error');
    return;
  }

  submitButton.disabled = true;
  try {
    const ticket = await requestJson('/api/chamados', {
      method: 'POST',
      body: JSON.stringify({ titulo, solicitante, descricao })
    });
    form.reset();
    await loadTickets({ keepMessage: true });
    showMessage(`Chamado #${ticket.id} registrado com status “${ticket.status}”.`, 'success');
  } catch (error) {
    showMessage(`Não foi possível registrar o chamado: ${error.message}`, 'error');
  } finally {
    submitButton.disabled = false;
  }
});

filter.addEventListener('change', () => loadTickets());
loadTickets();
